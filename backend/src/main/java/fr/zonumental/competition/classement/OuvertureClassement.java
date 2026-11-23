package fr.zonumental.competition.classement;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Comptes classables et seuil d'ouverture (ADR 0024 §6 et §8). */
@Component
class OuvertureClassement {

  /** Dernier consentement CLASSEMENT accordé (journal en ajout seul, ADR 0008). */
  static final String CLASSABLE =
      "u.email_verifie_le is not null and u.suppression_demandee_le is null and coalesce("
          + "(select c.accorde from compte.consentement c where c.utilisateur_id = u.id"
          + " and c.type = 'CLASSEMENT' order by c.horodatage desc, c.id desc limit 1), false)";

  private final JdbcClient jdbc;
  private final int seuil;

  OuvertureClassement(
      JdbcClient jdbc, @Value("${zonumental.classement.seuil-ville:50}") int seuil) {
    this.jdbc = jdbc;
    this.seuil = seuil;
  }

  int seuil() {
    return seuil;
  }

  /** Explorateurs classables ayant une capture dans la ville ({@code null} : toute la France). */
  int explorateurs(String codeInsee) {
    return jdbc.sql(
            "select count(*) from compte.utilisateur u where "
                + CLASSABLE
                + " and exists (select 1 from capture.capture c"
                + " join catalogue.monument m on m.numero = c.numero_monument"
                + " where c.utilisateur_id = u.id"
                + " and (cast(:c as text) is null or m.ville_code_insee = :c))")
        .param("c", codeInsee)
        .query(Integer.class)
        .single();
  }

  /** Ouverte si déjà enregistrée ou si le seuil est atteint (alors enregistrée). */
  boolean ouverte(String codeInsee, int explorateurs) {
    if (codeInsee == null) {
      return explorateurs >= seuil;
    }
    if (jdbc.sql("select count(*) from competition.ville_ouverte where ville_code_insee = :c")
            .param("c", codeInsee)
            .query(Integer.class)
            .single()
        > 0) {
      return true;
    }
    if (explorateurs < seuil) {
      return false;
    }
    jdbc.sql("insert into competition.ville_ouverte values (:c, now()) on conflict do nothing")
        .param("c", codeInsee)
        .update();
    return true;
  }
}
