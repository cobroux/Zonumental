package fr.zonumental.catalogue;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Wikidata (SPARQL), Pageviews, Wikipédia (summary) et Commons (extmetadata). */
public class SourceWikimedia implements SourceMonuments {

  private static final String METRE = "http://www.wikidata.org/entity/Q11573";
  private static final String LICENCE_TEXTE = "CC BY-SA 4.0";
  private static final int ESSAIS = 3;
  private static final String SPARQL =
      """
      SELECT ?item ?label ?merimee ?coord ?article ?image ?inception ?precision ?styleLabel
             ?height ?unit
             (GROUP_CONCAT(DISTINCT STRAFTER(STR(?type), "entity/"); separator=",") AS ?types)
      WHERE {
        ?commune wdt:P374 "%s".
        ?item wdt:P131+ ?commune; wdt:P380 ?merimee; wdt:P625 ?coord; wdt:P31 ?type.
        ?article schema:about ?item; schema:isPartOf <https://fr.wikipedia.org/>.
        ?item rdfs:label ?label. FILTER(LANG(?label) = "fr")
        OPTIONAL { ?item wdt:P18 ?image }
        OPTIONAL { ?item p:P571/psv:P571 [wikibase:timeValue ?inception;
                                           wikibase:timePrecision ?precision] }
        OPTIONAL { ?item wdt:P149 ?style. ?style rdfs:label ?styleLabel.
                   FILTER(LANG(?styleLabel) = "fr") }
        OPTIONAL { ?item p:P2048/psv:P2048 [wikibase:quantityAmount ?height;
                                             wikibase:quantityUnit ?unit] }
      }
      GROUP BY ?item ?label ?merimee ?coord ?article ?image ?inception ?precision ?styleLabel
               ?height ?unit
      """;

  private final RestClient http;
  private final Clock clock;
  private final long delaiMs;
  private final ObjectMapper json = new ObjectMapper();

  private final RestClient sparql;

  public SourceWikimedia(RestClient.Builder builder, Clock clock, String contact, long delaiMs) {
    this(builder, builder.clone(), clock, contact, delaiMs);
  }

  /** {@code builderSparql} : client à lecture longue pour query.wikidata.org seulement. */
  public SourceWikimedia(
      RestClient.Builder builder,
      RestClient.Builder builderSparql,
      Clock clock,
      String contact,
      long delaiMs) {
    if (contact == null || contact.isBlank()) {
      throw new IllegalStateException("ZONUMENTAL_CONTACT est obligatoire pour l'import");
    }
    // Politique User-Agent de Wikimedia : contact propre au projet, jamais une adresse perso.
    String ua = "Zonumental/0.1 (" + contact + ")";
    this.http = builder.defaultHeader("User-Agent", ua).build();
    this.sparql = builderSparql.defaultHeader("User-Agent", ua).build();
    this.clock = clock;
    this.delaiMs = delaiMs;
  }

  /** Délais HTTP explicites (jamais ceux, infinis, par défaut). */
  public static ClientHttpRequestFactory fabrique(Duration connexion, Duration lecture) {
    var f =
        new JdkClientHttpRequestFactory(
            HttpClient.newBuilder()
                .connectTimeout(connexion)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build());
    f.setReadTimeout(lecture);
    return f;
  }

  @Override
  public List<Candidat> candidats(Quotas.Ville ville) {
    URI uri =
        UriComponentsBuilder.fromUriString("https://query.wikidata.org/sparql")
            .queryParam("query", "{q}")
            .queryParam("format", "json")
            .encode()
            .buildAndExpand(SPARQL.formatted(ville.insee()))
            .toUri();
    JsonNode lignes = lireJson(uri).path("results").path("bindings");

    Map<String, Candidat> parId = new LinkedHashMap<>();
    for (JsonNode l : lignes) {
      String id = fin(valeur(l, "item"));
      if (!parId.containsKey(id)) {
        parId.put(id, enrichir(ville, id, l));
      }
    }
    return List.copyOf(parId.values());
  }

  @Override
  public byte[] telechargerImage(Candidat c) {
    URI uri =
        UriComponentsBuilder.fromUriString(
                "https://commons.wikimedia.org/wiki/Special:FilePath/{f}")
            .queryParam("width", 1200)
            .encode()
            .buildAndExpand(c.imageFichier())
            .toUri();
    return avecEssais(() -> http.get().uri(uri).retrieve().body(byte[].class));
  }

  private Candidat enrichir(Quotas.Ville ville, String id, JsonNode l) {
    String article = valeur(l, "article");
    String titre = article.substring(article.lastIndexOf("/wiki/") + 6);

    String[] coord = valeur(l, "coord").replaceAll("[^0-9. -]", "").trim().split(" ");
    List<String> types = Arrays.asList(valeur(l, "types").split(","));

    Integer annee = null;
    if (!valeur(l, "precision").isEmpty() && Integer.parseInt(valeur(l, "precision")) >= 9) {
      annee = Integer.parseInt(valeur(l, "inception").substring(0, 4));
    }
    BigDecimal hauteur =
        METRE.equals(valeur(l, "unit")) && !valeur(l, "height").isEmpty()
            ? new BigDecimal(valeur(l, "height"))
            : null;
    String style = valeur(l, "styleLabel").isEmpty() ? null : valeur(l, "styleLabel");

    String texte = null;
    String texteUrl = null;
    JsonNode resume =
        lireJsonOuNull(URI.create("https://fr.wikipedia.org/api/rest_v1/page/summary/" + titre));
    if (resume != null && !resume.path("extract").asString("").isBlank()) {
      texte = resume.path("extract").asString();
      texteUrl = resume.path("content_urls").path("desktop").path("page").asString(article);
    }

    String fichier = null;
    String sourceImage = null;
    String licence = null;
    String licenceUrl = null;
    String auteur = null;
    if (!valeur(l, "image").isEmpty()) {
      String nom = URLDecoder.decode(fin(valeur(l, "image")), StandardCharsets.UTF_8);
      JsonNode meta = metadonneesCommons(nom);
      String lic = meta.path("LicenseShortName").path("value").asString("");
      String art = nettoyer(meta.path("Artist").path("value").asString(""));
      boolean attribution =
          "true".equalsIgnoreCase(meta.path("AttributionRequired").path("value").asString(""));
      // RG-022 : sans licence identifiable, ou attribution exigée sans auteur : pas d'image.
      if (!lic.isEmpty() && !(attribution && art.isEmpty())) {
        fichier = nom;
        sourceImage = "https://commons.wikimedia.org/wiki/File:" + nom.replace(' ', '_');
        licence = lic;
        licenceUrl = meta.path("LicenseUrl").path("value").asString(null);
        auteur = art.isEmpty() ? null : art;
      }
    }

    return new Candidat(
        id,
        valeur(l, "merimee"),
        valeur(l, "label"),
        TypeMonument.depuisP31(types),
        ville.insee(),
        Double.parseDouble(coord[1]),
        Double.parseDouble(coord[0]),
        vues(titre),
        annee,
        style,
        hauteur,
        texte,
        texteUrl,
        texte == null ? null : LICENCE_TEXTE,
        fichier,
        sourceImage,
        licence,
        licenceUrl,
        auteur);
  }

  /** Vues des 12 derniers mois complets ; 0 si l'article n'a pas de données. */
  private long vues(String titre) {
    YearMonth fin = YearMonth.now(clock).minusMonths(1);
    YearMonth debut = fin.minusMonths(11);
    DateTimeFormatter f = DateTimeFormatter.BASIC_ISO_DATE;
    URI uri =
        URI.create(
            "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/"
                + "all-access/user/"
                + titre
                + "/monthly/"
                + debut.atDay(1).format(f)
                + "/"
                + fin.atEndOfMonth().format(f));
    JsonNode racine = lireJsonOuNull(uri);
    long total = 0;
    if (racine != null) {
      for (JsonNode i : racine.path("items")) {
        total += i.path("views").asLong(0);
      }
    }
    return total;
  }

  private JsonNode metadonneesCommons(String nomFichier) {
    URI uri =
        UriComponentsBuilder.fromUriString("https://commons.wikimedia.org/w/api.php")
            .queryParam("action", "query")
            .queryParam("prop", "imageinfo")
            .queryParam("iiprop", "extmetadata")
            .queryParam("format", "json")
            .queryParam("titles", "File:{f}")
            .encode()
            .buildAndExpand(nomFichier)
            .toUri();
    JsonNode pages = lireJson(uri).path("query").path("pages");
    for (JsonNode p : pages) {
      return p.path("imageinfo").path(0).path("extmetadata");
    }
    return json.createObjectNode();
  }

  private static String nettoyer(String html) {
    return html.replaceAll("<[^>]*>", "")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#039;", "'")
        .trim();
  }

  private static String valeur(JsonNode ligne, String cle) {
    return ligne.path(cle).path("value").asString("");
  }

  private static String fin(String uri) {
    return uri.substring(uri.lastIndexOf('/') + 1);
  }

  private JsonNode lireJson(URI uri) {
    RestClient client = "query.wikidata.org".equals(uri.getHost()) ? sparql : http;
    String corps = avecEssais(() -> client.get().uri(uri).retrieve().body(String.class));
    return json.readTree(corps);
  }

  /** 404 = pas de donnée (article sans vues, sans résumé) : ce n'est pas une erreur de source. */
  private JsonNode lireJsonOuNull(URI uri) {
    try {
      return lireJson(uri);
    } catch (IllegalStateException e) {
      if (e.getCause() instanceof HttpClientErrorException.NotFound) {
        return null;
      }
      throw e;
    }
  }

  private <T> T avecEssais(Supplier<T> appel) {
    RuntimeException derniere = null;
    for (int i = 0; i < ESSAIS; i++) {
      try {
        if (delaiMs > 0) {
          Thread.sleep(delaiMs);
        }
        return appel.get();
      } catch (HttpClientErrorException.NotFound e) {
        throw new IllegalStateException("introuvable", e);
      } catch (RuntimeException e) {
        derniere = e;
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(e);
      }
    }
    throw new IllegalStateException("source indisponible après " + ESSAIS + " essais", derniere);
  }
}
