package fr.zonumental.competition.defi;

import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Avertit (sans bloquer) si un défi référence un monument absent ou si un défi obtenu a disparu.
 */
@Component
class ControleDefis implements ApplicationRunner {

  private static final Logger LOG = LoggerFactory.getLogger(ControleDefis.class);

  private final CatalogueDefis catalogue;
  private final JdbcClient jdbc;

  ControleDefis(CatalogueDefis catalogue, JdbcClient jdbc) {
    this.catalogue = catalogue;
    this.jdbc = jdbc;
  }

  @Override
  public void run(ApplicationArguments args) {
    try {
      incoherences().forEach(LOG::warn);
    } catch (RuntimeException e) {
      LOG.warn("contrôle de defis.yml impossible : {}", e.getMessage());
    }
  }

  List<String> incoherences() {
    List<String> res = new ArrayList<>();
    for (var d : catalogue.defis()) {
      if (d.monuments().isEmpty()) {
        continue;
      }
      List<Integer> connus =
          jdbc.sql("select numero from catalogue.monument where numero in (:n)")
              .param("n", d.monuments())
              .query(Integer.class)
              .list();
      d.monuments().stream()
          .filter(n -> !connus.contains(n))
          .forEach(
              n -> res.add("defis.yml : défi " + d.code() + " référence le monument inconnu " + n));
    }
    List<String> codes = catalogue.defis().stream().map(d -> "DEFI_" + d.code()).toList();
    jdbc
        .sql("select distinct code from progression.succes_obtenu where code like 'DEFI\\_%'")
        .query(String.class)
        .list()
        .stream()
        .filter(c -> !codes.contains(c))
        .forEach(c -> res.add("defis.yml : le défi obtenu " + c + " a disparu du fichier"));
    return res;
  }
}
