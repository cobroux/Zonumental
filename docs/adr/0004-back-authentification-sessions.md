# ADR 0004 — Authentification : JWT 15 min, session de renouvellement en cookie, Argon2id

- **Statut :** proposé (tech-lead-back, 2026-10-19)
- **Stories :** r0-socle-6, -7, -8, -9, -10, -14
- **Règles :** RG-001, RG-004, RG-006 à RG-011

## Contexte

Cahier §4/§7 : e-mail + mot de passe via Spring Security, jeton d'accès JWT de 15 min, jeton de renouvellement en cookie `httpOnly`/`Secure`/`SameSite`, Argon2id, e-mail vérifié, limite de tentatives. Décisions client : session 30 jours d'inactivité, 5 échecs → blocage 15 min, liens 24 h (vérification) / 1 h (réinitialisation), réponses qui ne révèlent jamais l'existence d'un compte.

## Décision

**Jeton d'accès**
- JWT HS256 signé avec un secret de 256 bits (`ZONUMENTAL_JWT_SECRET`, variable d'environnement), émis par `NimbusJwtEncoder`, vérifié par le resource server Spring Security (`spring-boot-starter-oauth2-resource-server`, `NimbusJwtDecoder.withSecretKey`).
- Claims : `sub` (UUID utilisateur), `iat`, `exp` (15 min). Rien d'autre : l'état « e-mail vérifié » est lu en base au moment où il compte (capture R1), pas dans le jeton.
- Transmis en `Authorization: Bearer`, gardé **en mémoire** par le front (jamais en `localStorage`).

**Session de renouvellement**
- Jeton opaque aléatoire (256 bits, `SecureRandom`), stocké **haché SHA-256** dans `compte.session`.
- Cookie `zonumental_session` : `HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=2592000`.
- Expiration **glissante** : chaque renouvellement repousse l'expiration à +30 jours et renvoie le cookie (RG-010).
- Pas de rotation du jeton à chaque renouvellement (voir alternatives).
- Révocation : déconnexion (la session courante), réinitialisation du mot de passe et demande de suppression (toutes les sessions).
- CSRF désactivé côté Spring : toutes les routes sauf `/api/auth/*` exigent l'en-tête `Authorization` ; `/api/auth/*` sont des `POST` protégés par `SameSite=Strict` et un contrôle de l'en-tête `Origin` contre la liste CORS.

**Mots de passe (RG-006)**
- `Argon2PasswordEncoder(16, 32, 1, 19456, 2)` (paramètres minimum OWASP : m = 19 Mio, t = 2, p = 1), Bouncy Castle.
- Mot de passe normalisé Unicode NFC avant hachage (un « é » saisi sur deux claviers donne le même hash). Longueur 12 à **128** caractères.
- Connexion avec un e-mail inconnu : on calcule quand même un hash factice pour égaliser le temps de réponse.

**Liens par e-mail (RG-007, RG-011)**
- Table unique `compte.jeton` (usage `VERIFICATION_EMAIL` | `REINITIALISATION_MDP`), valeur aléatoire 256 bits hachée SHA-256, `expire_le`, `utilise_le`.
- Émettre un nouveau jeton supprime les jetons non utilisés du même usage (« seul le dernier lien est valide »). Un jeton utilisé est conservé pour répondre « lien déjà utilisé ».
- Anti-bombardement : pas de nouvel e-mail si un jeton du même usage a moins de 60 s (réponse identique).
- Lien envoyé : `https://<front>/verifier-email?jeton=…` et `/reinitialiser-mot-de-passe?jeton=…` ; en-tête `Referrer-Policy: no-referrer` côté front.

**Limitation des tentatives (RG-009)**
- Table `compte.tentative_connexion` clé = **HMAC-SHA256(secret, e-mail normalisé)** : s'applique aussi aux adresses inexistantes sans stocker d'adresse en clair.
- Compteur incrémenté atomiquement (`INSERT … ON CONFLICT DO UPDATE … RETURNING`). Au 5e échec : `bloque_jusqu_au = maintenant + 15 min`, compteur remis à 0. Un succès supprime la ligne. Tant que bloqué : `429` sans même vérifier le mot de passe.
- Lignes de plus de 24 h purgées chaque nuit (les échecs « consécutifs » s'entendent donc sur 24 h).
- Limitation par IP (inscription, mot de passe oublié, connexion) : au reverse proxy (devops), pas dans l'appli.

**Non-divulgation (RG-004, RG-008, RG-011)**
- Inscription avec un e-mail existant : même `202` que le cas nominal, aucun compte créé ; un e-mail « tu as déjà un carnet » est envoyé au titulaire (pour que le message générique reste vrai).
- Mot de passe oublié et renvoi de vérification : toujours `202`.
- Le pseudo, lui, est public : son conflit est signalé (`409 pseudo-deja-pris`, RG-005).

## Alternatives écartées

- **Rotation du jeton de renouvellement à chaque appel** avec détection de réutilisation : plus robuste au vol de cookie, mais deux onglets qui renouvellent en même temps déconnectent l'utilisateur partout ; le cookie `HttpOnly` + `SameSite=Strict` réduit déjà fortement le vol. À reconsidérer si un incident l'exige.
- **Sessions serveur classiques (cookie `JSESSIONID`)** : contraire au cahier §4.
- **RS256 / JWKS** : utile seulement si un tiers vérifie nos jetons ; ici émetteur = vérificateur.
- **jjwt** : dépendance de plus ; Nimbus est déjà apporté par Spring Security.
- **Compteur de tentatives en mémoire (Caffeine)** : perdu au redémarrage, faux en multi-instance.
- **Mot de passe requis pour supprimer le compte** : la suppression est annulable 30 jours et notifiée par e-mail ; la confirmation explicite du front suffit (à confirmer avec le front).

## Conséquences

- **Limite connue** : un jeton d'accès reste valide jusqu'à 15 min après déconnexion, réinitialisation ou demande de suppression (aucune requête en base par appel). Accepté : durée courte, pas de donnée sensible exposée en R0.
- Le secret JWT peut tourner sans déconnecter personne : les sessions de renouvellement sont opaques, le front renouvelle silencieusement.
- Front et API doivent être sur le même site (même domaine enregistrable, idéalement même origine `/api` derrière le reverse proxy) pour que `SameSite=Strict` fonctionne. Point d'accord front/devops.
- **Plus tard (Capacitor)** : un cookie sur `capacitor://localhost` ne fonctionnera pas ; à traiter à la release stores, pas avant.
- **Écart signalé** : la longueur maximale de 128 caractères et la normalisation NFC ne figurent pas dans RG-006 (protection contre le déni de service et cohérence multi-appareils).
