package fr.zonumental;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SocleTest {

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  @Test
  void santePubliqueSansJeton() throws Exception {
    mvc.perform(get("/api/health")).andExpect(status().isOk());
  }

  @Test
  void resteDeLApiAuthentifie() throws Exception {
    mvc.perform(get("/api/compte/moi")).andExpect(status().isUnauthorized());
  }

  @Test
  void migrationCreeSchemasEtPostgis() {
    List<String> schemas =
        jdbc.queryForList(
            "select schema_name from information_schema.schemata"
                + " where schema_name in ('compte','catalogue')",
            String.class);
    assertThat(schemas).containsExactlyInAnyOrder("compte", "catalogue");
    assertThat(jdbc.queryForObject("select postgis_version()", String.class)).startsWith("3.6");
  }
}
