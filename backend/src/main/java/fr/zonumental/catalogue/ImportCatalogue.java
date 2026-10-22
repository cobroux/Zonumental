package fr.zonumental.catalogue;

import fr.zonumental.catalogue.SelectionCatalogue.Existant;
import fr.zonumental.catalogue.SelectionCatalogue.Numerote;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;

/**
 * Import en deux temps (ADR 0007, décision client : premier import relu avant de figer).
 *
 * <p>{@link #preparer} lit les sources et écrit un fichier de relecture, sans toucher la base.
 * {@link #figer} relit ce fichier (éventuellement corrigé), télécharge les images puis écrit tout
 * dans une seule transaction.
 */
public class ImportCatalogue {

  static final int RAYON_DEFAUT_M = 150;

  /** Le maximum historique survit aux suppressions : un numéro n'est jamais réattribué. */
  private static final String DERNIER_NUMERO =
      "select greatest(dernier, (select coalesce(max(numero), 0) from catalogue.monument))"
          + " from catalogue.numerotation";

  private static final String URL_IMAGES = "/api/catalogue/images/";

  private final JdbcClient jdbc;
  private final TransactionTemplate tx;
  private final SourceMonuments source;
  private final Quotas quotas;
  private final Path dossierImages;
  private final ObjectMapper json =
      new ObjectMapper().rebuild().enable(SerializationFeature.INDENT_OUTPUT).build();

  public ImportCatalogue(
      JdbcClient jdbc,
      PlatformTransactionManager tm,
      SourceMonuments source,
      Quotas quotas,
      Path dossierImages) {
    this.jdbc = jdbc;
    this.tx = new TransactionTemplate(tm);
    this.source = source;
    this.quotas = quotas;
    this.dossierImages = dossierImages;
  }

  /** Mode relecture : aucune écriture en base, aucun numéro figé. */
  public Proposition preparer(Path fichier) {
    Map<String, Integer> parVille = new HashMap<>();
    jdbc.sql("select ville_code_insee, count(*) from catalogue.monument group by 1")
        .query((rs, i) -> parVille.put(rs.getString(1), rs.getInt(2)))
        .list();
    List<Existant> enBase =
        jdbc.sql("select wikidata_id, nom, popularite from catalogue.monument")
            .query((rs, i) -> new Existant(rs.getString(1), rs.getString(2), rs.getLong(3)))
            .list();
    Set<String> idsEnBase = new HashSet<>();
    enBase.forEach(e -> idsEnBase.add(e.wikidataId()));
    int max = jdbc.sql(DERNIER_NUMERO).query(Integer.class).single();

    List<Candidat> nouveaux = new ArrayList<>();
    List<Candidat> existants = new ArrayList<>();
    for (Quotas.Ville ville : quotas.villes()) {
      List<Candidat> candidats = source.candidats(ville);
      candidats.stream().filter(c -> idsEnBase.contains(c.wikidataId())).forEach(existants::add);
      nouveaux.addAll(
          SelectionCatalogue.choisir(
              ville.quota(), parVille.getOrDefault(ville.insee(), 0), idsEnBase, candidats));
    }

    Map<String, Long> popularites = new HashMap<>();
    existants.forEach(c -> popularites.put(c.wikidataId(), c.popularite()));
    List<Existant> rang =
        enBase.stream()
            .map(
                e ->
                    new Existant(
                        e.wikidataId(),
                        e.nom(),
                        popularites.getOrDefault(e.wikidataId(), e.popularite())))
            .toList();
    List<Proposition.Ligne> lignes =
        SelectionCatalogue.attribuer(max, rang, nouveaux).stream()
            .map(n -> new Proposition.Ligne(n.numero(), n.rarete(), n.candidat()))
            .toList();

    Set<String> vus = new HashSet<>();
    existants.forEach(c -> vus.add(c.wikidataId()));
    List<String> absents = idsEnBase.stream().filter(id -> !vus.contains(id)).sorted().toList();

    Proposition p = new Proposition(lignes, existants, absents);
    try {
      json.writeValue(fichier, p);
    } catch (RuntimeException e) {
      throw new IllegalStateException("écriture impossible : " + fichier, e);
    }
    return p;
  }

  public Proposition lire(Path fichier) {
    return json.readValue(fichier, Proposition.class);
  }

  /** Mode figer : applique le fichier de relecture ; numéros et rareté sont calculés ici. */
  public void figer(Proposition p) {
    valider(p);
    List<Candidat> nouveaux = p.nouveaux().stream().map(Proposition.Ligne::candidat).toList();

    // Phase 1 : réseau, sans transaction. Une erreur ici n'écrit rien.
    Map<String, byte[]> images = new HashMap<>();
    Set<String> sansImage =
        new HashSet<>(
            jdbc.sql("select wikidata_id from catalogue.monument where image_url is null")
                .query(String.class)
                .list());
    for (Candidat c : concat(nouveaux, p.existants())) {
      boolean utile = nouveaux.contains(c) || sansImage.contains(c.wikidataId());
      if (utile && c.imageFichier() != null) {
        images.put(c.wikidataId(), source.telechargerImage(c));
      }
    }

    // Phase 2 : une transaction, sous verrou consultatif (deux imports simultanés impossibles).
    tx.executeWithoutResult(
        status -> {
          jdbc.sql("select pg_advisory_xact_lock(18)").query().singleRow();
          quotas
              .villes()
              .forEach(
                  v ->
                      jdbc.sql(
                              "insert into catalogue.ville (code_insee, nom, quota) values (?,?,?)"
                                  + " on conflict (code_insee) do update"
                                  + " set nom = excluded.nom, quota = excluded.quota")
                          .params(v.insee(), v.nom(), v.quota())
                          .update());
          verifierQuotas(nouveaux);

          int max = jdbc.sql(DERNIER_NUMERO).query(Integer.class).single();
          List<Existant> rang =
              jdbc.sql("select wikidata_id, nom, popularite from catalogue.monument")
                  .query((rs, i) -> new Existant(rs.getString(1), rs.getString(2), rs.getLong(3)))
                  .list();
          List<Numerote> attribues = SelectionCatalogue.attribuer(max, rang, nouveaux);
          for (Numerote n : attribues) {
            inserer(n, images.get(n.candidat().wikidataId()));
          }
          if (!attribues.isEmpty()) {
            jdbc.sql("update catalogue.numerotation set dernier = ?")
                .param(attribues.getLast().numero())
                .update();
          }
          for (Candidat c : p.existants()) {
            rafraichir(c, images.get(c.wikidataId()));
          }
        });
  }

  private void valider(Proposition p) {
    Set<String> villes = new HashSet<>();
    quotas.villes().forEach(v -> villes.add(v.insee()));
    Set<String> ids = new HashSet<>();
    for (Candidat c :
        concat(p.nouveaux().stream().map(Proposition.Ligne::candidat).toList(), p.existants())) {
      if (!villes.contains(c.villeInsee())) {
        throw new IllegalArgumentException("ville absente du yml : " + c.villeInsee());
      }
      if (c.wikidataId() == null || c.nom() == null || !ids.add(c.wikidataId())) {
        throw new IllegalArgumentException("monument invalide ou en double : " + c.wikidataId());
      }
      if ((c.imageFichier() != null && c.imageLicence() == null)
          || (c.histoireTexte() != null && c.histoireLicence() == null)) {
        throw new IllegalArgumentException("contenu sans licence (RG-022) : " + c.wikidataId());
      }
    }
  }

  private void verifierQuotas(List<Candidat> nouveaux) {
    for (Quotas.Ville v : quotas.villes()) {
      int deja =
          jdbc.sql("select count(*) from catalogue.monument where ville_code_insee = ?")
              .param(v.insee())
              .query(Integer.class)
              .single();
      long ajouts = nouveaux.stream().filter(c -> c.villeInsee().equals(v.insee())).count();
      if (ajouts > 0 && deja + ajouts > v.quota()) {
        throw new IllegalArgumentException("quota dépassé pour " + v.nom());
      }
    }
  }

  private void inserer(Numerote n, byte[] image) {
    Candidat c = n.candidat();
    String url = image == null ? null : enregistrerImage(n.numero(), c, image);
    jdbc.sql(
            "insert into catalogue.monument (numero, wikidata_id, merimee_id, nom, type,"
                + " ville_code_insee, latitude, longitude, rayon_capture_m, rarete, popularite,"
                + " annee, style, hauteur_m, histoire_texte, histoire_source_url,"
                + " histoire_licence, image_url, image_source_url, image_licence,"
                + " image_licence_url, image_auteur)"
                + " values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .params(
            n.numero(),
            c.wikidataId(),
            c.merimeeId(),
            c.nom(),
            c.type().name(),
            c.villeInsee(),
            c.latitude(),
            c.longitude(),
            quotas.rayons().getOrDefault(c.wikidataId(), RAYON_DEFAUT_M),
            n.rarete().name(),
            c.popularite(),
            c.annee(),
            c.style(),
            c.hauteurM(),
            c.histoireTexte(),
            c.histoireSourceUrl(),
            c.histoireLicence(),
            url,
            url == null ? null : c.imageSourceUrl(),
            url == null ? null : c.imageLicence(),
            url == null ? null : c.imageLicenceUrl(),
            url == null ? null : c.imageAuteur())
        .update();
  }

  /** Numéro, ville et rareté ne changent jamais ; le rayon seulement s'il est surchargé. */
  private void rafraichir(Candidat c, byte[] image) {
    Integer numero =
        jdbc.sql("select numero from catalogue.monument where wikidata_id = ?")
            .param(c.wikidataId())
            .query(Integer.class)
            .optional()
            .orElse(null);
    if (numero == null) {
      throw new IllegalArgumentException("monument existant introuvable : " + c.wikidataId());
    }
    jdbc.sql(
            "update catalogue.monument set merimee_id=?, nom=?, type=?, latitude=?, longitude=?,"
                + " popularite=?, annee=?, style=?, hauteur_m=?, histoire_texte=?,"
                + " histoire_source_url=?, histoire_licence=?, mis_a_jour_le=now()"
                + " where wikidata_id=?")
        .params(
            c.merimeeId(),
            c.nom(),
            c.type().name(),
            c.latitude(),
            c.longitude(),
            c.popularite(),
            c.annee(),
            c.style(),
            c.hauteurM(),
            c.histoireTexte(),
            c.histoireSourceUrl(),
            c.histoireLicence(),
            c.wikidataId())
        .update();
    Integer rayon = quotas.rayons().get(c.wikidataId());
    if (rayon != null) {
      jdbc.sql("update catalogue.monument set rayon_capture_m=? where wikidata_id=?")
          .params(rayon, c.wikidataId())
          .update();
    }
    if (image != null) {
      String url = enregistrerImage(numero, c, image);
      jdbc.sql(
              "update catalogue.monument set image_url=?, image_source_url=?, image_licence=?,"
                  + " image_licence_url=?, image_auteur=? where wikidata_id=?")
          .params(
              url,
              c.imageSourceUrl(),
              c.imageLicence(),
              c.imageLicenceUrl(),
              c.imageAuteur(),
              c.wikidataId())
          .update();
    }
  }

  /** Copie dans notre stockage ; jamais d'URL Wikimedia en base (CSP, RGPD). */
  private String enregistrerImage(int numero, Candidat c, byte[] octets) {
    String nom = c.imageFichier().toLowerCase(Locale.ROOT);
    String ext =
        nom.endsWith(".png") || nom.endsWith(".svg")
            ? "png"
            : nom.endsWith(".webp") ? "webp" : "jpg";
    String fichier = numero + "." + ext;
    try {
      Files.createDirectories(dossierImages);
      Files.write(dossierImages.resolve(fichier), octets);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
    return URL_IMAGES + fichier;
  }

  private static List<Candidat> concat(List<Candidat> a, List<Candidat> b) {
    List<Candidat> r = new ArrayList<>(a);
    r.addAll(b);
    return r;
  }
}
