package fr.zonumental.capture;

import static org.assertj.core.api.Assertions.assertThat;

import fr.zonumental.TestcontainersConfiguration;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

/** Limite de 10 Mo du conteneur, sur un vrai serveur HTTP : 422 image-invalide (RG-051). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class CapturerGrosFichierTest {

  @LocalServerPort int port;
  @Autowired JdbcTemplate jdbc;
  @Autowired JwtEncoder encodeur;

  @Test
  void fichier_de_plus_de_10_mo_422_image_invalide() throws Exception {
    UUID moi = UUID.randomUUID();
    jdbc.update(
        "insert into compte.utilisateur (id, email, pseudo, mot_de_passe_hash, date_naissance,"
            + " email_verifie_le, cree_le, derniere_activite_le) values (?, ?, ?, 'x',"
            + " '2000-01-01', ?, now(), now())",
        moi,
        moi + "@exemple.fr",
        "gros" + moi.toString().substring(0, 8),
        Timestamp.from(Instant.now()));
    String jeton =
        encodeur
            .encode(
                JwtEncoderParameters.from(
                    JwsHeader.with(MacAlgorithm.HS256).build(),
                    JwtClaimsSet.builder()
                        .subject(moi.toString())
                        .issuedAt(Instant.now())
                        .expiresAt(Instant.now().plusSeconds(600))
                        .build()))
            .getTokenValue();
    String b = "frontiere";
    var corps = new ByteArrayOutputStream();
    for (String[] p :
        new String[][] {
          {"numero", "1"}, {"latitude", "45"}, {"longitude", "4"}, {"precisionMetres", "5"}
        }) {
      corps.write(
          ("--"
                  + b
                  + "\r\nContent-Disposition: form-data; name=\""
                  + p[0]
                  + "\"\r\n\r\n"
                  + p[1]
                  + "\r\n")
              .getBytes());
    }
    corps.write(
        ("--"
                + b
                + "\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"p.jpg\"\r\n"
                + "Content-Type: image/jpeg\r\n\r\n")
            .getBytes());
    corps.write(new byte[10 * 1024 * 1024 + 1024]);
    corps.write(("\r\n--" + b + "--\r\n").getBytes());

    HttpResponse<String> r =
        HttpClient.newHttpClient()
            .send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/captures"))
                    .header("Authorization", "Bearer " + jeton)
                    .header("Content-Type", "multipart/form-data; boundary=" + b)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(corps.toByteArray()))
                    .build(),
                HttpResponse.BodyHandlers.ofString());
    assertThat(r.statusCode()).isEqualTo(422);
    assertThat(r.body()).contains("\"code\":\"image-invalide\"");
  }
}
