# ADR 0009 — Observabilité minimale et format d'erreur unique

- **Statut :** proposé (tech-lead-back, 2026-10-19)
- **Stories :** r0-socle-1, -4, -5 (et toutes les stories d'API)

## Contexte

Il faut un endpoint de santé public (r0-socle-1), des journaux exploitables sans fuite de données personnelles (§7), et un format d'erreur unique que le client Angular généré sache traiter (§4). Pas d'outil de monitoring choisi (hébergeur ouvert).

## Décision

**Format d'erreur : Problem Details (RFC 9457)**, `Content-Type: application/problem+json`, via `ProblemDetail` de Spring (`spring.mvc.problemdetails.enabled=true`) et un `@RestControllerAdvice` dans `fr.zonumental.commun` :
```json
{
  "type": "https://zonumental.fr/erreurs/pseudo-deja-pris",
  "title": "Pseudo déjà pris",
  "status": 409,
  "detail": "Ce pseudo est déjà utilisé.",
  "instance": "/api/compte/inscription",
  "code": "pseudo-deja-pris",
  "erreurs": [ { "champ": "pseudo", "code": "deja-pris", "message": "…" } ]
}
```
- `code` (kebab-case, stable) est **le seul champ sur lequel le front s'appuie** ; les textes affichés (ton, tutoiement) sont côté front. `erreurs` n'existe que pour la validation (`400 validation`), une entrée par champ.
- Les exceptions métier héritent de `ErreurMetier(code, status)` ; une erreur inattendue donne `500 erreur-interne` sans détail technique, journalisée avec sa pile.
- Les erreurs Spring Security (401/403) sortent au même format.
- Codes R0 : `validation`, `age-minimum`, `consentement-obligatoire`, `version-texte-obsolete`, `pseudo-deja-pris`, `jeton-invalide`, `jeton-expire`, `jeton-deja-utilise`, `identifiants-invalides`, `connexion-bloquee`, `suppression-en-cours`, `session-expiree`, `non-authentifie`, `introuvable`, `erreur-interne`.

**Observabilité**
- Actuator : seul `health` exposé (`/api/health`, plus `/liveness` et `/readiness`), public, sans détails.
- Journaux **JSON structurés** natifs de Boot (`logging.structured.format.console=ecs`) sur la sortie standard ; collecte par la plateforme.
- Aucune journalisation des corps de requête ; règles de données personnelles de l'ADR 0008.
- Une ligne de synthèse par import de catalogue et par exécution de tâche planifiée (comptes traités, erreurs).

## Alternatives écartées

- **Format d'erreur maison** : RFC 9457 est standard, natif dans Spring et décrit en OpenAPI.
- **Messages utilisateur rédigés par le backend** : le ton et l'i18n relèvent du front.
- **Prometheus / traces distribuées (Micrometer Tracing, OpenTelemetry)** : pas d'outil cible choisi, un seul service ; à ajouter quand l'hébergeur et le monitoring seront décidés (devops).

## Conséquences

- Le contrat OpenAPI déclare un schéma `Probleme` réutilisé par toutes les réponses d'erreur.
- springdoc doit exposer `/api/health` dans le contrat (`springdoc.show-actuator=true`, filtré sur `health`) pour que le front l'appelle via le client généré (r0-socle-4).
- `/v3/api-docs` et Swagger UI désactivés en production (`springdoc.api-docs.enabled=false` par profil).


## Révision (2026-10-19, réconciliation front/back)

- Actuator est servi sous `/api` (`management.endpoints.web.base-path=/api`), donc la santé est `/api/health` : joignable par le front derrière le même reverse proxy, sans règle supplémentaire.
