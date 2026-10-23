package fr.zonumental.capture;

import fr.zonumental.catalogue.Cibles;
import fr.zonumental.commun.ErreurMetier;
import fr.zonumental.compte.Comptes;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Capture d'un monument (RG-029 à RG-033, RG-053). La position et la précision servent aux
 * contrôles puis sont oubliées : elles ne sont ni stockées ni journalisées (RG-049).
 */
@Service
class Capturer {

  static final double PRECISION_MAX_M = 100;
  private static final Logger LOG = LoggerFactory.getLogger(Capturer.class);

  /** Corps de la réponse 201 (schéma CaptureReussie). */
  record Reussite(
      int numero,
      OffsetDateTime captureeLe,
      long distanceMetres,
      String photoUrl,
      Cibles.Histoire histoire) {}

  private final Comptes comptes;
  private final Cibles cibles;
  private final Photos photos;
  private final StockagePhotos stockage;
  private final JdbcClient jdbc;

  Capturer(
      Comptes comptes, Cibles cibles, Photos photos, StockagePhotos stockage, JdbcClient jdbc) {
    this.comptes = comptes;
    this.cibles = cibles;
    this.photos = photos;
    this.stockage = stockage;
    this.jdbc = jdbc;
  }

  Reussite capturer(
      UUID utilisateur,
      int numero,
      double latitude,
      double longitude,
      double precisionMetres,
      byte[] photo) {
    // L'ordre des contrôles est celui de RG-053 : ne pas le changer.
    if (!comptes.emailVerifie(utilisateur)) {
      throw refus(utilisateur, HttpStatus.FORBIDDEN, "email-non-verifie", Map.of());
    }
    Cibles.Cible cible =
        cibles
            .pour(numero, latitude, longitude)
            .orElseThrow(() -> refus(utilisateur, HttpStatus.NOT_FOUND, "introuvable", Map.of()));
    if (dejaCapture(utilisateur, numero)) {
      throw refus(utilisateur, HttpStatus.CONFLICT, "deja-capture", Map.of());
    }
    byte[] jpeg;
    try {
      jpeg = photos.reencoder(photo);
    } catch (ErreurMetier e) {
      throw refus(utilisateur, e.statut(), e.code(), Map.of());
    }
    // r1-capturer-3 : fréquence (RG-030) puis vitesse (RG-033) viennent ici, avant la précision.
    if (precisionMetres > PRECISION_MAX_M) {
      throw refus(utilisateur, HttpStatus.UNPROCESSABLE_ENTITY, "precision-insuffisante", Map.of());
    }
    if (cible.distanceMetres() > cible.rayonMetres()) {
      long affichee = (long) Math.ceil(cible.distanceMetres() / 10) * 10; // RG-046
      throw refus(
          utilisateur,
          HttpStatus.UNPROCESSABLE_ENTITY,
          "trop-loin",
          Map.of("distanceMetres", affichee));
    }
    OffsetDateTime le = enregistrer(utilisateur, numero, cible.distanceMetres(), jpeg);
    return new Reussite(
        numero,
        le,
        Math.round(cible.distanceMetres()),
        "/api/captures/" + numero + "/photo",
        cible.histoire());
  }

  /** Photo d'abord, ligne ensuite ; si la ligne échoue, la photo déposée est effacée. */
  private OffsetDateTime enregistrer(UUID utilisateur, int numero, double distance, byte[] jpeg) {
    UUID photoId = UUID.randomUUID();
    stockage.deposer(utilisateur, photoId, jpeg);
    try {
      return jdbc.sql(
              "insert into capture.capture (utilisateur_id, numero_monument, distance_m, photo_id)"
                  + " values (?, ?, ?, ?) returning capturee_le")
          .params(utilisateur, numero, distance, photoId)
          .query(OffsetDateTime.class)
          .single();
    } catch (DuplicateKeyException e) { // envoi simultané : l'autre a gagné
      effacer(utilisateur, photoId);
      throw refus(utilisateur, HttpStatus.CONFLICT, "deja-capture", Map.of());
    } catch (RuntimeException e) {
      effacer(utilisateur, photoId);
      throw e;
    }
  }

  private void effacer(UUID utilisateur, UUID photoId) {
    try {
      stockage.supprimer(utilisateur, photoId);
    } catch (RuntimeException e) {
      // Orphelin résiduel : effacé avec le préfixe du compte (plan r1-capture-back).
      LOG.warn("photo orpheline non effacée, compte {}", utilisateur, e);
    }
  }

  private boolean dejaCapture(UUID utilisateur, int numero) {
    return jdbc.sql(
            "select exists (select 1 from capture.capture"
                + " where utilisateur_id = ? and numero_monument = ?)")
        .params(utilisateur, numero)
        .query(Boolean.class)
        .single();
  }

  /** Refus journalisé en INFO : code et compte, jamais de position (RG-049, Q-27). */
  private static ErreurMetier refus(
      UUID utilisateur, HttpStatus statut, String code, Map<String, Object> proprietes) {
    LOG.info("capture refusée : {} (compte {})", code, utilisateur);
    return new ErreurMetier(statut, code, proprietes);
  }
}
