# ADR 0005 — Envoi des e-mails transactionnels

- **Statut :** proposé (tech-lead-back, 2026-10-19)
- **Stories :** r0-socle-5, -6, -7, -10, -14, -15

## Contexte

R0 envoie uniquement des e-mails indispensables : vérification, renvoi, « tu as déjà un carnet », réinitialisation, confirmation de suppression, avertissement d'inactivité. Le fournisseur doit être dans l'UE (§7) et n'est pas encore choisi (hébergeur ouvert, §11). Les environnements de test doivent avoir une boîte consultable (r0-socle-5).

## Décision

- **L'abstraction est SMTP** : `spring-boot-starter-mail` + `JavaMailSender`. Tout fournisseur UE (Brevo, Mailjet, Scaleway TEM…) expose SMTP ; changer de fournisseur = changer 4 variables d'environnement (`SPRING_MAIL_HOST/PORT/USERNAME/PASSWORD`).
- Une seule classe `Courriels` dans `fr.zonumental.compte.courriel`, une méthode par e-mail, textes **en texte brut** dans `src/main/resources/courriels/*.txt` (substitution `String.formatted`). Pas de moteur de templates.
- **Envoi après commit et asynchrone** (`@Async`) : un e-mail ne part jamais pour une transaction annulée, la latence SMTP ne pèse pas sur la réponse et le temps de réponse reste identique que l'adresse existe ou non. Les jetons ne transitent jamais par un événement persisté.
- Un échec SMTP est journalisé (sans l'adresse) ; l'utilisateur dispose toujours d'un « renvoyer ».
- Local et environnement de recette : **Mailpit** (SMTP + interface web), conteneur fourni par devops.
- Le consentement « e-mails » (RG-012) ne filtre que les e-mails non indispensables : il n'y en a aucun en R0.

## Alternatives écartées

- **API HTTP propriétaire d'un fournisseur** (SDK Brevo…) : enferme dans un fournisseur pour un gain nul en R0.
- **Interface `EnvoiEmail` maison + adaptateurs** : `JavaMailSender` est déjà l'interface.
- **Thymeleaf / e-mails HTML stylés** : non demandé ; pourra venir avec le design system si l'UX le réclame.
- **Outbox / registre d'événements pour garantir l'envoi** : sur-dimensionné ; tous ces e-mails sont redemandables.

## Conséquences

- Choix du fournisseur SMTP UE : décision client/devops avec l'hébergeur ; contrat de sous-traitance RGPD (amoa, registre).
- Tests : `JavaMailSender` remplacé par un bouchon qui capture les messages (`@MockitoBean`), pour lire le lien et le rejouer.
