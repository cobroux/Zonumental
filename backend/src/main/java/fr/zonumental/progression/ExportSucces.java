package fr.zonumental.progression;

import fr.zonumental.compte.SuccesExportables;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Fournit à l'export du compte ses succès obtenus (RG-013). */
@Component
class ExportSucces implements SuccesExportables {

  private final JdbcClient jdbc;

  ExportSucces(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public List<Succes> succes(UUID utilisateur) {
    return jdbc.sql(
            "select code, obtenu_le from progression.succes_obtenu where utilisateur_id = ?"
                + " order by obtenu_le, code")
        .param(utilisateur)
        .query(
            (r, i) ->
                new Succes(r.getString("code"), r.getObject("obtenu_le", OffsetDateTime.class)))
        .list();
  }
}
