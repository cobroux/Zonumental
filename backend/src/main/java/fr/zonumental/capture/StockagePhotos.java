package fr.zonumental.capture;

import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.S3Object;

/**
 * Photos de capture dans le bucket privé : {@code captures/<utilisateurId>/<photoId>.jpg} (ADR
 * 0006). Jamais d'URL publique ni présignée : la lecture passe par le backend.
 */
@Component
class StockagePhotos {

  private final S3Client s3;
  private final String bucket;

  StockagePhotos(S3Client s3, @Value("${zonumental.s3.bucket}") String bucket) {
    this.s3 = s3;
    this.bucket = bucket;
  }

  /** Taille connue d'avance : le PUT est atomique, une coupure n'écrit rien. */
  void deposer(UUID utilisateur, UUID photo, byte[] jpeg) {
    s3.putObject(
        b -> b.bucket(bucket).key(cle(utilisateur, photo)).contentType("image/jpeg"),
        RequestBody.fromBytes(jpeg));
  }

  Optional<byte[]> lire(UUID utilisateur, UUID photo) {
    try {
      return Optional.of(
          s3.getObjectAsBytes(b -> b.bucket(bucket).key(cle(utilisateur, photo))).asByteArray());
    } catch (NoSuchKeyException e) {
      return Optional.empty();
    }
  }

  void supprimer(UUID utilisateur, UUID photo) {
    s3.deleteObject(b -> b.bucket(bucket).key(cle(utilisateur, photo)));
  }

  /** Efface tout le préfixe du compte, page par page ; sans effet s'il est déjà vide. */
  void supprimerTout(UUID utilisateur) {
    s3.listObjectsV2Paginator(b -> b.bucket(bucket).prefix(prefixe(utilisateur)))
        .forEach(
            page -> {
              if (page.contents().isEmpty()) {
                return;
              }
              var cles =
                  page.contents().stream()
                      .map(S3Object::key)
                      .map(k -> ObjectIdentifier.builder().key(k).build())
                      .toList();
              s3.deleteObjects(b -> b.bucket(bucket).delete(d -> d.objects(cles).quiet(true)));
            });
  }

  private static String prefixe(UUID utilisateur) {
    return "captures/" + utilisateur + "/";
  }

  private static String cle(UUID utilisateur, UUID photo) {
    return prefixe(utilisateur) + photo + ".jpg";
  }
}
