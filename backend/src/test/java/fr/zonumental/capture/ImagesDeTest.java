package fr.zonumental.capture;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;

/** Images fabriquées pour les tests : aucune vraie photo. */
final class ImagesDeTest {

  private ImagesDeTest() {}

  /** Paysage l x h, rouge en haut à gauche (repère d'orientation), bleu ailleurs. */
  static BufferedImage image(int l, int h) {
    BufferedImage img = new BufferedImage(l, h, BufferedImage.TYPE_INT_RGB);
    Graphics2D g = img.createGraphics();
    g.setColor(Color.BLUE);
    g.fillRect(0, 0, l, h);
    g.setColor(Color.RED);
    g.fillRect(0, 0, l / 4, h / 4);
    g.dispose();
    return img;
  }

  static byte[] encoder(BufferedImage img, String format) {
    try {
      ByteArrayOutputStream o = new ByteArrayOutputStream();
      if (!ImageIO.write(img, format, o)) {
        throw new IllegalStateException("pas d'encodeur " + format);
      }
      return o.toByteArray();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  /** JPEG avec un segment EXIF : orientation et un répertoire GPS (jamais de vraie position). */
  static byte[] jpegAvecExif(BufferedImage img, int orientation) {
    byte[] jpeg = encoder(img, "jpeg");
    ByteBuffer tiff = ByteBuffer.allocate(8 + 30 + 18); // big-endian par défaut
    tiff.put((byte) 'M').put((byte) 'M').putShort((short) 0x2A).putInt(8);
    tiff.putShort((short) 2); // IFD0 : 2 entrées
    tiff.putShort((short) 0x0112).putShort((short) 3).putInt(1).putShort((short) orientation);
    tiff.putShort((short) 0);
    tiff.putShort((short) 0x8825).putShort((short) 4).putInt(1).putInt(38); // pointeur GPS
    tiff.putInt(0);
    tiff.putShort((short) 1); // IFD GPS : LatitudeRef = "N"
    tiff.putShort((short) 1).putShort((short) 2).putInt(2).put((byte) 'N').put(new byte[3]);
    tiff.putInt(0);
    byte[] exif = "Exif\0\0".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    ByteArrayOutputStream o = new ByteArrayOutputStream();
    o.write(jpeg, 0, 2); // SOI
    o.write(0xFF);
    o.write(0xE1);
    int longueur = 2 + exif.length + tiff.capacity();
    o.write(longueur >> 8);
    o.write(longueur & 0xFF);
    o.writeBytes(exif);
    o.writeBytes(tiff.array());
    o.write(jpeg, 2, jpeg.length - 2);
    return o.toByteArray();
  }

  /** PNG dont seul l'en-tête est valide : annonce l x h sans en-contenir les pixels. */
  static byte[] pngBombe(int l, int h) {
    ByteArrayOutputStream o = new ByteArrayOutputStream();
    o.writeBytes(new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
    ByteBuffer ihdr = ByteBuffer.allocate(13).putInt(l).putInt(h).put((byte) 8).put((byte) 0);
    ihdr.put((byte) 0).put((byte) 0).put((byte) 0);
    chunk(o, "IHDR", ihdr.array());
    chunk(o, "IEND", new byte[0]);
    return o.toByteArray();
  }

  private static void chunk(ByteArrayOutputStream o, String type, byte[] donnees) {
    byte[] t = type.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    CRC32 crc = new CRC32();
    crc.update(t);
    crc.update(donnees);
    o.writeBytes(ByteBuffer.allocate(4).putInt(donnees.length).array());
    o.writeBytes(t);
    o.writeBytes(donnees);
    o.writeBytes(ByteBuffer.allocate(4).putInt((int) crc.getValue()).array());
  }
}
