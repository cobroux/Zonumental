package fr.zonumental.catalogue;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class SourceWikimediaTest {

  static final String UA = "Zonumental/0.1 (contact-projet@example.org)";
  MockRestServiceServer serveur;
  SourceWikimedia source;

  static String json(String fichier) throws IOException {
    return new ClassPathResource("wikimedia/" + fichier)
        .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
  }

  @BeforeEach
  void init() {
    RestClient.Builder builder = RestClient.builder();
    serveur = MockRestServiceServer.bindTo(builder).ignoreExpectOrder(true).build();
    source =
        new SourceWikimedia(
            builder,
            Clock.fixed(Instant.parse("2026-10-19T10:00:00Z"), ZoneOffset.UTC),
            "contact-projet@example.org",
            0);
  }

  void attendre(String debutUrl, String corps) {
    serveur
        .expect(requestTo(startsWith(debutUrl)))
        .andExpect(header(HttpHeaders.USER_AGENT, UA))
        .andRespond(withSuccess(corps, MediaType.APPLICATION_JSON));
  }

  @Test
  void construit_les_candidats_depuis_les_sources_sans_reseau_reel() throws IOException {
    attendre("https://query.wikidata.org/sparql", json("sparql.json"));
    // 12 derniers mois complets : d'octobre 2025 à septembre 2026
    attendre(
        "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/"
            + "all-access/user/Tour_Test/monthly/20251001/20260930",
        json("pageviews.json"));
    serveur
        .expect(requestTo(containsString("/user/%C3%89glise_Sans_Licence/monthly/")))
        .andRespond(withStatus(HttpStatus.NOT_FOUND));
    attendre("https://fr.wikipedia.org/api/rest_v1/page/summary/Tour_Test", json("summary.json"));
    serveur
        .expect(requestTo(containsString("/page/summary/%C3%89glise_Sans_Licence")))
        .andRespond(withStatus(HttpStatus.NOT_FOUND));
    serveur
        .expect(requestTo(containsString("titles=File:Tour%20Test.jpg")))
        .andRespond(withSuccess(json("commons-ok.json"), MediaType.APPLICATION_JSON));
    serveur
        .expect(requestTo(containsString("titles=File:Sans.jpg")))
        .andRespond(withSuccess(json("commons-sans-licence.json"), MediaType.APPLICATION_JSON));

    List<Candidat> res = source.candidats(new Quotas.Ville("Paris", "75056", 25));

    serveur.verify();
    assertThat(res).hasSize(2);
    Candidat tour = res.getFirst();
    assertThat(tour.wikidataId()).isEqualTo("Q1");
    assertThat(tour.merimeeId()).isEqualTo("PA00000001");
    assertThat(tour.nom()).isEqualTo("Tour Test");
    assertThat(tour.type()).isEqualTo(TypeMonument.TOUR);
    assertThat(tour.latitude()).isEqualTo(48.8584);
    assertThat(tour.longitude()).isEqualTo(2.2945);
    assertThat(tour.popularite()).isEqualTo(3500);
    assertThat(tour.annee()).isEqualTo(1889);
    assertThat(tour.style()).isEqualTo("Art nouveau");
    assertThat(tour.hauteurM()).isEqualByComparingTo("330");
    assertThat(tour.histoireTexte()).isEqualTo("La Tour Test est un monument de test.");
    assertThat(tour.histoireLicence()).isEqualTo("CC BY-SA 4.0");
    assertThat(tour.histoireSourceUrl()).isEqualTo("https://fr.wikipedia.org/wiki/Tour_Test");
    assertThat(tour.imageFichier()).isEqualTo("Tour Test.jpg");
    assertThat(tour.imageLicence()).isEqualTo("CC BY-SA 4.0");
    assertThat(tour.imageAuteur()).isEqualTo("Jean & Fils");
    assertThat(tour.imageSourceUrl())
        .isEqualTo("https://commons.wikimedia.org/wiki/File:Tour_Test.jpg");

    // pas de licence = pas d'image ; année de précision siècle, hauteur en cm, histoire 404 :
    // absentes
    Candidat eglise = res.get(1);
    assertThat(eglise.popularite()).isZero();
    assertThat(eglise.imageFichier()).isNull();
    assertThat(eglise.imageLicence()).isNull();
    assertThat(eglise.annee()).isNull();
    assertThat(eglise.hauteurM()).isNull();
    assertThat(eglise.histoireTexte()).isNull();
    assertThat(eglise.histoireLicence()).isNull();
  }

  @Test
  void licence_exigeant_l_attribution_sans_auteur_n_importe_pas_l_image() throws IOException {
    attendre("https://query.wikidata.org/sparql", sparqlTourSeule());
    serveur
        .expect(requestTo(containsString("/page/summary/")))
        .andRespond(withStatus(HttpStatus.NOT_FOUND));
    serveur
        .expect(requestTo(containsString("/metrics/pageviews/")))
        .andRespond(withStatus(HttpStatus.NOT_FOUND));
    attendre(
        "https://commons.wikimedia.org/w/api.php", json("commons-attribution-sans-auteur.json"));

    Candidat c = source.candidats(new Quotas.Ville("Paris", "75056", 25)).getFirst();

    assertThat(c.imageFichier()).isNull();
    assertThat(c.imageLicence()).isNull();
    assertThat(c.imageAuteur()).isNull();
  }

  static String sparqlTourSeule() {
    return """
        {"results": {"bindings": [{
          "item": {"value": "http://www.wikidata.org/entity/Q1"},
          "label": {"value": "Tour Test"},
          "merimee": {"value": "PA00000001"},
          "coord": {"value": "Point(2.2945 48.8584)"},
          "article": {"value": "https://fr.wikipedia.org/wiki/Tour_Test"},
          "image": {"value": "http://commons.wikimedia.org/wiki/Special:FilePath/Tour%20Test.jpg"},
          "types": {"value": "Q12518"}
        }]}}
        """;
  }

  @Test
  void erreur_de_source_apres_trois_essais_arrete_l_import() {
    serveur
        .expect(
            org.springframework.test.web.client.ExpectedCount.times(3),
            requestTo(startsWith("https://query.wikidata.org")))
        .andRespond(withServerError());
    assertThatThrownBy(() -> source.candidats(new Quotas.Ville("Paris", "75056", 25)))
        .isInstanceOf(IllegalStateException.class);
    serveur.verify();
  }

  @Test
  void refuse_un_contact_vide() {
    assertThatThrownBy(() -> new SourceWikimedia(RestClient.builder(), Clock.systemUTC(), " ", 0))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void telecharge_l_image_depuis_commons() {
    serveur
        .expect(
            requestTo(
                startsWith("https://commons.wikimedia.org/wiki/Special:FilePath/Tour%20Test.jpg")))
        .andExpect(header(HttpHeaders.USER_AGENT, UA))
        .andRespond(withSuccess(new byte[] {1, 2, 3}, MediaType.IMAGE_JPEG));
    Candidat c =
        new Candidat(
            "Q1",
            null,
            "n",
            TypeMonument.AUTRE,
            "1",
            0,
            0,
            0,
            null,
            null,
            null,
            null,
            null,
            null,
            "Tour Test.jpg",
            null,
            "CC0",
            null,
            null);
    assertThat(source.telechargerImage(c)).containsExactly(1, 2, 3);
  }
}
