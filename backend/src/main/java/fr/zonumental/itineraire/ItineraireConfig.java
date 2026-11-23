package fr.zonumental.itineraire;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
class ItineraireConfig {

  @Bean
  ClientValhalla clientValhalla(
      // Défaut : instance publique de démonstration, DÉVELOPPEMENT seulement (ADR 0025).
      @Value("${zonumental.itineraire.url:https://valhalla1.openstreetmap.de}") String url,
      @Value("${zonumental.itineraire.connexion-timeout:2s}") Duration connexion,
      @Value("${zonumental.itineraire.lecture-timeout:5s}") Duration lecture) {
    var fabrique =
        new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(connexion).build());
    fabrique.setReadTimeout(lecture);
    return new ClientValhalla(RestClient.builder().baseUrl(url).requestFactory(fabrique).build());
  }

  @Bean
  QuotaItineraire quotaItineraire(
      Clock horloge,
      @Value("${zonumental.itineraire.quota-max:30}") int max,
      @Value("${zonumental.itineraire.quota-fenetre:1h}") Duration fenetre) {
    return new QuotaItineraire(horloge, max, fenetre);
  }
}
