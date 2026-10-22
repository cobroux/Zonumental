package fr.zonumental.catalogue;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * V7 sur une base déjà peuplée en V6 : « dernier » vaut max(numero), ou 0 si le catalogue est vide.
 */
class MigrationNumerotationTest {

  private static PostgreSQLContainer base() {
    return new PostgreSQLContainer(
        DockerImageName.parse("postgis/postgis:18-3.6").asCompatibleSubstituteFor("postgres"));
  }

  private static void migrer(PostgreSQLContainer pg, String cible) {
    Flyway.configure()
        .dataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword())
        .target(cible)
        .load()
        .migrate();
  }

  private static Connection connexion(PostgreSQLContainer pg) throws SQLException {
    return DriverManager.getConnection(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
  }

  private static int dernier(PostgreSQLContainer pg) throws SQLException {
    try (Connection c = connexion(pg);
        Statement s = c.createStatement();
        var rs = s.executeQuery("select dernier from catalogue.numerotation")) {
      assertThat(rs.next()).isTrue();
      return rs.getInt(1);
    }
  }

  @Test
  void v7_initialise_dernier_au_max_existant_ou_a_zero() throws SQLException {
    try (var peuplee = base();
        var vide = base()) {
      peuplee.start();
      vide.start();

      migrer(peuplee, "6");
      try (Connection c = connexion(peuplee);
          Statement s = c.createStatement()) {
        s.execute("insert into catalogue.ville values ('69123', 'Lyon', 10)");
        for (int n : new int[] {1, 2, 7}) {
          s.execute(
              "insert into catalogue.monument (numero, wikidata_id, nom, type, ville_code_insee,"
                  + " latitude, longitude, rarete, popularite) values ("
                  + n
                  + ", 'Q"
                  + n
                  + "', 'M', 'TOUR', '69123', 45.7, 4.8, 'COMMUN', 1)");
        }
      }
      migrer(peuplee, "7");
      assertThat(dernier(peuplee)).isEqualTo(7);

      migrer(vide, "7");
      assertThat(dernier(vide)).isZero();
    }
  }
}
