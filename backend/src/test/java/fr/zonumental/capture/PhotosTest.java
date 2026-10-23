package fr.zonumental.capture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.GpsDirectory;
import fr.zonumental.commun.ErreurMetier;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.Base64;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** r1-capturer-1 : vérification et réencodage des photos (RG-050, RG-051, RG-052). */
class PhotosTest {

  // 1 x 1 pixel, WebP avec perte : sert à prouver que le format est lu, pas à juger l'image.
  static final byte[] WEBP =
      Base64.getDecoder().decode("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA");

  final Photos photos = new Photos();

  @Test
  void pdfRenommeEnJpgRefuse() {
    byte[] pdf = "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n".getBytes();
    assertImageInvalide(pdf);
  }

  @Test
  void octetsAleatoiresRefuses() {
    assertImageInvalide(new byte[] {1, 2, 3, 4, 5});
    assertImageInvalide(new byte[0]);
  }

  @Test
  void formatReelEtNonNomDeFichier_gifRefuse() {
    assertImageInvalide(ImagesDeTest.encoder(ImagesDeTest.image(10, 10), "gif"));
  }

  @Test
  void pngDe30000PixelsDeCoteRefuseAvantDecodage() {
    assertImageInvalide(ImagesDeTest.pngBombe(30_000, 30_000));
  }

  @Test
  void plusDe24MegapixelsRefuse() {
    assertImageInvalide(ImagesDeTest.pngBombe(6_000, 4_001));
  }

  @Test
  void tailleLimiteA5000000Octets() {
    assertImageInvalide(new byte[5_000_001]);
  }

  @Test
  void jpegPngEtWebpAcceptesEtRendusEnJpeg() throws Exception {
    for (byte[] source :
        new byte[][] {
          ImagesDeTest.encoder(ImagesDeTest.image(300, 200), "jpeg"),
          ImagesDeTest.encoder(ImagesDeTest.image(300, 200), "png"),
          WEBP
        }) {
      byte[] sortie = photos.reencoder(source);
      assertThat(sortie).startsWith((byte) 0xFF, (byte) 0xD8);
      try (var in = ImageIO.createImageInputStream(new ByteArrayInputStream(sortie))) {
        assertThat(ImageIO.getImageReaders(in).next().getFormatName())
            .isEqualToIgnoringCase("JPEG");
      }
    }
  }

  @Test
  void reduitA1600PxCoteLongSansAgrandir() throws Exception {
    BufferedImage grande =
        lire(photos.reencoder(ImagesDeTest.encoder(ImagesDeTest.image(3200, 1800), "png")));
    assertThat(grande.getWidth()).isEqualTo(1600);
    assertThat(grande.getHeight()).isEqualTo(900);

    BufferedImage petite =
        lire(photos.reencoder(ImagesDeTest.encoder(ImagesDeTest.image(300, 200), "png")));
    assertThat(petite.getWidth()).isEqualTo(300);
    assertThat(petite.getHeight()).isEqualTo(200);
  }

  @Test
  void orientationExifAppliqueeEtMetadonneesEffacees() throws Exception {
    byte[] source = ImagesDeTest.jpegAvecExif(ImagesDeTest.image(200, 100), 6);
    // Le fichier piégé contient bien GPS et orientation (sinon le test ne prouverait rien).
    Metadata avant = ImageMetadataReader.readMetadata(new ByteArrayInputStream(source));
    assertThat(avant.getFirstDirectoryOfType(GpsDirectory.class)).isNotNull();

    byte[] sortie = photos.reencoder(source);

    Metadata apres = ImageMetadataReader.readMetadata(new ByteArrayInputStream(sortie));
    assertThat(apres.getFirstDirectoryOfType(GpsDirectory.class)).isNull();
    assertThat(new String(sortie, java.nio.charset.StandardCharsets.ISO_8859_1))
        .doesNotContain("Exif");
    BufferedImage img = lire(sortie);
    // Orientation 6 : paysage 200 x 100 affiché en portrait 100 x 200, repère rouge en haut à
    // droite.
    assertThat(img.getWidth()).isEqualTo(100);
    assertThat(img.getHeight()).isEqualTo(200);
    assertThat(proche(new Color(img.getRGB(90, 10)), Color.RED)).isTrue();
    assertThat(proche(new Color(img.getRGB(10, 10)), Color.BLUE)).isTrue();
  }

  private static void assertImageInvalide(byte[] octets) {
    assertThatThrownBy(() -> new Photos().reencoder(octets))
        .isInstanceOfSatisfying(
            ErreurMetier.class,
            e -> {
              assertThat(e.code()).isEqualTo("image-invalide");
              assertThat(e.statut()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
            });
  }

  private static BufferedImage lire(byte[] octets) throws Exception {
    return ImageIO.read(new ByteArrayInputStream(octets));
  }

  private static boolean proche(Color a, Color b) {
    return Math.abs(a.getRed() - b.getRed()) < 60
        && Math.abs(a.getGreen() - b.getGreen()) < 60
        && Math.abs(a.getBlue() - b.getBlue()) < 60;
  }
}
