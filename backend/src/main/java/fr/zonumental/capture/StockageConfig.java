package fr.zonumental.capture;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

/** Client S3 vers tout fournisseur compatible : endpoint et clés viennent de l'environnement. */
@Configuration
class StockageConfig {

  @Bean(destroyMethod = "close")
  S3Client s3(
      @Value("${zonumental.s3.endpoint}") String endpoint,
      @Value("${zonumental.s3.region}") String region,
      @Value("${zonumental.s3.access-key}") String cleAcces,
      @Value("${zonumental.s3.secret-key}") String cleSecrete) {
    return S3Client.builder()
        .httpClient(UrlConnectionHttpClient.create())
        .endpointOverride(URI.create(endpoint))
        .region(Region.of(region))
        .credentialsProvider(
            StaticCredentialsProvider.create(AwsBasicCredentials.create(cleAcces, cleSecrete)))
        .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
        .build();
  }
}
