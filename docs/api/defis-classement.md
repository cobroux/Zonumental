# Contrat API — Défis et classement (proposé)

- **Statut :** §3 implémenté (defis-2, `openapi.yaml`) ; reste proposé par tech-lead-back le 2026-11-20 ; à valider par tech-lead-front. Une fois validé, dev-backend le reporte dans `openapi.yaml` (tag `competition`) dans la story d'implémentation.
- **Décisions :** ADR 0024. **Stories :** #133 (fidelite-22), #134 (fidelite-23), defis-2 (classement actif, à créer).
- Conventions existantes : Bearer obligatoire (401 `non-authentifie`), erreurs RFC 9457 (`Probleme`, `code` stable), dates ISO 8601 UTC, semaine = lundi 00:00 → lundi 00:00 heure de Paris.

## 1. `GET /api/defis/courant` — operationId `defiCourant` (#133)

200 dans tous les cas (état vide = `defi: null`, pas une erreur).

```json
{
  "defi": {
    "code": "TROIS_DOMES",
    "nom": "Les trois dômes",
    "description": "Panthéon, Sacré-Cœur et Invalides.",
    "saison": "Saison d'automne",
    "semaine": 7,
    "debutLe": "2026-11-15T23:00:00Z",
    "finLe": "2026-11-22T23:00:00Z",
    "seuil": 3,
    "valeur": 2,
    "reussi": false,
    "recompense": { "code": "DEFI_TROIS_DOMES", "libelle": "Tampon doré" },
    "pastilles": [
      { "libelle": "Panthéon", "faite": true },
      { "libelle": "Sacré-Cœur", "faite": true },
      { "libelle": "Invalides", "faite": false }
    ]
  }
}
```

| Champ | Règle |
| --- | --- |
| `finLe` | Le minuteur (« FIN DANS 3 J 04 H ») est calculé par le front ; à 0 il relit l'endpoint. |
| `valeur` | `CAPTURES` : captures de l'appelant avec `capturee_le ∈ [debutLe, finLe)` répondant au critère. `MONUMENTS` : monuments de la liste capturés avant `finLe`, même avant la semaine (RG-034 interdit de recapturer ; Q-30). Plafonnée à `seuil`. |
| `reussi` | `valeur >= seuil`. |
| `pastilles` | Toujours `seuil` éléments. Critère `MONUMENTS` : un par monument, dans l'ordre de la config, libellé = nom du monument. Critère `CAPTURES` : nom des monuments comptés dans l'ordre de capture, puis `libelle: null` pour les pastilles non faites (le « ? » est un rendu front). |
| `description`, `recompense` | Jamais nuls. |
| `saison`, `semaine` | Lus dans la config (pas calculés). |

Mise à jour après capture : le front relit `defiCourant` après une `CaptureReussie` (pas de champ ajouté à `CaptureReussie` pour #133).

Erreurs : 401 uniquement.

Configuration `competition/defis.yml` (dev-backend) :

```yaml
defis:
  - { code: PREMIERS_PAS, nom: "Premiers pas", description: "3 tampons cette semaine, où tu veux.",
      saison: "Saison d'automne", semaine: 1, debut: 2026-10-05, fin: 2026-10-12,
      critere: CAPTURES, seuil: 3, recompense: "Badge Pionnier" }
  - { code: TROIS_DOMES, nom: "Les trois dômes", description: "Panthéon, Sacré-Cœur et Invalides.",
      saison: "Saison d'automne", semaine: 7, debut: 2026-11-16, fin: 2026-11-23,
      critere: MONUMENTS, monuments: [12, 31, 7], recompense: "Tampon doré" }
```
`debut`/`fin` = dates locales Paris (fin exclusive). `CAPTURES` accepte `ville`, `type`, `rarete` en filtre optionnel ; `MONUMENTS` : `seuil` = taille de la liste.

## 2. `GET /api/classement/villes/{codeInsee}/lancement` — operationId `lancementClassementVille` (#134)

```json
{
  "ville": { "codeInsee": "75056", "nom": "Paris" },
  "seuil": 50,
  "explorateurs": 23,
  "ouvert": false,
  "consentementClassement": false,
  "moi": { "tampons": 1 }
}
```

| Champ | Règle |
| --- | --- |
| `explorateurs` | Comptes classables (dernier consentement `CLASSEMENT` accordé, e-mail vérifié, pas de suppression demandée) ayant au moins 1 capture dans la ville, toutes périodes. Plafonné à `seuil` (le front affiche « N/50 »). |
| `ouvert` | `explorateurs >= seuil`. Persistance « reste ouverte » : defis-2. |
| `consentementClassement` | Consentement de l'appelant, pour la mention de confidentialité et le lien « Réglages » (→ Profil). |
| `moi.tampons` | Captures de l'appelant cette semaine (toutes villes) : ligne « Toi » de la portée Amis en attendant les amis. |

Erreurs : 401 ; 404 `introuvable` si la ville n'existe pas dans `catalogue.ville`.

« Inviter des amis » : partage natif (`navigator.share`, repli copie du lien) de l'URL publique de l'appli. Aucun endpoint (pas de parrainage, Q-34).

## 3. Implémenté (defis-2) — operationId `classement` : `GET /api/classement?portee=VILLE&ville=75056` | `portee=FRANCE`

```json
{
  "portee": "VILLE",
  "ville": { "codeInsee": "75056", "nom": "Paris" },
  "semaineDebutLe": "2026-11-15T23:00:00Z",
  "ouvert": true,
  "podium": [ { "rang": 1, "pseudo": "lea_voyage", "score": 18, "tendance": 0, "moi": false } ],
  "autourDeMoi": [
    { "rang": 11, "pseudo": "hugo_l", "score": 9, "tendance": 2, "moi": false },
    { "rang": 12, "pseudo": "enzo", "score": 9, "tendance": 4, "moi": true },
    { "rang": 13, "pseudo": "ines_p", "score": 8, "tendance": -3, "moi": false }
  ]
}
```

- Score = captures de la semaine dans la portée. Rang = `row_number()` score décroissant puis dernière capture comptée croissante.
- `tendance` = rang final semaine précédente − rang actuel ; `null` si non classé la semaine précédente (front : « = » pour 0, « +n », « −n »).
- `podium` ≤ 3 ; `autourDeMoi` = rang−1..rang+1 sans doublon avec le podium, vide si l'appelant classable n'a pas de score. Front : « ··· » si `autourDeMoi[0].rang > 4`.
- Appelant sans consentement : `podium` visible, `autourDeMoi` = sa seule ligne avec `rang: null`, `tendance: null`, `moi: true` (même sans capture : `score: 0`).
- `ouvert: false` → `podium` et `autourDeMoi` vides (le front affiche l'état de lancement).
- `portee=AMIS` : 400 `validation` tant que le système d'amis n'existe pas.
- Pas de pagination, pas d'UUID, ni niveau ni quartier (ADR 0024 §7).

## 4. Données, migrations

| Besoin | Source |
| --- | --- |
| Progression du défi, pastilles | Dérivé : `capture.capture` × `catalogue.monument` × `defis.yml` |
| Récompense obtenue | `progression.succes_obtenu` code `DEFI_<code>` (story dédiée) |
| Compteur d'explorateurs, score, rang, tendance | Dérivé : `capture.capture` × dernier `compte.consentement` `CLASSEMENT` × `compte.utilisateur` |
| Ville restée ouverte | Nouvelle : `competition.ville_ouverte` (defis-2) |
| Amis, invitations | Nouvelles : `competition.invitation`, `competition.amitie` (contrat séparé) |

Migrations : `V11__capture_index_date.sql` (écrite) ; `V12__competition.sql` (schéma `competition`, `ville_ouverte`, écrite avec defis-2).

RGPD : #133 et #134 n'ajoutent aucune donnée personnelle stockée. Export et effacement inchangés (récompense déjà couverte par `succes_obtenu`).

## 5. Questions client ouvertes (défaut appliqué au contrat)

| N° | Question | Défaut |
| --- | --- | --- |
| Q-30 | Défi à monuments nommés : une capture antérieure à la semaine compte-t-elle ? | Oui (RG-034 interdit de recapturer) |
| Q-31 | Les « 50 explorateurs » : seulement ceux qui ont accepté le classement ? | Oui |
| Q-32 | Tendance : par rapport à quoi ? | Rang final de la semaine précédente |
| Q-33 | France : seuil d'ouverture ? | « Bientôt » (D6) ; puis même seuil 50 |
| Q-34 | Invitation : simple lien ou parrainage suivi ? | Simple lien, aucun suivi |
| Q-35 | Lignes de la maquette « Niveau 22 · Marais » | Retirés (XP en R5 ; quartier = localisation) ; remplacés par « N tampons » |
| Q-36 | Quelle ville pour l'appelant ? | Paris seule (D6) |
| Q-37 | Qui écrit le calendrier des défis ? | PO/amoa fournit `defis.yml` par saison ; aucun défi = état vide |
| Q-38 | Score du classement | Nombre de tampons de la semaine, sans pondération par rareté |
