package fr.zonumental.commun;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

class ErreursApiTest {

  /** Au-delà de 10 Mo le conteneur refuse : même réponse qu'une photo invalide (RG-053). */
  @Test
  void fichier_trop_gros_devient_image_invalide_422() {
    var reponse = new ErreursApi().tropVolumineux(new MaxUploadSizeExceededException(10_000_000));
    assertThat(reponse.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    assertThat(reponse.getBody().getProperties()).containsEntry("code", "image-invalide");
  }
}
