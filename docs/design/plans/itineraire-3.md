# Plan technique — itineraire-3 (#160) : itinéraire à pied dans la carte

Contrat : `docs/api/itineraire.md` (validé). Décisions : ADR 0025, ADR 0023 (carte), ADR 0020 (position). Exécutant : `dev-frontend`, TDD.

## Fichiers (tout dans `features/carte/`, aucun dossier global)

| Fichier | Changement |
| --- | --- |
| `core/api/` | `npm run api` : régénère `fn/itineraire/calculer-itineraire.ts` et les modèles `Itineraire`, `DemandeItineraire`. Ne pas éditer à la main. |
| `fond-carte.ts` | `FondCarte` gagne `tracer(trace: Itineraire['trace']): void` (source GeoJSON `itineraire` + couche `line`, puis `fitBounds` sur la trace ; `duration: 0` si `reduit`) et `effacer(): void` (retire couche et source, idempotent). Couleur et épaisseur passées dans `OptionsFond` (lues par `lireCouleurs`). |
| `style-carte.ts` | `lireCouleurs` lit `--zn-carte-itineraire` (nouveau token, à valider par `ux-designer` ; d'ici là, `var(--zn-encre)` ou l'accent existant). Aucun hexadécimal. |
| `itineraire.ts` (+ `.spec.ts`) | Service `@Injectable()` fourni par `Carte` (pas `root`) : `calculer(numero, coords)` appelle `calculerItineraire`, expose un signal `etat` : `inactif`, `chargement`, `ok` (itinéraire), `erreur` (texte, repli). Fonction pure `messageDe(e)` (même schéma que `refusDe` de `features/monument/camera.ts`, `delai` recopié ou extrait si un troisième usage apparaît). Fonctions pures `resume(it)` (« 23 min, 1,8 km », réutiliser `formaterDistance`/`dureeAPied` de `core/position/proximite` si elles conviennent, sinon `Intl.NumberFormat('fr-FR')`) et `lienRepli(m)`. |
| `carte.ts` / `carte.css` / `carte.spec.ts` | Bouton « Itinéraire » dans le bloc `.selection`, panneau résumé + étapes, effet qui appelle `tracer`/`effacer`. |

## Interface

- Bouton « Itinéraire » dans `.selection` (fiche du monument choisi), à côté du lien « Voir la fiche ». Cible ≥ 44 px.
- Sans position (`etat.statut !== 'ok'`) : le bouton appelle d'abord `Position.activer()` (geste utilisateur, ADR 0020), puis lance le calcul quand l'état passe à `ok`. `refus`/`indisponible` : message « Active ta position pour obtenir un itinéraire » + lien de repli.
- Mention RGPD (Q-43, information sans consentement) : au premier clic de la visite, un court texte au-dessus du bouton, « Ta position arrondie (~10 m) est envoyée à notre serveur pour calculer le trajet. Elle n'est pas conservée. » + lien vers la politique de confidentialité, et bouton « Calculer ». Mémorisée dans un signal du composant seulement, **pas de `sessionStorage`** : inutile pour une mention, et `carte.spec.ts` exige déjà un stockage vide (RG-036).
- Résumé « 23 min · 1,8 km » dans un `<p role="status">` (aria-live polite), rendu une fois le calcul fini, pas pendant le chargement (pas d'annonce en double).
- Étapes : `<ol>` sous le résumé, chaque `<li>` = instruction + distance formatée. Lisible sans la carte (le tracé est décoratif, `aria-hidden` côté canevas) ; le nom accessible du bouton contient le texte visible « Itinéraire » (WCAG 2.5.3). Liste repliable (`<details>` natif) pour ne pas masquer la carte à 390 px.
- Bouton « Effacer l'itinéraire » : `effacer()`, panneau fermé, focus rendu au bouton « Itinéraire ». Changer de monument sélectionné efface aussi.
- Pas de nom de monument non capturé dans l'itinéraire (RG-054) : seul `libelleDe(s)` comme ailleurs.

## États

| Cas | Affichage |
| --- | --- |
| Chargement | bouton `aria-busy="true"`, désactivé, libellé « Calcul… » |
| 200 | tracé + résumé + étapes |
| 400 `erreurs[0].champ === 'depart'` | « Trop loin pour un trajet à pied (10 km max). » + repli |
| 404 | « Monument introuvable. » |
| 429 `limite-frequence` | « Limite de calculs atteinte. Réessaie dans N min » (`Retry-After`), sans repli (le service fonctionne) |
| 502 / 503 `indisponible` | même message « Itinéraire indisponible pour le moment. » + repli (Q-44) |
| statut 0 / `navigator.onLine === false` | « Pas de connexion. » + repli ; pas d'appel si hors ligne |
| 401 | rien (intercepteur existant ; la route a déjà `gardeConnecte`, Q-39) |

Erreurs affichées dans un `role="alert"`. Aucune valeur de position dans les messages ni dans `console`.

## Lien de repli

`https://www.openstreetmap.org/directions?engine=fossgis_valhalla_foot&route=%3B{lat}%2C{lng}` : destination seule (coordonnées du monument, `m.position`), jamais la position de l'utilisateur. `target="_blank" rel="noopener noreferrer"`, libellé « Ouvrir dans OpenStreetMap » (annonce l'ouverture externe). Dépend de Q-44 : derrière une constante, retirable en une ligne.

## Sécurité côté client

Instructions rendues par interpolation Angular uniquement (jamais `innerHTML`). La trace n'est donnée qu'à MapLibre. Position et itinéraire en mémoire seulement, effacés à la destruction du composant. La CSP ne change pas (appel `'self'`).

## Tests (TDD, écrits avant le code)

`itineraire.spec.ts`
1. `calculer` poste `{ depart: { latitude, longitude }, numero }`, passe `chargement` puis `ok`.
2. `messageDe` : 400 `depart`, 404, 429 avec et sans `Retry-After`, 502 et 503 (même texte), statut 0, 401 → null.
3. Hors ligne : aucun appel HTTP, état `erreur` « Pas de connexion ».
4. `resume` : 1380 s / 1840 m → « 23 min · 1,8 km » ; < 1 km en mètres.
5. `lienRepli` contient les coordonnées du monument et rien d'autre (pas de position utilisateur).

`carte.spec.ts` (faux `FondCarte` enrichi de `tracer`/`effacer` espionnés)
6. Le bouton « Itinéraire » n'apparaît que dans la sélection.
7. Premier clic : mention RGPD affichée, aucun appel ; « Calculer » lance l'appel ; second calcul sans mention.
8. Sans position : `Position.activer()` appelé ; refus → message + repli.
9. Succès : `tracer` reçoit la trace, résumé dans `role="status"`, `<ol>` avec N étapes.
10. « Effacer » et changement de sélection : `effacer` appelé, focus sur « Itinéraire ».
11. Erreur 503 : `role="alert"` + lien de repli ; `tracer` non appelé.
12. Stockage vide après un calcul (`localStorage` + `sessionStorage`), aucune position dans `console` (espion).

Vérification réelle : capture Playwright 390 px avec un itinéraire simulé (`page.route` sur `/api/itineraire`), et build : le paquet initial ne grossit pas.

## Maquette

Aucun écran d'itinéraire dans `docs/design/maquettes-v4-v6/` (grep « itin » vide ; `CarteV6.dc.html` est la référence). Proposition minimale ci-dessus : panneau dans le bloc `.selection` existant, mêmes tokens et typographie, ligne de tracé en un token. **Écart à signaler à `ux-designer`** : token `--zn-carte-itineraire` (couleur, épaisseur), aspect du panneau étapes, texte de la mention RGPD (avec `amoa`, Q-43).

## Risques

- Q-43 et Q-44 non tranchées : mention et lien de repli faciles à modifier (texte, constante).
- `fitBounds` limité par `maxBounds` (2.0–2.7 / 48.7–49.0) : suffisant pour 10 km autour de Paris.
- Hors périmètre (itineraire-4) : suivi en direct, recalcul, détection d'écart.
