# ADR 0020 — Front : position de l'explorateur et proximité des monuments

- **Statut :** accepté
- **Date :** 2026-11-06
- **Story :** r1-capturer-9 (#35)

## Contexte

La barre de navigation (bouton Tamponner, RG-025) et l'écran Tamponner (liste à moins de 2 km, RG-024) ont besoin de la même position et du même catalogue (~120 monuments, `GET /api/catalogue/monuments`, sans pagination, avec `captureeLe`). Il n'y a pas d'endpoint de proximité : le calcul se fait sur l'appareil. La décision de capture reste au serveur (RG-029). L'ADR 0013 prévoit de mettre la position dans `core/` après un ADR court.

## Décision

**Service de position : `core/position/position.ts`** (`providedIn: 'root'`)
- Expose un seul signal en lecture seule `etat` : `{ statut: 'attente' | 'refus' | 'indisponible' | 'ok', coords?: { latitude, longitude, precision } }`.
- `navigator.geolocation.watchPosition`, options `{ enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 }`. La haute précision est nécessaire : au-delà de 100 m, la capture est refusée (RG-031).
- **Pas de demande système hors explication (r0-socle-17)** : au démarrage, `navigator.permissions.query({ name: 'geolocation' })`. Si `granted`, le suivi démarre. Si `prompt` (ou si l'API manque), le statut reste `attente` jusqu'à `activer()`, appelé uniquement par un bouton de l'écran Tamponner. Si `denied`, le statut passe à `refus`.
- **Batterie** : le suivi tourne seulement quand la page est visible. Sur `visibilitychange` à `hidden` : `clearWatch` et `coords` remis à `undefined`. Au retour à `visible`, le suivi reprend. On n'utilise pas de minuterie ni d'interrogation régulière : `watchPosition` ne notifie qu'en cas de déplacement.
- **Fraîcheur** : la mise à zéro à la mise en arrière-plan suffit. Pendant que la page est visible, la dernière position reçue reste valable, puisque le navigateur notifie chaque mouvement. On n'ajoute pas d'horloge.
- **RGPD (RG-036)** : la position n'existe qu'en mémoire. Jamais `localStorage`, IndexedDB, URL ni journal. Elle n'est envoyée qu'au `POST` de capture, qui relit sa propre position au moment de la photo (RG-027). Elle n'est pas reprise depuis ce signal.
- Erreurs : `PERMISSION_DENIED` donne `refus`. `POSITION_UNAVAILABLE`, `TIMEOUT` et l'absence de `navigator.geolocation` donnent `indisponible`. Aucune exception ne remonte.

**Proximité : `core/position/proximite.ts`** (`providedIn: 'root'`)
- `httpResource` sur `listerMonuments`, actif seulement si `Session.connecte()`. `recharger()` est exposé et sera appelé après une capture (r1-capturer-2).
- Des `computed` calculent `proches` (distance < 2000 m, tri croissant, avec `capture` = `captureeLe !== null`) et `bouton` (état RG-025). Le calcul se fait dans des fonctions pures du même fichier (`distanceMetres` en haversine, `etatBouton`), testées sans TestBed.
- Lus par `ZnNavigation` (shared/ui) et par `features/tamponner`. C'est un état transverse, donc il va dans `core/` (ADR 0013), pas dans `providers` de route.

**Dégradation si la précision est mauvaise** (seuil RG-031 : `precision > 100` ou absente)
- La liste reste affichée avec ses distances, sous un message « Signal trop faible, réessaie à découvert ».
- Le bouton n'a jamais le halo vert : il prend l'état `imprecis` (bordeaux, texte « Signal faible »). On n'accepte jamais une précision mauvaise faute de mieux (RG-047). On n'ajoute pas de marge de précision à la distance (RG-032).

**États du bouton** (le texte porte toujours l'état, pas seulement la couleur)

| État | Condition | Rendu |
| --- | --- | --- |
| `sans-position` | statut ≠ `ok` | gris, « Position » |
| `loin` | aucun monument < 2 km | gris, « > 2 km » |
| `deja` | des monuments < 2 km, tous capturés | gris, « Déjà tamponné ici », sans halo |
| `proche` | le monument non capturé le plus proche est hors de son rayon | bordeaux, « 420 m » |
| `imprecis` | il est dans son rayon mais la précision est > 100 m | bordeaux, « Signal faible » |
| `zone` | il est dans son rayon (≤ `rayonCaptureMetres`) et la précision est ≤ 100 m | halo vert, « Tamponner » |

Affichage de la distance : arrondie à 10 m sous 1 km (« 420 m »), sinon en km avec une décimale (« 1,2 km »).

## Alternatives écartées

- **`getCurrentPosition` toutes les N secondes** : la batterie est réveillée même à l'arrêt, et c'est moins réactif.
- **`enableHighAccuracy: false`** : on n'obtient souvent qu'une position Wi-Fi ou cellulaire à plus de 100 m, donc le halo ne s'allumerait jamais.
- **Endpoint de proximité côté serveur** : il enverrait la position en continu au serveur, ce que RG-036 interdit.
- **Service fourni par les routes `tamponner`** : la barre de navigation est hors de ces routes.

## Conséquences

- Le client d'API doit être régénéré (`npm run api`) : `captureeLe` n'est pas encore dans `MonumentResume` côté front.
- Le mode avion n'affecte que le catalogue : l'erreur de `httpResource` donne « Pas de connexion. Réessayer » (`recharger()`). Le GPS peut continuer à fonctionner.
- Capacitor (ADR 0011) : on remplacera `navigator.geolocation` par `@capacitor/geolocation` derrière le même signal, sans toucher aux écrans.
