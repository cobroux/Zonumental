package fr.zonumental;

import java.net.URI;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

  static final String BUCKET = "zonumental-test";
  static final String CLE_ACCES = "minio-test";
  static final String CLE_SECRETE = "minio-test-secret"; // valeur factice, usage local seulement

  private static GenericContainer<?> minioPartage;

  @Bean
  @ServiceConnection
  public PostgreSQLContainer postgresContainer() {
    return new PostgreSQLContainer(
        DockerImageName.parse("postgis/postgis:18-3.6").asCompatibleSubstituteFor("postgres"));
  }

  @Bean
  public GenericContainer<?> minio() {
    return demarrerMinio();
  }

  /**
   * Vrai MinIO (AGPL, usage local seulement), un seul conteneur pour tous les contextes de test.
   * MinIO ne publie plus d'images communautaires sur Docker Hub ni Quay depuis fin 2025 : tag figé
   * du dernier build Bitnami, qui reste téléchargeable (Bitnami Legacy, sans mise à jour). Le
   * bucket est créé ici ; en production il est provisionné hors appli (r0-socle-5).
   */
  private static synchronized GenericContainer<?> demarrerMinio() {
    if (minioPartage == null) {
      GenericContainer<?> c =
          new GenericContainer<>("bitnamilegacy/minio:2025.7.23-debian-12-r3")
              .withEnv("MINIO_ROOT_USER", CLE_ACCES)
              .withEnv("MINIO_ROOT_PASSWORD", CLE_SECRETE)
              .withExposedPorts(9000)
              .waitingFor(Wait.forHttp("/minio/health/ready").forPort(9000));
      c.start();
      try (S3Client s3 =
          S3Client.builder()
              .endpointOverride(URI.create(point(c)))
              .region(Region.US_EAST_1)
              .credentialsProvider(
                  StaticCredentialsProvider.create(
                      AwsBasicCredentials.create(CLE_ACCES, CLE_SECRETE)))
              .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
              .build()) {
        s3.createBucket(b -> b.bucket(BUCKET));
      }
      minioPartage = c;
    }
    return minioPartage;
  }

  @Bean
  public DynamicPropertyRegistrar minioProprietes(GenericContainer<?> minio) {
    return registre -> {
      registre.add("zonumental.s3.endpoint", () -> point(minio));
      registre.add("zonumental.s3.region", () -> "us-east-1");
      registre.add("zonumental.s3.bucket", () -> BUCKET);
      registre.add("zonumental.s3.access-key", () -> CLE_ACCES);
      registre.add("zonumental.s3.secret-key", () -> CLE_SECRETE);
    };
  }

  private static String point(GenericContainer<?> minio) {
    return "http://" + minio.getHost() + ":" + minio.getMappedPort(9000);
  }
}
