package fr.zonumental.itineraire;

import fr.zonumental.commun.ErreurMetier;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;

/**
 * Fenêtre glissante par compte, en mémoire : rien en base (RG-036, ADR 0025). Le compteur de
 * r0-socle-9 est en base et par e-mail : non réutilisable ici.
 */
// shortcut: compteur par instance et perdu au redémarrage ; passer à un stockage partagé si le
// backend est répliqué.
class QuotaItineraire {

  private final Map<UUID, ArrayDeque<Instant>> appels = new ConcurrentHashMap<>();
  private final Clock horloge;
  private final int max;
  private final Duration fenetre;

  QuotaItineraire(Clock horloge, int max, Duration fenetre) {
    this.horloge = horloge;
    this.max = max;
    this.fenetre = fenetre;
  }

  /** Consomme un calcul ; 429 avec {@code Retry-After} si le quota de la fenêtre est atteint. */
  void consommer(UUID compte) {
    Instant maintenant = horloge.instant();
    ArrayDeque<Instant> file = appels.computeIfAbsent(compte, c -> new ArrayDeque<>());
    synchronized (file) {
      while (!file.isEmpty() && !file.peekFirst().plus(fenetre).isAfter(maintenant)) {
        file.pollFirst();
      }
      if (file.size() >= max) {
        long secondes =
            Math.max(1, Duration.between(maintenant, file.peekFirst().plus(fenetre)).toSeconds());
        throw new ErreurMetier(
            HttpStatus.TOO_MANY_REQUESTS,
            "limite-frequence",
            Map.of(),
            Map.of("Retry-After", Long.toString(secondes)));
      }
      file.addLast(maintenant);
    }
  }
}
