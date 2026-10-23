package fr.zonumental.capture;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.exif.ExifIFD0Directory;
import fr.zonumental.commun.ErreurMetier;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Set;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Vérifie une photo envoyée puis la réencode (RG-050, RG-051, RG-052) : format réel lu dans les
 * octets, taille et nombre de pixels bornés avant décodage, orientation EXIF appliquée, 1600 px
 * côté long, JPEG qualité 0,85. L'image rendue est neuve : aucune métadonnée (EXIF, GPS) ne survit.
 */
@Component
class Photos {

  static final int OCTETS_MAX = 5_000_000;
  static final long PIXELS_MAX = 24_000_000L;
  static final int COTE_MAX = 1600;
  static final float QUALITE = 0.85f;
  private static final Set<String> FORMATS = Set.of("jpeg", "png", "webp");

  /** {@code image-invalide} (422) pour tout fichier refusé, sans détail sur la raison. */
  byte[] reencoder(byte[] octets) {
    if (octets.length > OCTETS_MAX) {
      throw invalide();
    }
    try {
      BufferedImage source = decoder(octets);
      return encoder(orienterEtReduire(source, orientation(octets)));
    } catch (IOException | RuntimeException e) {
      if (e instanceof ErreurMetier erreur) {
        throw erreur;
      }
      throw invalide();
    }
  }

  private static BufferedImage decoder(byte[] octets) throws IOException {
    try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(octets))) {
      Iterator<ImageReader> lecteurs = ImageIO.getImageReaders(in);
      if (!lecteurs.hasNext()) {
        throw invalide();
      }
      ImageReader lecteur = lecteurs.next();
      try {
        if (!FORMATS.contains(lecteur.getFormatName().toLowerCase())) {
          throw invalide();
        }
        lecteur.setInput(in);
        // Dimensions lues dans l'en-tête, avant d'allouer le moindre pixel (anti-bombe).
        if ((long) lecteur.getWidth(0) * lecteur.getHeight(0) > PIXELS_MAX) {
          throw invalide();
        }
        return lecteur.read(0);
      } finally {
        lecteur.dispose();
      }
    }
  }

  /** Tag EXIF Orientation (1 à 8) ; 1 si absent ou illisible. */
  private static int orientation(byte[] octets) {
    try {
      var exif =
          ImageMetadataReader.readMetadata(new ByteArrayInputStream(octets))
              .getFirstDirectoryOfType(ExifIFD0Directory.class);
      if (exif != null && exif.containsTag(ExifIFD0Directory.TAG_ORIENTATION)) {
        int o = exif.getInt(ExifIFD0Directory.TAG_ORIENTATION);
        return o >= 1 && o <= 8 ? o : 1;
      }
    } catch (Exception e) {
      // métadonnées illisibles : l'image est tout de même valable, sans rotation
    }
    return 1;
  }

  private static BufferedImage orienterEtReduire(BufferedImage src, int orientation) {
    int w = src.getWidth();
    int h = src.getHeight();
    boolean echange = orientation >= 5;
    int ow = echange ? h : w;
    int oh = echange ? w : h;
    double echelle = Math.min(1.0, (double) COTE_MAX / Math.max(ow, oh));
    // Matrices EXIF : (m00, m10, m01, m11, m02, m12).
    AffineTransform t =
        switch (orientation) {
          case 2 -> new AffineTransform(-1, 0, 0, 1, w, 0);
          case 3 -> new AffineTransform(-1, 0, 0, -1, w, h);
          case 4 -> new AffineTransform(1, 0, 0, -1, 0, h);
          case 5 -> new AffineTransform(0, 1, 1, 0, 0, 0);
          case 6 -> new AffineTransform(0, 1, -1, 0, h, 0);
          case 7 -> new AffineTransform(0, -1, -1, 0, h, w);
          case 8 -> new AffineTransform(0, -1, 1, 0, 0, w);
          default -> new AffineTransform();
        };
    AffineTransform total = AffineTransform.getScaleInstance(echelle, echelle);
    total.concatenate(t);
    BufferedImage sortie =
        new BufferedImage(
            Math.max(1, (int) Math.round(ow * echelle)),
            Math.max(1, (int) Math.round(oh * echelle)),
            BufferedImage.TYPE_INT_RGB);
    Graphics2D g = sortie.createGraphics();
    try {
      g.setRenderingHint(
          RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
      g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
      g.setColor(Color.WHITE); // fond des PNG/WebP transparents
      g.fillRect(0, 0, sortie.getWidth(), sortie.getHeight());
      g.drawImage(src, total, null);
    } finally {
      g.dispose();
    }
    return sortie;
  }

  private static byte[] encoder(BufferedImage image) throws IOException {
    ImageWriter ecrivain = ImageIO.getImageWritersByFormatName("jpeg").next();
    ByteArrayOutputStream sortie = new ByteArrayOutputStream();
    try (MemoryCacheImageOutputStream out = new MemoryCacheImageOutputStream(sortie)) {
      ImageWriteParam param = ecrivain.getDefaultWriteParam();
      param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
      param.setCompressionQuality(QUALITE);
      ecrivain.setOutput(out);
      ecrivain.write(null, new IIOImage(image, null, null), param); // métadonnées nulles
    } finally {
      ecrivain.dispose();
    }
    return sortie.toByteArray();
  }

  private static ErreurMetier invalide() {
    return new ErreurMetier(HttpStatus.UNPROCESSABLE_ENTITY, "image-invalide");
  }
}
