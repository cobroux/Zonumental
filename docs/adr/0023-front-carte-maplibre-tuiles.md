# ADR 0023 — Front : carte Paris avec MapLibre GL JS, tuiles OpenFreeMap puis PMTiles

- **Statut :** accepté
- **Date :** 2026-11-16
- **Stories :** fidelite-20 (#131), fidelite-21 (#132)
- **Complète :** ADR 0015 (CSP), ADR 0020 (position), ADR 0022 (tampons)

## Contexte

`/carte` affiche `Bientot`. La maquette de référence est `docs/design/maquettes-v4-v6/CarteV6.dc.html` (`Carte-Paris.dc.html` est vide). Elle montre un plan sans libellés (papier, rues en deux gris, Seine), un brouillard (`rect` papier à 94 % masqué par des cercles flous r = 62 px autour des tampons), des épingles (tampon encré si obtenu, rond + numéro sinon), une bascule Paris/France et une pastille « Paris dévoilé à N % ». Les données existent déjà : `GET /api/catalogue/monuments` renvoie `position` et `captureeLe` pour chaque monument (~120), et `Proximite` (ADR 0020) le charge. Aucun nouveau backend n'est nécessaire. Le paquet initial dépasse déjà l'avertissement (315 kB pour 300 kB).

L'utilisateur a validé le choix d'une vraie carte vectorielle plutôt qu'un SVG statique.

## Décision

1. **MapLibre GL JS** (BSD-3), chargé par `import('maplibre-gl')` dans `features/carte` seulement. Il n'entre jamais dans le paquet initial. Pas de wrapper Angular tiers.
2. **Style JSON maison, sans libellés, sans glyphes ni sprites**. Le style est produit par une fonction pure `styleCarte(couleurs)` : les couleurs sont lues dans `tokens.css` via `getComputedStyle` (une seule source, aucun hexadécimal dans le code). Les nouvelles couleurs (rues, Seine, fond) deviennent des tokens validés par `ux-designer`. Si des libellés sont ajoutés un jour, les glyphes PBF sont auto-hébergés (`font-src`/`connect-src 'self'`, RGPD).
3. **Tuiles** : OpenFreeMap (schéma OpenMapTiles) en développement. Cible de production : un fichier **PMTiles** d'extrait Paris, servi par notre origine et lu via le protocole `pmtiles` (BSD-3). La bascule se fait avec le déploiement (#5, #21). Elle ne change qu'une URL de source.
4. **Brouillard et épingles dans un calque Angular au-dessus du canevas**, pas en couches MapLibre ni en `maplibregl.Marker`. Positions = `map.project([lng, lat])`, recalculées sur l'événement `move` et stockées dans un signal. Le brouillard est un SVG avec `<mask>` : `rect` blanc, cercles noirs floutés (`feGaussianBlur`). Le rayon vaut 62 px au zoom initial et est multiplié par `2^(zoom − zoomInitial)`. Les épingles réutilisent `zn-tampon` (ADR 0022, filtre `#zn-encre`). Un seul mécanisme de projection, des templates Angular testables, des liens focusables.
5. **Interface minimale de la carte** (`FondCarte` : `project`, `getZoom`, `on`, `remove`) fournie par un `InjectionToken`. En test unitaire, on fournit un faux sans WebGL. Le rendu réel est vérifié par une capture Playwright à 390 px.
6. **Attribution** : `attributionControl: false`, remplacé par notre propre mention, toujours visible : « © OpenStreetMap contributors » (lien vers la licence ODbL) et « OpenFreeMap » / « OpenMapTiles ». Seules les règles CSS MapLibre nécessaires sont reprises dans `carte.css` (budget `anyComponentStyle` de 6 kB). `maplibre-gl.css` n'est pas importé en entier.
7. **CSP (amende ADR 0015)** : on utilise le build CSP de MapLibre (`setWorkerUrl` vers un worker copié dans nos assets) : `worker-src 'self'`, sans `blob:`. `connect-src` : `'self'` en production (PMTiles), plus `https://tiles.openfreemap.org` en développement seulement. Avec `require-trusted-types-for 'script'`, le `new Worker(url)` exige un `TrustedScriptURL`. On ajoute une politique `maplibre` limitée à l'URL exacte du worker. Si MapLibre ne permet pas de l'injecter, on passe par une politique `default` qui n'accepte que cette URL.
8. **RGPD et règles** : la position n'est jamais stockée ni mise dans l'URL (RG-036). L'état de la carte (centre, zoom) n'est pas persisté non plus : il pourrait révéler l'endroit où se trouve l'utilisateur. L'épingle d'un monument non capturé suit la case silhouette du carnet : « N° 00X, à découvrir », jamais le nom, ni dans le texte visible ni dans l'`aria-label` (RG-054). La carte du plus proche (fidelite-21) suit la colonne « fiche non capturée » de RG-054 : le nom y est autorisé, comme dans la maquette. À confirmer par `amoa`.
9. **Mouvement** : avec `prefers-reduced-motion: reduce`, `fadeDuration: 0`, `jumpTo` au lieu de `flyTo`/`easeTo`, et aucune animation d'épingle.

## Alternatives écartées

- **SVG statique** (défaut prévu par #131) : il est fidèle à la maquette à un seul zoom, mais il faut redessiner Paris à la main et il n'y a ni déplacement ni zoom. L'utilisateur l'a écarté.
- **Leaflet + tuiles raster** : style imposé par le fournisseur de tuiles, impossible à accorder aux tokens.
- **Couches MapLibre (`fill`, `circle`) pour le brouillard** : un flou de masque n'existe pas en natif, et le tampon encré ne peut pas être rendu dans le canevas.
- **`maplibregl.Marker`** : il fait double emploi avec le calque, et ses éléments DOM sont créés hors d'Angular.
- **Tuiles d'un tiers commercial (clé d'API)** : coût, traçage des utilisateurs, clé exposée côté client.

## Conséquences

- Le chunk `/carte` est lourd (MapLibre, environ 250 kB gzip) mais différé. Le paquet initial ne doit pas grossir : c'est vérifié au build.
- Ajout de 2 dépendances : `maplibre-gl`, et `pmtiles` lors de la bascule en production.
- Le WebGL est requis. S'il est absent, on affiche un message de repli. La liste des monuments reste accessible par le carnet.
- La pile CSP et Trusted Types doit être validée par un spike avant le développement de l'écran.
- La carte France (fidelite-24) pourra réutiliser le calque, ou rester en SVG statique (décision à prendre dans cette story).
