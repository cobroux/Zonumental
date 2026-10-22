package fr.zonumental;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.containers.GenericContainer;

/**
 * Lance l'appli en local avec PostGIS et Mailpit dans Docker : {@code ./mvnw spring-boot:test-run}.
 * Les données repartent de zéro à chaque lancement.
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
        .with(TestcontainersConfiguration.class, Mailpit.class)
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
}
