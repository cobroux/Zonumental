package fr.zonumental;

import java.util.UUID;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.containers.GenericContainer;

/**
 * Lance l'appli en local avec PostGIS, MinIO (via TestcontainersConfiguration) et Mailpit dans
 * Docker : {@code ./mvnw spring-boot:test-run}. Les données repartent de zéro à chaque lancement.
 */
public final class LancementLocal {

  private LancementLocal() {}

  public static void main(String[] args) {
    // Mêmes valeurs factices que les tests (pom.xml), jamais utilisées hors du poste
    System.setProperty(
        "ZONUMENTAL_JWT_SECRET",
        "c2VjcmV0LWZhY3RpY2UtZGUtdGVzdC1uZS1wYXMtdXRpbGlzZXItMDEyMzQ1Njc4OQ==");
    System.setProperty(
        "ZONUMENTAL_HMAC_SECRET",
        "aG1hYy1mYWN0aWNlLWRlLXRlc3QtbmUtcGFzLXV0aWxpc2VyLTAxMjM0NTY3ODk=");
    SpringApplication.from(ZonumentalApplication::main)
        .with(TestcontainersConfiguration.class, Mailpit.class, JeuDeDonnees.class)
        .run(args);
  }

  @TestConfiguration(proxyBeanMethods = false)
  static class Mailpit {

    @Bean
    GenericContainer<?> mailpit() {
      return new GenericContainer<>("axllent/mailpit:v1.21.8").withExposedPorts(1025, 8025);
    }

    @Bean
    DynamicPropertyRegistrar mailpitProprietes(GenericContainer<?> mailpit) {
      return registre -> {
        registre.add("spring.mail.host", mailpit::getHost);
        registre.add("spring.mail.port", () -> mailpit.getMappedPort(1025));
        System.out.printf(
            "%n  Boîte mail de test : http://localhost:%d%n%n", mailpit.getMappedPort(8025));
      };
    }
  }

  /**
   * Compte de dev testeur@example.com / MotDePasseTest-2026 (vérifié, consentements accordés) avec
   * les 4 premiers monuments du catalogue déjà capturés. Données jetables, jamais hors du poste.
   */
  @TestConfiguration(proxyBeanMethods = false)
  static class JeuDeDonnees {

    @Bean
    ApplicationRunner jeuDeDonnees(JdbcClient jdbc, PasswordEncoder encodeur) {
      return args -> {
        UUID id = UUID.randomUUID();
        jdbc.sql(
                "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash,"
                    + " date_naissance, email_verifie_le, cree_le, derniere_activite_le)"
                    + " values (?, 'testeur@example.com', 'Testeur', ?, '1995-05-10', now(),"
                    + " now(), now()) on conflict do nothing")
            .params(id, encodeur.encode("MotDePasseTest-2026"))
            .update();
        for (String type : new String[] {"CGU", "CONFIDENTIALITE", "CLASSEMENT"}) {
          jdbc.sql(
                  "insert into compte.consentement (utilisateur_id, type, accorde,"
                      + " version_texte, horodatage) values (?, ?, true, 'dev', now())")
              .params(id, type)
              .update();
        }
        jdbc.sql(
                "insert into capture.capture (utilisateur_id, numero_monument, distance_m,"
                    + " photo_id) select ?, numero, 10, gen_random_uuid()"
                    + " from catalogue.monument where numero <= 4")
            .param(id)
            .update();
      };
    }
  }
}
