package fr.zonumental.compte.courriel;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/** E-mails transactionnels en texte brut (ADR 0005). Asynchrone : un échec est journalisé. */
@Component
public class Courriels {

  private static final Logger LOG = LoggerFactory.getLogger(Courriels.class);

  private final JavaMailSender mail;
  private final String expediteur;
  private final String frontUrl;

  Courriels(
      JavaMailSender mail,
      @Value("${zonumental.mail.expediteur}") String expediteur,
      @Value("${zonumental.front-url}") String frontUrl) {
    this.mail = mail;
    this.expediteur = expediteur;
    this.frontUrl = frontUrl;
  }

  @Async
  public void verification(String destinataire, String jeton) {
    envoyer(destinataire, "verification", frontUrl + "/verifier-email?jeton=" + jeton);
  }

  @Async
  public void reinitialisation(String destinataire, String jeton) {
    envoyer(
        destinataire, "reinitialisation", frontUrl + "/reinitialiser-mot-de-passe?jeton=" + jeton);
  }

  @Async
  public void dejaInscrit(String destinataire) {
    envoyer(destinataire, "deja-inscrit", frontUrl);
  }

  @Async
  public void suppression(String destinataire, java.time.LocalDate date) {
    envoyer(
        destinataire,
        "suppression",
        date.format(
            java.time.format.DateTimeFormatter.ofPattern("d MMMM uuuu", java.util.Locale.FRANCE)));
  }

  /** Première ligne du fichier = objet, le reste = corps ; jamais l'adresse dans les journaux. */
  private void envoyer(String destinataire, String modele, String valeur) {
    try {
      String[] texte = lire(modele).formatted(valeur).split("\n", 2);
      var m = new SimpleMailMessage();
      m.setFrom(expediteur);
      m.setTo(destinataire);
      m.setSubject(texte[0]);
      m.setText(texte[1]);
      mail.send(m);
    } catch (RuntimeException e) {
      LOG.warn("Envoi de l'e-mail {} impossible : {}", modele, e.getClass().getSimpleName());
    }
  }

  private static String lire(String modele) {
    try (var in = new ClassPathResource("courriels/" + modele + ".txt").getInputStream()) {
      return new String(in.readAllBytes(), StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}
