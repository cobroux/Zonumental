package fr.zonumental.catalogue;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpServer;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

/** Serveur local lent (boucle locale uniquement) : aucun appel réseau réel. */
class DelaisHttpTest {

  @Test
  void le_delai_de_lecture_est_applique() throws Exception {
    HttpServer lent =
        HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
    lent.createContext(
        "/",
        ex -> {
          try {
            Thread.sleep(1500);
          } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
          }
          ex.sendResponseHeaders(200, -1);
          ex.close();
        });
    lent.start();
    try {
      RestClient client =
          RestClient.builder()
              .requestFactory(
                  SourceWikimedia.fabrique(Duration.ofSeconds(2), Duration.ofMillis(200)))
              .build();
      String url = "http://127.0.0.1:" + lent.getAddress().getPort() + "/";
      assertThatThrownBy(() -> client.get().uri(url).retrieve().body(String.class))
          .isInstanceOf(org.springframework.web.client.ResourceAccessException.class);
    } finally {
      lent.stop(0);
    }
  }
}
