# Fidélité aux maquettes v4-v6 : spec d'implémentation (dev-frontend)

> **Remplace `docs/design/carnet-r1.md`** (marquer ce dernier « remplacé par ce document »). `carnet-r1.md` divergeait parce qu'il a été écrit depuis le cahier, les ADR et le glossaire, sans ouvrir les fichiers HTML/SVG des maquettes : il a inventé une grille de cases à silhouettes, des encres par rareté en ocre et un trait de rareté absents de la maquette. La maquette prime (cahier §12) ; ce document en reprend les valeurs exactes (couleurs, tailles, filtres, formes).

Sources lues en entier : `CarnetV4.dc.html` (états `j0`/`j3`/`j60`), `NavBar.dc.html`, `ProfilV6.dc.html`, `O5-GardeTampon.dc.html`, `canvas.json`, ADR 0016/0017/0018/0022, `tokens.css`, `regles-de-gestion*.md`. Référence d'écran : 390 × 844 (la maquette), contrôle à 360 × 740 et 320 de large. Je n'ai pas pu afficher les rendus : les chemins SVG des silhouettes et glyphes que j'ajoute (§3.6, §7.5, §8) sont à regarder une fois dans le navigateur avant fusion.

Conventions : `px` = valeur de la maquette, à convertir en `rem` (÷16) sauf bordures, ombres et SVG. « Décision n° X » renvoie au §10.

---

## 1. Tokens

### 1.1 Couleurs de la maquette vs `tokens.css`

| Valeur maquette | Où | Token existant | Verdict |
| --- | --- | --- | --- |
| `#F4F1EA` | fond, tampon sur photo | `--zn-papier` | ok |
| `#FBF9F4` | planche, cartes, bouton | `--zn-papier-clair` | ok |
| `#1A1C20` | texte, bouton principal | `--zn-encre` | ok |
| `#1F3A5F` | bandeau, liens | `--zn-marine` | ok |
| `#8C2F39` | bouton Tamponner, avatar, case suivante | `--zn-bordeaux` | ok |
| `#2F5D4A` | interrupteur actif, encre | `--zn-sapin` | ok |
| `#B07A2A` | médaille « Dame de fer » | `--zn-ocre` | ok (graphique seulement, 3,3:1) |
| `#5B5F66` | libellés, aides | `--zn-gris-libelle` | ok |
| `#45494F` | méta profil, bouton « loin » | `--zn-gris-45` | ok |
| `#2C2F34` | texte courant O5 | `--zn-gris-texte` | ok |
| `#0E0F11` | voile sur photo | `--zn-nuit` | ok |
| `#6B6F75` | onglets inactifs, nav inactive, « ? » | `--zn-gris-6b` | **interdit sur papier** (4,47:1 < 4,5:1). Remplacer par `--zn-gris-libelle` partout où le fond est `--zn-papier` ou le bandeau de nav (voir §9.1). Reste admis sur `--zn-papier-clair` (4,80:1) |
| `#D9B26A` | sceau Z, « légendaires » du bandeau | **manquant** | `--zn-or` |
| `#C8D2DF` | libellés du bandeau | **manquant** | `--zn-brume` |
| `#4CC38A` | halo « dans la zone » | **manquant** | `--zn-halo-zone` |
| `#FFFFFF` | biseau des cases, bouton d'interrupteur | **manquant** | `--zn-blanc` |
| `rgba(26,28,32, .06/.08/.10/.12/.14/.2/.22)` | filets, pistes, biseaux | aucun | `--zn-voile-*` (4 pas, ci-dessous) |
| `rgba(140,47,57,.22)` | remplissage d'icône de l'onglet actif | aucun | `--zn-bordeaux-voile` |
| `rgba(244,241,234,.94)` | fond de la nav | aucun | supprimé : fond `--zn-papier` opaque (voir §6.1) |
| `rgba(14,15,17,.35)` | voile sur photo (O5) | aucun | `--zn-voile-photo` |

À ajouter dans `tokens.css` (seul fichier où le hexadécimal est permis). Les voiles sont dérivés avec `color-mix` pour ne pas dupliquer l'hexadécimal.

```css
/* Maquettes v4-v6 : couleurs absentes */
--zn-or: #d9b26a;        /* uniquement sur marine : 5,75:1 ; sceau Z, compteur « légendaires » */
--zn-brume: #c8d2df;     /* uniquement sur marine : 7,5:1 ; libellés du bandeau */
--zn-halo-zone: #4cc38a; /* décor du bouton « zone », 1,96:1 sur papier : jamais seul porteur d'info */
--zn-blanc: #ffffff;
--zn-bordeaux-voile: color-mix(in srgb, var(--zn-bordeaux) 22%, transparent);
--zn-voile-06: color-mix(in srgb, var(--zn-encre) 6%, transparent);  /* filet interne d'une carte */
--zn-voile-10: color-mix(in srgb, var(--zn-encre) 10%, transparent); /* bordure de carte, de nav (maquette .08 et .10) */
--zn-voile-14: color-mix(in srgb, var(--zn-encre) 14%, transparent); /* piste, biseau (maquette .12 et .14) */
--zn-voile-22: color-mix(in srgb, var(--zn-encre) 22%, transparent); /* point de pagination, poignée (maquette .2 et .22) */
--zn-voile-photo: color-mix(in srgb, var(--zn-nuit) 35%, transparent);
--zn-voile-modale: color-mix(in srgb, var(--zn-nuit) 72%, transparent); /* ajout : voile des feuilles sans photo, §8.3 */

/* Encres de tampon (décision n° 1) */
--zn-tampon-commun: var(--zn-marine);
--zn-tampon-rare: var(--zn-bordeaux);
--zn-tampon-legendaire: var(--zn-sapin);

/* Ombres de la maquette */
--zn-biseau: inset 1px 1px 0 var(--zn-voile-14), inset -1px -1px 0 var(--zn-blanc);
--zn-ombre-planche: 0 14px 24px -18px color-mix(in srgb, var(--zn-encre) 35%, transparent);
--zn-ombre-barre: 0 -10px 24px -18px color-mix(in srgb, var(--zn-encre) 35%, transparent);
--zn-ombre-feuille: 0 -12px 30px -14px color-mix(in srgb, var(--zn-nuit) 45%, transparent);
--zn-ombre-bouton: 0 12px 20px -10px color-mix(in srgb, var(--zn-encre) 55%, transparent);
--zn-ombre-bouton-interrupteur: 0 1px 3px color-mix(in srgb, var(--zn-encre) 30%, transparent);
```

Le test « aucune couleur hexadécimale hors tokens » reste vert : aucun hexadécimal en dehors de `tokens.css` ; les SVG de décor statiques (guilloches, §4.5) sont des fichiers `.svg`, hors du motif `src/app/**/*.css`.

### 1.2 Typographie, rayons, tailles

La maquette utilise des tailles fixes que l'échelle `--zn-taille-*` ne couvre pas. Les ajouter en `rem` (zoom texte respecté) :

```css
--zn-fs-10: .625rem;  --zn-fs-11: .6875rem; --zn-fs-12: .75rem;  --zn-fs-13: .8125rem; /* = --zn-taille-petite */
--zn-fs-15: .9375rem; --zn-fs-19: 1.1875rem; --zn-fs-22: 1.375rem; --zn-fs-24: 1.5rem;
--zn-fs-28: 1.75rem;  --zn-fs-34: 2.125rem;
--zn-ls-eyebrow: .16em; /* « CARNET D'EXPLORATEUR », « PROFIL », « N°001 · 1 / 118 » */
--zn-ls-etiquette: .14em; /* « PAGE 1 / 4 », « CONFIDENTIALITÉ » */
--zn-ls-numero: .1em; /* « N°004 » dans une case */
--zn-rayon-6: 6px;  /* planche */
--zn-rayon-8: 8px;  /* case vide */
--zn-rayon-18: 18px; /* bandeau */
```

Rôles typographiques (Gloock `--zn-police-titre`, Geist `--zn-police-ui`, Geist Mono `--zn-police-mono`) :

| Rôle | Police / taille / graisse | Usage |
| --- | --- | --- |
| Titre de page | Gloock 28/1, 400 | pseudo du profil ; « Collections » |
| Titre de feuille | Gloock 34/.98, `text-wrap: balance` | O5, succès |
| Pseudo du bandeau | Gloock 24/1 | bandeau |
| Titre de section | Gloock 22 | « Succès » |
| Onglet de ville | Gloock 19 | + compteur Mono 11 |
| Chiffre de stat | Gloock 22, 400 | bandeau |
| Étiquette | Geist Mono 11, 500, `--zn-ls-etiquette`, majuscules, `--zn-gris-libelle` | « PAGE 1 / 4 — PARIS », « CONFIDENTIALITÉ » |
| Surtitre | Geist Mono 11/10, `--zn-ls-eyebrow` | bandeau (10, brume), O5 (11, bordeaux) |
| Ligne de réglage | Geist 15, 500 ; aide 12 `--zn-gris-libelle` | profil |
| Bouton principal | Geist 16, 600, hauteur 54, rayon 14, fond encre, texte papier-clair | O5 |
| Bouton secondaire | Geist 15, 500, hauteur 44, `--zn-marine` | O5 |
| Chip | Geist 13, 500, hauteur visuelle 34 | filtres |
| Texte courant | Geist 15/1.45, `--zn-gris-texte`, `text-wrap: pretty` | O5 |

Tous les nombres : `font-variant-numeric: tabular-nums`.

### 1.3 Jetons de composants

```css
--zn-barre-h: 62px;          /* 6 + 56, hors marge basse */
--zn-barre-marge-basse: max(14px, env(safe-area-inset-bottom));
--zn-tampon-btn: 64px;       /* bouton central */
--zn-tampon-saillie: 28px;   /* dépassement du bouton au-dessus de la barre */
--zn-cible-chip: 34px;       /* hauteur visuelle ; zone de toucher 44, voir §5.3 */
```

---

## 2. Filtres SVG : encre et papier

### 2.1 Encre (un seul filtre, ADR 0022 §2)

À placer **tel quel** dans `index.html`, juste après `<body>` :

```html
<svg aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute">
  <filter id="zn-encre" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.15" result="trous"/>
    <feComposite in="SourceGraphic" in2="trous" operator="in" result="encre"/>
    <feDisplacementMap in="encre" in2="n" scale="1.3" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
```

C'est `inkC` de CarnetV4 / `inkO5` de O5, sans modification (ne pas ajouter `color-interpolation-filters` : le rendu de la maquette est celui du défaut `linearRGB`). Graine unique `4` (la maquette varie 4, 7, 9 : une graine par écran n'a aucune valeur d'identité ; une seule graine garantit le même grain partout). `inkP` du profil n'a **pas** le `feDisplacementMap` : on l'unifie sur `zn-encre` (déplacement de 1,3 px sur une médaille de 62 px, imperceptible, un filtre de moins).

Usage :

```css
.zn-encre { filter: url(#zn-encre); }
@media (forced-colors: active) { .zn-encre { filter: none; } }
```

La classe va sur l'élément `<svg>` racine du tampon ou de la médaille (et non sur un `<g>` interne comme dans la maquette), pour que le grain soit en pixels CSS constants quelle que soit la taille du tampon, et parce que `filter: url()` sur un enfant SVG est la combinaison la plus fragile sur Safari iOS. **Critère de recette** : rendu vérifié sur iOS Safari et Android Chrome ; repli prévu = ADR 0022 §8.

N'est appliqué qu'à des éléments **immobiles** ou animés par `transform`/`opacity` d'un ancêtre (ADR 0017 §3-4). Jamais sur : le texte courant, un bouton, le conteneur de la planche.

### 2.2 Papier : non repris

`paperC`, `paperP`, `paperO5` (`feTurbulence` 0,85 / 3 octaves en plein écran) **ne sont pas implémentés** (ADR 0017 §1, ADR 0022 §4). Équivalent : `papier.webp` déjà posé sur `body` (`base.css`). Pour la feuille du bas (O5 / succès), `background: var(--zn-papier) url('./papier.webp')`. Perte visuelle : nulle à l'œil (le filtre de la maquette est à 10 % d'opacité).

### 2.3 Coût et accessibilité

| Sujet | Coût / risque | Règle |
| --- | --- | --- |
| `feTurbulence` 2 octaves + `feDisplacementMap` | calcul par pixel à chaque nouvelle rastérisation de l'élément (estimation, non mesurée : 12 tampons de ~100 px à ×3 de densité = ~1 Mpx). Rapide sur GPU Chrome, plus lent sur Safari | **page de planche ≤ 12 tampons** (la pagination borne le coût, pas le défilement). Animer seulement `transform`/`opacity`. `will-change: transform` seulement pendant l'animation de 460 ms. Mesure d'acceptation : aucune tâche > 50 ms au défilement sur l'appareil de référence (ADR 0017 §6) |
| `mix-blend-mode: multiply` | un passage de composition de la taille du calque | **une fois**, sur le calque des tampons de la planche (ADR 0022 §5), jamais par tampon. `isolation: isolate` sur la planche pour que le mélange ne porte que sur le papier clair et les guilloches. Les tampons ne se chevauchent pas (§4) : le gain visuel est faible ; **si la mesure dépasse le budget, le retirer en premier** (perte quasi nulle) |
| `backdrop-filter: blur(16px)` de la nav (maquette) | recomposition du flou à chaque image de défilement, coûteux sur Android d'entrée de gamme | **supprimé** : fond `--zn-papier` opaque (à 94 % la différence est invisible) |
| `forced-colors: active` | filtre et mélange cassent les couleurs système | `filter: none; mix-blend-mode: normal;` ; traits en `CanvasText` (`color: CanvasText` sur le tampon), planche `Canvas` + bordure `CanvasText` 1 px, emplacements bordés `CanvasText` |
| `prefers-reduced-motion: reduce` | — | le filtre est statique : inchangé. Seule l'animation de pose (§3.5) et l'impulsion du halo (§6.3) sont retirées. La règle globale de `base.css` (l. 117) suffit si les animations passent par `animation-duration` / `transition-duration` |
| Texte dans le SVG | le trou d'encre (alpha moyen ≈ 65 %) abaisse le contraste moyen des traits (marine ≈ 3,6:1, bordeaux ≈ 3,35:1, sapin ≈ 3,04:1 sur papier, calcul d'estimation) | le texte d'un tampon est une **illustration** : tout son contenu est dans le nom accessible et dans la fiche (§9.2). Le trait moyen doit rester ≥ 3:1 (sapin au ras : ne pas durcir le filtre, ne pas éclaircir l'encre) |

---

## 3. Composant tampon `zn-tampon` (`shared/ui/`)

### 3.1 Contrat

Entrées : `forme: 'cercle' | 'rectangle' | 'octogone' | 'ovale'`, `encre: 'commun' | 'rare' | 'legendaire'`, `contenu: { haut, centre, bas }` (chaînes déjà calculées par la fonction pure `contenuTampon()` ci-dessous, ou texte libre pour « CAPTURÉ », « COLLECTION COMPLÈTE »), `etiquette: string` (nom accessible), `decoratif: boolean`.
Le composant n'appelle aucune API et ne lit pas les types : deux fonctions pures à côté de lui, testées.

```ts
export const FORME_PAR_TYPE: Record<TypeMonument, Forme> = {
  TOUR: 'cercle', PHARE: 'cercle', AUTRE: 'cercle',
  PONT: 'rectangle', CHATEAU: 'rectangle', PALAIS: 'rectangle',
  RELIGIEUX: 'octogone', MUSEE: 'ovale',
};
export const ENCRE_PAR_RARETE = { COMMUN: 'commun', RARE: 'rare', LEGENDAIRE: 'legendaire' } as const;
// --zn-tampon-commun = marine, --zn-tampon-rare = bordeaux, --zn-tampon-legendaire = sapin
```

La couleur est posée par `color: var(--zn-tampon-<encre>)` sur l'hôte ; tout le SVG utilise `currentColor`. Le tampon sur photo (O5) et sur voile (succès) force `color: var(--zn-papier)`.

### 3.2 Cohérence avec la maquette (et contradictions avec `carnet-r1.md`)

| Point | Maquette | `carnet-r1.md` | Règle retenue |
| --- | --- | --- | --- |
| Formes | 4 formes géométriques (cercle, rectangle, octogone, ovale), texte dedans, aucune silhouette de monument | 8 silhouettes de type en cadre circulaire, losange pour AUTRE | **4 formes de la maquette**. Les 8 silhouettes ne servent qu'aux emplacements vides des collections (§8.1.3) |
| Forme selon le type | cercle : Tour Eiffel, Panthéon ; rectangle : Arc de Triomphe, Pont Neuf, Conciergerie ; octogone : Notre-Dame, Sainte-Chapelle ; ovale : Sacré-Cœur, Opéra Garnier | une forme par type | table `FORME_PAR_TYPE` ci-dessus. **Écarts maquette** (types non connus du catalogue ici) : Sacré-Cœur est ovale dans la maquette, mais RELIGIEUX donne l'octogone ; Arc de Triomphe (rectangle) et Panthéon (cercle) ne sont tous deux cohérents que si leurs types sont dans des groupes différents. Décision n° 4 |
| Encre | marine / bordeaux / sapin, **non liée à la rareté** (Tour Eiffel et Notre-Dame, deux Légendaires, sont marine et sapin) | commun marine, rare bordeaux, légendaire ocre `#8A5E1E` | le cahier §12 valide « une encre par rareté » : **commun marine, rare bordeaux, légendaire sapin** (5 cas sur 9 conformes à la maquette, contre 4 sur 9 avec l'ocre). Pas d'ocre en encre de tampon (3,3:1). Décision n° 1 |
| Trait de rareté | tous les tampons ont le même trait (filet épais 3 + filet fin 1) ; aucune étoile | simple / double / double + étoile | **trait unique de la maquette**. La rareté passe par l'encre **et** le mot écrit. ADR 0022 §7 à amender par le tech-lead (« simple, double filet, étoile » supprimé) |
| Rareté écrite | « LÉGENDAIRE » et « RARE » apparaissent ; **« COMMUN » n'apparaît jamais** | écrite pour les trois | écrite pour les trois (cahier §12 : « en toutes lettres, pas seulement la couleur »). Pour la faire tenir, la **date** du tampon (rectangle, octogone, ovale) cède la place au mot ; elle reste sur le cercle et sur la fiche |
| Texte dans la case de grille | n° + nom + ville/rareté selon la forme | n° + nom tronqué + type + rareté en 9 px | contenu du §3.3 |

### 3.3 Contenu par forme (`contenuTampon`)

Le texte est en majuscules (`toLocaleUpperCase('fr-FR')`), `RARETÉ` ∈ {COMMUN, RARE, LÉGENDAIRE}, `N°001` = « N° » + numéro sur 3 chiffres, date `JJ·MM·AA` (point médian U+00B7, fuseau `Europe/Paris`, comme le correctif d'`ExportTest`).

| Forme | Haut (Geist Mono) | Centre (Gloock) | Bas (Geist Mono) |
| --- | --- | --- | --- |
| cercle | texte en arc : `VILLE · NOM · N°001 ·` | `RARETÉ` | date |
| rectangle | `NOM` | `VILLE` | `N°001 · RARETÉ` (+ filet horizontal au-dessus) |
| octogone | `NOM` | `N°001` | `RARETÉ` |
| ovale | `VILLE` | `NOM` | `N°001 · RARETÉ` |

Ajustement (calcul, pas de mesure DOM) :
- Taille du centre : `fs = max(9, min(fsMax, L / (nbCaractères × 0,54)))` avec `(fsMax, L)` = cercle (15, 62), rectangle (27, 124), octogone (15, 70), ovale (17, 112). Si `fs` plafonne à 9 et que le texte est encore trop long : tronquer avec « … ».
- Lignes Mono : nombre maximal de caractères = `floor(L / (corps × 0,6 + interlettrage))` avec `L` haut/bas : cercle arc 255 / 56, rectangle 124 / 110, octogone 100 / 80, ovale 100 / 90. Tronquer le **nom** avec « … » (jamais d'abréviation type « STE-CHAPELLE » : voir §9.2) ; pour l'arc, tronquer le nom pour que `VILLE · NOM · N°001 ·` fasse ≤ 34 caractères (la maquette O5, avec « FRANCE ·», dépasse la circonférence de 257 px : texte coupé).
- `textPath` : id unique par instance (`zn-arc-` + compteur de module), ADR 0022.

### 3.4 SVG complets

Chaque tampon : `<svg class="zn-encre" viewBox=… width="100%" [role="img" aria-label=…|aria-hidden="true"]><g fill="none" stroke="currentColor">…</g></svg>`. Le filtre est sur le `<svg>` (§2.1), pas sur le `<g>`.

**Cercle** (`viewBox="0 0 120 120"`) :

```svg
<circle cx="60" cy="60" r="56" stroke-width="3"/>
<circle cx="60" cy="60" r="50" stroke-width="1"/>
<circle cx="60" cy="60" r="32" stroke-width="1.2"/>
<path id="{id}" d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0" stroke="none"/>
<text fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="9.2" letter-spacing="2"><textPath href="#{id}">{arc}</textPath></text>
<text x="60" y="60" text-anchor="middle" fill="currentColor" stroke="none" font-family="Gloock, serif" font-size="{fs}">{centre}</text>
<text x="60" y="75" text-anchor="middle" fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="7.6">{bas}</text>
```

**Rectangle** (`viewBox="0 0 150 96"`) :

```svg
<rect x="3" y="3" width="144" height="90" rx="6" stroke-width="3"/>
<rect x="9" y="9" width="132" height="78" rx="3" stroke-width="1"/>
<text x="75" y="27" text-anchor="middle" fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="8.5" letter-spacing="2.2">{haut}</text>
<text x="75" y="56" text-anchor="middle" fill="currentColor" stroke="none" font-family="Gloock, serif" font-size="{fs}">{centre}</text>
<line x1="20" y1="65" x2="130" y2="65" stroke-width="1"/>
<text x="75" y="79" text-anchor="middle" fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="8.2">{bas}</text>
```

**Octogone** (`viewBox="0 0 120 120"`) :

```svg
<polygon points="36,3 84,3 117,36 117,84 84,117 36,117 3,84 3,36" stroke-width="3"/>
<polygon points="39,10 81,10 110,39 110,81 81,110 39,110 10,81 10,39" stroke-width="1"/>
<text x="60" y="38" text-anchor="middle" fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="8.5" letter-spacing="1.8">{haut}</text>
<text x="60" y="66" text-anchor="middle" fill="currentColor" stroke="none" font-family="Gloock, serif" font-size="{fs}">{centre}</text>
<text x="60" y="88" text-anchor="middle" fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="7.6">{bas}</text>
```

**Ovale** (`viewBox="0 0 140 100"`) :

```svg
<ellipse cx="70" cy="50" rx="66" ry="46" stroke-width="3"/>
<ellipse cx="70" cy="50" rx="59" ry="39" stroke-width="1"/>
<text x="70" y="34" text-anchor="middle" fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="8" letter-spacing="2">{haut}</text>
<text x="70" y="58" text-anchor="middle" fill="currentColor" stroke="none" font-family="Gloock, serif" font-size="{fs}">{centre}</text>
<text x="70" y="74" text-anchor="middle" fill="currentColor" stroke="none" font-family="Geist Mono, monospace" font-size="7.5">{bas}</text>
```

Les chaînes `{…}` sont échappées par Angular (interpolation), jamais injectées en `innerHTML`.

Variante « CAPTURÉ » (O5) : cercle ci-dessus, `color: var(--zn-papier)`, 150 × 150, rotation −10°, trait extérieur 3,2, arc 9,4 / interlettrage 2,1 (même troncature à 34 caractères, sans « FRANCE »), centre `CAPTURÉ` (Gloock 15, y=58), bas `RARETÉ` (Mono 8, y=73), placé à `top: 236px` centré. Pas de `mix-blend-mode` sur photo.

### 3.5 Pose du tampon (coup de tampon) et états

- Conteneur du tampon pour animer, jamais le SVG filtré. `@keyframes pose { from { opacity: 0; transform: rotate(var(--rot)) scale(1.35); } 60% { opacity: 1; transform: rotate(var(--rot)) scale(.96); } to { opacity: 1; transform: rotate(var(--rot)) scale(1); } }`, durée `--zn-duree-tampon` (460 ms), courbe `--zn-courbe`, `will-change: transform` posé au début et retiré à `animationend`. Rotation d'arrivée = rotation finale du tampon (−10° pour O5).
- `prefers-reduced-motion: reduce` : pas de `pose`, apparition immédiate (opacité seule, durée ≈ 0).
- Dans la planche : **pas d'animation** (aucun tampon ne « tombe » au chargement) ; la pose n'a lieu que pour le tampon qui vient d'être gagné.
- Appui : `:active` réduit le conteneur à `scale(.97)` en `--zn-duree-appui`, sans toucher au `<a>` (le focus ne bouge pas). Survol uniquement sous `@media (hover: hover)`.

### 3.6 Silhouettes de type (emplacements vides des collections seulement)

`viewBox="0 0 48 48"`, `fill="currentColor"`, `fill-rule="evenodd"`, `color: var(--zn-gris-bordure)` (bord de forme à 3:1), `aria-hidden`. Un seul détail intérieur par silhouette.

| Type | `d` |
| --- | --- |
| CHATEAU | `M6 42V12h4v3h4v-3h4v12h12V12h4v3h4v-3h4v30zM21 42v-9a3 3 0 0 1 6 0v9z` |
| RELIGIEUX | `M6 42V28l12-8 12 8v14zM30 42V22h12v20zM30 22l6-16 6 16z` |
| PONT | `M2 12h44v30H2zM8 42v-8a4 4 0 0 1 8 0v8zM20 42v-8a4 4 0 0 1 8 0v8zM32 42v-8a4 4 0 0 1 8 0v8z` |
| PHARE | `M18 42 21 18h6l3 24zM20 18V12h8v6zM23 14h2v3h-2zM24 5l6 7H18z` |
| PALAIS | `M4 42V20h40v22zM20 42V32h8v10zM4 20 24 8l20 12z` |
| TOUR | `M24 3l4 15 6 26h-5l-5-14-5 14h-5l6-26z` |
| MUSEE | `M4 18 24 6l20 12zM6 20h36v3H6zM10 26h4v12h-4zM18 26h4v12h-4zM26 26h4v12h-4zM34 26h4v12h-4zM6 40h36v4H6z` |
| AUTRE | `M24 4 42 24 24 44 6 24zM24 18l6 6-6 6-6-6z` |

Ces silhouettes sont génériques par type (jamais le monument réel : RG-054).

---

## 4. Planche, placement déterministe, pagination, points

### 4.1 Structure (`zn-planche`)

```html
<section class="planche" [class.aere]="aere" aria-labelledby="planche-titre">
  <h2 id="planche-titre" class="sr-only">Paris, page 1 sur 4</h2>
  <ul class="grille">…<li> par monument, ordre = numéro croissant…</ul>
  <nav class="pages" aria-label="Pages de Paris">  <!-- flèche, points, flèche -->
</section>
```

```css
.planche { position: relative; isolation: isolate; max-width: 32rem; margin-inline: auto;
  padding: 12px; background: var(--zn-papier-clair) url('/guilloche-planche.svg') center / cover no-repeat;
  border: 1px solid var(--zn-voile-10); border-radius: var(--zn-rayon-6); box-shadow: var(--zn-ombre-planche); }
.grille { display: grid; gap: 4px; list-style: none; margin: 0; padding: 0;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); }       /* dense : 3 colonnes à 390, 2 à 320 */
.aere .grille { grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); } /* 2 colonnes à 390 et à 320 */
.grille li { position: relative; display: grid; place-items: center; aspect-ratio: 1 / 1.04; }
.aere .grille li { aspect-ratio: 1.3 / 1; }
.calque { mix-blend-mode: multiply; }           /* §2.3 : une fois, ici */
@media (forced-colors: active) { .planche { background: Canvas; border-color: CanvasText; } .calque { mix-blend-mode: normal; } }
```

Pas de hauteur fixe (maquette : 500/456 px) : la planche suit son contenu (ADR 0018 : l'écran défile à 200 %). Le calque est un seul élément `div.calque` qui enveloppe les `<li>` (la grille entière) : le mélange est donc posé une fois.

Guilloches de la planche : `guilloche-planche.svg` statique (30 `<ellipse cx="179" cy="235" rx="170" ry="46" fill="none" stroke="#2F5D4A" stroke-opacity=".07" stroke-width=".6" transform="rotate(i×6 179 235)"/>`, `i` de 0 à 29, `viewBox="0 0 358 470" preserveAspectRatio="none"`), image de fond : 0 nœud DOM, 0 filtre. Décoratif : aucun contraste exigé.

### 4.2 Deux densités (densité progressive, cahier §6)

| | Aérée | Dense |
| --- | --- | --- |
| Condition | le joueur a **moins de 6 tampons** au total (valeur par défaut, décision n° 5) | 6 tampons ou plus |
| Cellules par page | 6 | 12 |
| Colonnes (390 / 320) | 2 / 2 | 3 / 2 |
| Taille cellule à 390 | ≈ 164 × 126 (maquette j0 : 160 × 120) | ≈ 109 × 113 |
| Part de la cellule occupée par le tampon | cercle 68 %, octogone 68 %, rectangle 88 %, ovale 76 % | cercle 82 %, octogone 82 %, rectangle 86 %, ovale 84 % |
| Case vide (inset) | 8 px | 6 px |

Les parts garantissent l'absence de chevauchement avec rotation ±8° et décalage ±5 % (calcul de la boîte englobante du rectangle tourné : ≈ 93 % de la cellule à 86 %, plus décalage 4,3 %, soit < 50,7 % de chaque côté, absorbé par l'espace de 4 px entre cellules). **Jour 0** (0 tampon) : 6 cases aérées, pas de pagination, pas de puces, pas de filtres, pas de lien Collections ; le pied de page remplace la pagination (§4.5).

### 4.3 Placement déterministe (ADR 0022 §6)

```ts
/** Rotation ±8°, décalage ±5 % de la taille propre du tampon. Pure, stable d'une visite à l'autre. */
export function placement(numero: number): { rotation: number; dx: number; dy: number } {
  let h = Math.imul((numero | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  const u = (decalage: number) => ((h >>> decalage) & 0xff) / 255 * 2 - 1; // [-1, 1]
  const arrondi = (x: number) => Math.round(x * 10) / 10;
  return { rotation: arrondi(u(0) * 8), dx: arrondi(u(8) * 5), dy: arrondi(u(16) * 5) };
}
```

Application : `style="--rot: {{rotation}}deg; --dx: {{dx}}%; --dy: {{dy}}%"` ; `.tampon { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); }`. Un seul `transform`, posé sur le conteneur du tampon, pas sur le `<a>`.

Tests (`placement.spec.ts`) : (1) même numéro, même résultat ; (2) pour 1 à 200 : `|rotation| ≤ 8`, `|dx|,|dy| ≤ 5` ; (3) au moins 20 rotations distinctes sur 1 à 120 ; (4) pas de `NaN` pour 0, 1 et 9999. Les valeurs de la maquette (−9 à +8°) sont décoratives : bornées à ±8° par l'ADR.

### 4.4 Cellule

- **Capturé** : `<li><a [routerLink]="['/monument', numero]" [attr.aria-label]="nomAccessible">` contenant le conteneur du tampon (SVG `aria-hidden`). Cible = la cellule entière (≥ 104 × 108). Focus : contour 3 px marine décalé de 2 px **autour de la cellule** (le tampon tourne, pas le contour).
- **Non capturé** (« emplacement », maquette `sl`) : `<li><a [routerLink]="['/monument', numero]">` (la fiche non capturée existe, RG-042) avec `position:absolute; inset:6px; border-radius: var(--zn-rayon-8); box-shadow: var(--zn-biseau); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; padding:6px; text-align:center`. Numéro `N°004` Mono 11, `--zn-ls-numero`, `--zn-gris-libelle`. Indice Geist 12/1.25 `--zn-gris-libelle`, `text-wrap: balance` : distance (`1,9 km`, `420 m`) si la position est connue, sinon rien. **Case suivante** (la même que celle du bouton Tamponner, §6) : bordure `1.5px dashed var(--zn-bordeaux)`, numéro `--zn-bordeaux`, indice `Le plus proche · 1,9 km` ; au jour 0, `Ton premier tampon · 2,1 km`. Elle n'a la marque que si ce monument est sur la page affichée. En `forced-colors` : bordure `1px solid CanvasText`.
- Jamais le nom d'un monument non capturé dans la case (la fiche le montre, RG-042/054 ; la grille non).
- Le calque `multiply` couvre aussi les cases vides : la lumière blanche de `--zn-biseau` (`--zn-blanc` sur `--zn-papier-clair`, déjà quasi invisible) disparaît ; seul le bord sombre du biseau reste. Perte acceptée.
- Maquette j3 : « Le plus proche · 1,9 km » alors que la case N°005 est à 1,2 km, et j60 sans case marquée alors que N°005 (1,2 km) est la plus proche : incohérences de la maquette, la règle ci-dessus (même monument que le bouton) s'applique.

### 4.5 Pagination, puces, pied de page

Rangée sous la grille, dans la planche, hauteur 44, dans le flux (jamais en `position:absolute`, à cause du zoom 200 %) :

```
[ ‹ ]        ▬ • • •        [ › ]        44 x 44 | puces centrées | 44 x 44
```

- Flèches : `<button type="button" aria-label="Page précédente" | "Page suivante">`, chevron 20 px trait `--zn-encre` 1,9 (comme le retour du profil), `aria-disabled="true"` aux bornes (reste focalisable, évite de perdre le focus), opacité .35. Pas de balayage tactile obligatoire ; si ajouté, les flèches restent (2.5.1).
- Puces `<ol aria-hidden="true">` : la page courante 18 × 6, rayon 3, `--zn-encre` ; les autres 6 × 6 `--zn-voile-22` ; écart 6 px. Au-delà de 7 pages, pas de puces (l'étiquette suffit). Décoratives : l'information est dans l'étiquette.
- Étiquette (rangée au-dessus de la planche, voir §5.5) : `PAGE 1 / 4 — PARIS` (`PAGE 1 — PARIS` si une seule page ou au jour 0), `aria-live="polite"` pour annoncer le changement de page. Pas de nom de secteur (« RIVE DROITE » de la maquette exige une donnée que le catalogue n'a pas : décision n° 5).
- Changement de page : la hauteur peut changer ; le focus reste sur la flèche pressée ; pas de transition de glissement (apparition immédiate, donc rien à retirer en mouvement réduit).
- Pied du jour 0 : `<p>` Geist 13/1.4, centré, `--zn-gris-libelle`, dans le flux sous la grille : « Chaque monument visité remplit une case. 28 cases t’attendent à Paris. » (28 = nombre de monuments de la ville affichée).

### 4.6 États de la planche

| État | Rendu |
| --- | --- |
| Chargement | cellules aérées fantômes : mêmes dimensions, `--zn-papier-sombre` + `--zn-biseau`, sans animation (mouvement réduit ou non : pas de scintillement), `aria-busy="true"` sur la section, texte `sr-only` « Chargement du carnet » en `role="status"` |
| Ville sans monument | message centré dans la planche : « Aucun monument dans cette ville pour l'instant » |
| Filtre sans résultat | « Aucun monument ne correspond » + bouton « Effacer les filtres » (44 px) ; si d'autres villes en ont, ajouter « 3 dans d'autres villes » |
| Erreur | `zn-message type="erreur"` `role="alert"` « Carnet indisponible » + bouton « Réessayer » ; le bandeau reste affiché s'il a des données |

---

## 5. Écran Carnet : bandeau, onglets de villes, chips, rangée d'étiquette

Cadre : padding `18px 16px 0`, colonne, `gap: 12px`, bas = hauteur de la nav + saillie + `env(safe-area-inset-bottom)` (le contenu ne passe jamais sous la barre ; `scroll-padding-bottom` identique, ADR 0018). Ordre : bandeau, onglets, chips (si ≥ 20 tampons), rangée d'étiquette, planche.

### 5.1 Bandeau marine (`zn-bandeau`)

```
+----------------------------------------------------------+  min-height 108, rayon 18, fond marine
| CARNET D'EXPLORATEUR                              ( Z )  |  surtitre Mono 10, 0.16em, brume ; sceau 62 px
| @pseudo                                                  |  h1 Gloock 24/1, papier
|                                                          |
| 41 tampons   6 légendaires   4 /10 villes                |  stats, bas 14, droite libre 76
+----------------------------------------------------------+
```

- Boîte : `position: relative; min-height: 108px; padding: 14px 18px; border-radius: var(--zn-rayon-18); background: var(--zn-marine) url('/guilloche-bandeau.svg') right center / cover no-repeat; color: var(--zn-papier); overflow: hidden`. **Hauteur non fixée** : les stats passent à la ligne au zoom ou en police agrandie.
- `guilloche-bandeau.svg` statique : 30 `<ellipse cx="300" cy="54" rx="190" ry="40" fill="none" stroke="#F4F1EA" stroke-opacity=".07" stroke-width=".6" transform="rotate(i×6 300 54)"/>`, `viewBox="0 0 358 108"`, `preserveAspectRatio="xMaxYMid slice"`. L'ADR 0016 (révision) retirait « les bandeaux guillochés » ; la maquette v4 les montre à 7 % d'opacité : on suit la maquette.
- Sceau Z : `<svg aria-hidden="true" viewBox="0 0 120 120" width="62" height="62">` en `position:absolute; top:14px; right:14px; color: var(--zn-or); opacity:.85`, `<g fill="none" stroke="currentColor"><circle cx="60" cy="60" r="56" stroke-width="2"/><circle cx="60" cy="60" r="46" stroke-width="1"/><text x="60" y="74" text-anchor="middle" fill="currentColor" stroke="none" font-family="Gloock, serif" font-size="40">Z</text></g>`. Sans filtre d'encre. Décoratif.
- Texte : colonne `gap:3px`. Surtitre « CARNET D'EXPLORATEUR » (sans « · N°1 » : décision n° 7), Geist Mono 10, `--zn-ls-eyebrow`, `--zn-brume`. `<h1>` = `<span class="sr-only">Carnet de </span>@pseudo`, Gloock 24/1, `--zn-papier`.
- Stats `<ul>` : `display:flex; flex-wrap:wrap; gap:4px 18px; align-items:baseline; margin-top:14px; padding-right:76px`. Chaque `<li>` : valeur Gloock 22 (`--zn-papier` ; `--zn-or` pour les légendaires), libellé Geist 12 `--zn-brume`, `gap:5px`, nombres tabulaires.

| Stat | Condition | Texte |
| --- | --- | --- |
| tampons | toujours | `0` + « tampon · ton carnet commence ici » (jour 0) ; sinon `3` + « tampons » (singulier à 0 et 1) |
| légendaires | ≥ 1 | `1` + « légendaire » / `6` + « légendaires » |
| villes | ≥ 2 villes avec un tampon | `4` + « /10 villes » (+ `sr-only` « sur 10 villes » à la place de « /10 villes » pour la lecture vocale) |

Le chiffre `10` est le nombre de villes du catalogue, fourni par l'API.
Contrastes : papier sur marine 10,2:1 ; brume 7,5:1 ; or 5,75:1.

### 5.2 Onglets de villes

```
Paris 24/28    Lyon 9/10    Marseille 5/10    Bordeaux 3/10     <- nav « Villes », filet bas voile-10
━━━━━━━━━━━                                                      <- ville courante : filet 2 px encre
```

- `<nav aria-label="Villes"><ul>` ; chaque ville est un `<a routerLink="/carnet" [queryParams]="{ville, page:1}">` (le retour du navigateur marche, l'URL se partage) ; la courante porte `aria-current="page"`.
- Boîte : `display:flex; gap:20px; margin:0 -16px; padding:0 16px; border-bottom:1px solid var(--zn-voile-10); overflow-x:auto; scrollbar-width:none`. Pas de `overflow:hidden` (la maquette coupe à partir de 5 villes : inaccessible). Estompage de bord de 16 px (`mask-image`) seulement si la liste déborde. La ville courante est amenée dans la vue au chargement (`scrollIntoView({inline:'nearest'})`, instantané en mouvement réduit).
- Onglet : `height:44px; display:flex; align-items:baseline; gap:6px; border-bottom:2px solid transparent; margin-bottom:-1px; flex:none`. Courant : filet `--zn-encre`, nom `--zn-encre`. Autres : nom `--zn-gris-libelle` (la maquette utilise `#6B6F75`, 4,47:1 sur papier). Nom : Gloock 19. Compteur : Geist Mono 11, `--zn-gris-libelle`, `24/28`.
- Nom accessible = contenu visible + suffixe : `Paris 24/28` + `<span class="sr-only"> tampons</span>` (contient le texte visible : 2.5.3).
- Ordre : par nombre de monuments décroissant puis nom ; ville ouverte par défaut = la plus proche, sinon Paris (inchangé de `carnet-r1.md`, non contredit par la maquette).

### 5.3 Chips de filtre (≥ 20 tampons, #38)

- Rangée `<div role="group" aria-label="Filtrer par type">` : `display:flex; gap:8px; overflow-x:auto; margin:0 -16px; padding:0 16px; height:44px; align-items:center` (les 34 px visibles sont centrés dans une rangée de 44).
- Chip `<button type="button" aria-pressed>` : `position:relative; height:34px; padding:0 13px; border-radius:var(--zn-rayon-pastille); border:1px solid; font:500 var(--zn-fs-13) var(--zn-police-ui); flex:none`. **Zone de toucher 44 px** : `::before{content:''; position:absolute; inset:-5px 0}` (visuel inchangé, cible conforme ADR 0018).
- Actif : fond `--zn-encre`, texte `--zn-papier-clair`, bordure `--zn-encre`. Repos : transparent, texte `--zn-encre`, bordure **`--zn-bordure-champ`** (la maquette met `rgba(26,28,32,.2)`, environ 1,5:1 : sous le 3:1 de 1.4.11 ; légère déviation assumée).
- Contenu : `Tous` · `Tamponnés` · `À découvrir` (état, #38) puis un chip par groupe de types **présent dans la ville** : `Tours` (TOUR, PHARE), `Religieux`, `Arcs & ponts` (PONT, AUTRE), `Châteaux & palais`, `Musées`. Les 4 premiers libellés de types sont ceux de la maquette. Un seul chip actif à la fois ; rappuyer sur l'actif revient à `Tous`. Choix : `aria-pressed` + `role="status"` sr-only « 5 monuments » à chaque changement ; page remise à 1.
- Absents du DOM sous 20 tampons (j0, j3). Filtre sans résultat : voir §4.6.

### 5.4 Rangée d'étiquette et lien Collections

`display:flex; justify-content:space-between; align-items:center; min-height:24px`. Gauche : étiquette `PAGE 1 / 4 — PARIS` (Mono 11, `--zn-ls-etiquette`, `--zn-gris-libelle`, `aria-live="polite"`). Droite : `<a routerLink="/collections">` Geist 13/500 `--zn-marine`, texte `Collections` ou `Collections · 3 terminées` (« 1 terminée »), chevron 14 px trait 2 `--zn-marine`, `padding-block:10px; margin-block:-10px` (zone de toucher 44 sans changer la mise en page). Absent au jour 0 ; la collection n'apparaît qu'avec ≥ 1 capture (RG-R2-07).

### 5.5 Gabarits de l'écran (390 px)

```
JOUR 0                             JOUR 3                              JOUR 60
[bandeau: 0 tampon · ton carnet…]  [bandeau: 3 tampons 1 légendaire]   [bandeau: 41 | 6 | 4 /10 villes]
Paris 0/28  Lyon 0/10 …            Paris 3/28  Lyon 0/10 …             Paris 24/28  Lyon 9/10 …
PAGE 1 — PARIS                     PAGE 1 / 5 — PARIS   Collections >  [Tous][Tamponnés][À découvrir][Tours]…
+------------+------------+        +------------+------------+         PAGE 1 / 3 — PARIS  Collections · 3 terminées >
| N°001      | N°002      |        | (cercle)   | (rect)     |         +--------+--------+--------+
| Ton premier| 3,4 km     |        |            |            |         | cercle | rect   | cercle |
| tampon·2,1 |            |        +------------+------------+         | oct    | ovale  | ...    |
| (pointillé |            |        | (octog.)   | N°004      |         | ...    |        |        |
|  bordeaux) |            |        |            | Le plus    |         +--------+--------+--------+
+------------+------------+        |            | proche·1,9 |         [‹]      ▬ • •        [›]
| N°003 …    | N°004 …    |        +------------+------------+
+------------+------------+        | N°005 …    | N°006 …    |
| N°005      | N°006      |        [‹]      ▬ • • • •   [›]
Chaque monument visité remplit
une case. 28 cases t’attendent…    [ Explorer Carnet (T) Carte Défis ]
[ Explorer Carnet (T) Carte Défis ]
```

---

## 6. Barre de navigation `zn-nav` (5 emplacements)

### 6.1 Structure et mesures

```
         (   64   )                  <- bouton Tamponner, dépasse de 28 px au-dessus de la barre
 ──────────[ ring ]────────────────  <- filet haut voile-10, ombre-barre
 Explorer  Carnet    label    Carte  Défis      <- 5 colonnes égales (minmax(0,1fr)), min-height 56
```

- `<nav aria-label="Navigation principale" class="nav"><ul>` (5 `<li>`, ordre DOM = ordre visuel : Explorer, Carnet, Tamponner, Carte, Défis).
- `position:fixed; left:0; right:0; bottom:0; padding:6px 6px var(--zn-barre-marge-basse); display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); background:var(--zn-papier); border-top:1px solid var(--zn-voile-10); box-shadow:var(--zn-ombre-barre); overflow:visible`. **Opaque, sans `backdrop-filter`** (§2.3). Hauteur totale 62 px + marge basse (≥ 14 px, = `env(safe-area-inset-bottom)` sur iPhone). La maquette montre 90 px parce que son cadre simule la barre d'accueil iOS ; ADR 0016 disait 64 px + zone sûre : même ordre de grandeur. Sur tablette : la grille est plafonnée à `max-width:32rem` et centrée.
- Le contenu de l'écran réserve `--zn-barre-h + --zn-tampon-saillie + marge basse`.

### 6.2 Entrées (4 liens + 1 bouton central)

| Entrée | Route (indicatif) | Icône `d` (24 × 24, trait 1,6 ; 2 si actif) | Remplissage actif (`--zn-bordeaux-voile`) |
| --- | --- | --- | --- |
| Explorer | `/accueil` | `M12 3.25a8.75 8.75 0 1 1 0 17.5a8.75 8.75 0 1 1 0-17.5zM15.3 8.7l-1.9 4.7-4.7 1.9 1.9-4.7z` | `M15.3 8.7l-1.9 4.7-4.7 1.9 1.9-4.7z` |
| Carnet | `/carnet` | `M7 3.25h10a1.75 1.75 0 0 1 1.75 1.75v14a1.75 1.75 0 0 1-1.75 1.75H7A1.75 1.75 0 0 1 5.25 19V5A1.75 1.75 0 0 1 7 3.25zM8.75 3.25v17.5M13.5 9.25a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z` | `M7 3.25h10a1.75 1.75 0 0 1 1.75 1.75v14a1.75 1.75 0 0 1-1.75 1.75H7A1.75 1.75 0 0 1 5.25 19V5A1.75 1.75 0 0 1 7 3.25z` |
| Carte | `/carte` | `M3.75 6.5 9 4.5l6 2 5.25-2v13l-5.25 2-6-2-5.25 2zM9 4.5v13M15 6.5v13M12 7.6c-1.45 0-2.55 1.05-2.55 2.45 0 1.75 2.55 3.95 2.55 3.95s2.55-2.2 2.55-3.95c0-1.4-1.1-2.45-2.55-2.45z` | `M12 7.6c-1.45 0-2.55 1.05-2.55 2.45 0 1.75 2.55 3.95 2.55 3.95s2.55-2.2 2.55-3.95c0-1.4-1.1-2.45-2.55-2.45z` |
| Défis | `/defis` | `M8.25 3.25l3 6.5M15.75 3.25l-3 6.5M12 9.75a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11z` | `M12 9.75a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11z` |

Rendu d'un lien : `<a>` colonne centrée, `gap:3px; min-height:56px`, icône SVG 24 `aria-hidden` (`fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"`, le tracé de remplissage dessous en `fill: var(--zn-bordeaux-voile); stroke:none` quand actif), libellé Geist 11, `letter-spacing:.01em`, puis un point 4 × 4.
- Actif (`aria-current="page"`) : couleur `--zn-encre`, graisse 600, trait 2, remplissage bordeaux-voile, point `--zn-bordeaux`. L'état n'est donc jamais porté par la couleur seule (graisse, trait, remplissage et point).
- Repos : couleur **`--zn-gris-libelle`** (la maquette a `#6B6F75`, 4,47:1), graisse 500, trait 1,6, point transparent.
- Carte et Défis tant que leurs écrans n'existent pas : le lien est présent et mène à un écran « Bientôt » (décision n° 9), jamais retiré (cinq emplacements stables).
- La barre n'apparaît que sur les 4 écrans d'onglet. Elle est absente de la capture, des feuilles O5/succès, du profil, des collections et des fiches (écrans avec « Retour »).

### 6.3 Bouton Tamponner, trois états

Entrées du composant : `etat: 'loin' | 'proche' | 'zone' | 'deja'`, `distanceM?: number`. Il ne lit pas le GPS (ADR 0016).

```
 LOIN                        PROCHE                      ZONE
  ( gris 45 )                 ( bordeaux )                ( bordeaux + halo vert )
  > 2 km                      420 m                       Tamponner
```

- Lien : `<a routerLink="/tamponner">` dans `<li style="position:relative">` ; `position:absolute; left:50%; top:-34px; width:68px; margin-left:-34px; display:flex; flex-direction:column; align-items:center; gap:4px`. **Jamais `disabled`** : à l'état loin, il ouvre « Rien à tamponner près de toi » (RG-024).
- Rond : `64 × 64; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 0 4px var(--zn-papier), 0 0 0 var(--haloW) var(--halo), var(--zn-ombre-bouton), inset 0 -3px 0 color-mix(in srgb, var(--zn-nuit) 18%, transparent)`. Icône `28 × 28`, viewBox 24, trait `--zn-papier-clair` 1,8, `d="M12 2.6a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM10.5 7.6h3v3.6h-3zM5.5 11.2h13a1 1 0 0 1 1 1v3.3a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-3.3a1 1 0 0 1 1-1z"`, `aria-hidden`.
- Libellé : Geist 11, 600, tabulaire, `white-space:nowrap`.

| État | Fond du rond | Halo (`--halo` / `--haloW`) | Libellé visible / couleur | Nom accessible (`aria-label`, contient le libellé visible : 2.5.3) |
| --- | --- | --- | --- | --- |
| `loin` (aucun monument non capturé à moins de 2 km, ou position inconnue) | `--zn-gris-45` | transparent / 0 | `> 2 km` / `--zn-gris-libelle` | « Tamponner, > 2 km : aucun monument à proximité » |
| `proche` (< 2 km, hors zone) | `--zn-bordeaux` | transparent / 0 | `420 m` ou `1,2 km` / `--zn-bordeaux` | « Tamponner, monument le plus proche à 420 m » |
| `zone` (dans la zone de capture) | `--zn-bordeaux` | `--zn-halo-zone` / 7px | `Tamponner` / `--zn-sapin` | « Tamponner : tu es dans la zone » |
| `deja` (RG-056 : tout ce qui est proche est déjà capturé) | `--zn-gris-45` | transparent / 0 | `Déjà tamponné ici` (2 lignes autorisées, `max-width:96px; white-space:normal; text-align:center`) / `--zn-gris-libelle` | « Tamponner : déjà tamponné ici » |

Distance : < 1 000 m → `420 m` (arrondi à 10 m) ; ≥ 1 000 m → `1,2 km` (virgule). Pas d'`aria-live` (la position change trop souvent, ADR 0016).
- Halo : 3 px verts visibles au-delà de l'anneau papier de 4 px. Il ne porte aucune information seul (le mot « Tamponner » et le sapin du libellé la portent ; 1,96:1 sur papier).
- Impulsion (ADR 0017 §7) : pseudo-élément `::after` du rond (même taille, `border:3px solid var(--zn-halo-zone)`), `animation: impulsion 1.8s var(--zn-courbe) 3` de `opacity .6 → 0` et `scale 1 → 1.25`, **3 répétitions puis arrêt** (économie de batterie, aucun clignotement). `prefers-reduced-motion: reduce` : pas d'impulsion, halo fixe.
- Appui : `scale(.97)` sur le rond, `--zn-duree-appui`. Focus : `outline:3px solid var(--zn-focus); outline-offset:6px` sur le rond (sur le lien : `outline:none`), pour passer au-dessus de l'anneau papier de 4 px. `forced-colors` : contour conservé (`Highlight`), rond bordé `CanvasText`.
- Contrastes : icône papier-clair sur bordeaux 7,75:1, sur gris 45 8,6:1 ; libellés bordeaux 7,2:1, sapin 6,7:1, gris libellé 5,7:1 sur papier.

---

## 7. Profil (ProfilV6)

Écran sans nav : padding `14px 16px 20px`, colonne, `gap:16px`, `min-height:100dvh` (défile si besoin ; la maquette est à 844 px). Fond `papier.webp` (pas de `paperP`).

```
‹            PROFIL                       <- en-tête 44
(E)  @pseudo                              <- avatar 76 à anneau + h1
     Niveau 14 · 41 tampons · 4 villes
     Explorateur depuis le 12 octobre 2026
Succès                           4 / 11 >  <- h2 Gloock 22 + lien (obtenus / total, §7.4)
( ◉ )  ( ◉ )  ( 2/3 )  (  ?  )            <- 4 médailles
CONFIDENTIALITÉ
+----------------------------------------+
| Apparaître dans les classements   [o  ]|  interrupteur
| Sous ton pseudo, jamais ton nom        |
| E-mails des nouveaux défis        [o  ]|
| Localisation                          >|
+----------------------------------------+
MES DONNÉES
+----------------------------------------+
| Exporter mes données                  ↓|
| Supprimer mon compte (bordeaux)       >|
+----------------------------------------+
        CGU  Confidentialité  Mentions légales
              Se déconnecter
```

### 7.1 En-tête

`height:44px; display:flex; align-items:center; justify-content:space-between`. Retour : `<a aria-label="Retour" routerLink=…>` 44 × 44, `margin-left:-10px`, chevron `M15 5l-7 7 7 7`, 20 px, trait `--zn-encre` 1,9. Étiquette « PROFIL » Mono 11 `--zn-ls-eyebrow` `--zn-gris-libelle` (décorative, `aria-hidden`). Côté droit : cale de **44 px** (la maquette met 34 px et décentre l'étiquette).

### 7.2 Identité

- `<section>` `display:flex; align-items:center; gap:16px`. Avatar `<svg viewBox="0 0 76 76" width="76" height="76" aria-hidden="true">` :

```svg
<circle cx="38" cy="38" r="35" fill="none" stroke="var(--zn-voile-14)" stroke-width="3"/>
<circle cx="38" cy="38" r="35" fill="none" stroke="var(--zn-bordeaux)" stroke-width="3" stroke-linecap="round"
        pathLength="220" stroke-dasharray="{progression×220} 220" transform="rotate(-90 38 38)"/>
<circle cx="38" cy="38" r="28" fill="var(--zn-bordeaux)"/>
<text x="38" y="46" text-anchor="middle" fill="var(--zn-papier-clair)" font-family="Gloock, serif" font-size="24">{initiale}</text>
```
  `initiale` = première lettre du pseudo en majuscule (`toLocaleUpperCase('fr-FR')`). Pas d'autre photo d'avatar. La maquette trace 154/220 (70 %) pour 41 tampons, valeur illustrative ; la règle du §7.3 donne 67 %. Anneau décoratif (`aria-hidden`) : sa valeur est dite dans un `<span class="sr-only">encore 1 tampon pour le niveau 15</span>`. Si la progression vaut 0, seule la piste est dessinée (pas de `stroke-linecap` rond isolé : `stroke-dasharray="0 220"` dessine un point en Safari, donc ne pas rendre le cercle de progression).
- Texte (colonne, `gap:4px`, `min-width:0`) : `<h1>` Gloock 28/1, `<span class="sr-only">Profil de </span>@pseudo`, `overflow-wrap:anywhere` (pseudo de 20 caractères) ; « Niveau 14 · 41 tampons · 4 villes » Geist 13 `--zn-gris-45` (8,0:1) tabulaire ; « Explorateur depuis le 12 octobre 2026 » Geist 12 `--zn-gris-libelle`, date de création du compte formatée `Intl.DateTimeFormat('fr-FR', {dateStyle:'long', timeZone:'Europe/Paris'})`.

### 7.3 Niveau : règle de gestion à valider (décision n° 3)

Le niveau n'existe dans aucune règle de gestion (R1 : « aucun succès ni XP » ; XP hors périmètre). La maquette montre « Niveau 14 » pour 41 tampons. **Proposition** à faire valider par l'`amoa` et le client : `niveau = 1 + ⌊tampons ÷ 3⌋` (41 → 14, retrouve la maquette), anneau = `(tampons mod 3) ÷ 3`. Max pratique ≈ niveau 40 pour 118 monuments. Pas de lien avec l'XP ni avec les succès. À défaut de validation, **retirer** « Niveau 14 · » du texte et l'anneau (garder l'avatar plein) plutôt que d'afficher une valeur inventée. Règle pure et testée (`niveau(0)=1`, `niveau(2)=1`, `niveau(3)=2`, `niveau(41)=14`).

### 7.4 Médailles (`zn-medaille`) et succès

- Section : en-tête `display:flex; align-items:baseline; justify-content:space-between` ; `<h2>` Gloock 22 « Succès » ; lien `<a routerLink="/succes">` Geist 13/500 `--zn-marine`, tabulaire, `{obtenus} / {total} ›`, avec zone de toucher 44 (`padding-block:12px; margin-block:-12px`). Le total est le nombre de succès configurés (RG-R2-01 : 11) ; **le « 12 / 40 » de la maquette ne correspond pas à la liste** (décision n° 8) ; de même, les noms « Dame de fer », « Île de la Cité », « Les trois dômes », « Noctambule » de la maquette sont illustratifs : on affiche les noms de RG-R2-01 / `validation-succes-r2.md` (« Apprenti explorateur », « Explorateur », « Grand explorateur », …).
- Grille : `display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:8px` ; cellule colonne centrée `gap:6px` ; nom Geist 12/1.2, 500, centré, `overflow-wrap:anywhere`.
- **Quelles 4 médailles** : jusqu'à 2 obtenues (les plus récentes), puis les « en cours » les plus avancées (`valeur/seuil` décroissant), puis « à découvrir » pour compléter. La liste complète est derrière le lien.
- **Obtenue** : `<svg viewBox="0 0 64 64" width="62" height="62" role="img" aria-label="Succès obtenu : {nom}" class="zn-encre" style="color:{encre}; transform:rotate({r}deg)">` ; `<g fill="none" stroke="currentColor"><circle cx="32" cy="32" r="29" stroke-width="2.4"/><circle cx="32" cy="32" r="24" stroke-width="1"/><path d="{glyphe}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(20 20)"/></g>`. Rotation : `placement(rang du succès).rotation` (déterministe). Même filtre `zn-encre` que les tampons. Pas de `mix-blend-mode`.
- **En cours** : `<span role="img" aria-label="Succès en cours : {nom}, 2 sur 3">` rond 62 px, `box-shadow:var(--zn-biseau)`, texte Geist Mono 10 tabulaire `--zn-gris-libelle` : `2 / 3`.
- **À découvrir** (critère masqué) : même rond, texte `?`, `aria-label="Succès à découvrir : {nom}"`. Ne jamais afficher le critère d'un succès masqué.
- Encre d'une médaille obtenue (par code, `--zn-tampon-*` ou ocre) : PREMIER_TAMPON, EXPLORATEUR_10/25/50, ENCYCLOPEDISTE, COLLECTIONNEUR → marine ; CHASSEUR_RARE → bordeaux ; GLOBE_TROTTEUR, TOUR_DE_FRANCE, PARISIEN → sapin ; LEGENDE → `--zn-ocre` (graphique, 3,3:1 ≥ 3:1).
- Glyphes (24 × 24, tracé seul, `translate(20 20)` dans la médaille 64) :

| Code | Glyphe |
| --- | --- |
| PREMIER_TAMPON | `M12 2.6a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5zM10.5 7.6h3v3.6h-3zM5.5 11.2h13a1 1 0 0 1 1 1v3.3a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-3.3a1 1 0 0 1 1-1z` (icône de la nav) |
| EXPLORATEUR_10 / _25 / _50 | texte « 10 », « 25 », « 50 » (Gloock 11, `x=12 y=16 text-anchor=middle`, `fill=currentColor stroke=none`) |
| CHASSEUR_RARE | `M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z` |
| LEGENDE | `M3 18h18l-1.5-9-4.5 4-3-6-3 6-4.5-4z` |
| GLOBE_TROTTEUR | `M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 3c3.2 3 3.2 15 0 18-3.2-3-3.2-15 0-18z` |
| TOUR_DE_FRANCE | `M12 2.5l7.5 3.5 2 6.5-4 7.5-5.5 2-5.5-2-4-7.5 2-6.5z` |
| ENCYCLOPEDISTE | `M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1zM12 6.5v13` |
| PARISIEN | `M12 1.5 13.6 8l3.4 6 2 8.5h-4.4c-1-2.6-4.2-2.6-5.2 0H5l2-8.5 3.4-6z` (maquette « Dame de fer ») |
| COLLECTIONNEUR | `M7 4h12v12H7zM4 8v12h12` |

### 7.5 Confidentialité

- Titre de section `<h2>` Geist Mono 500 11, `--zn-ls-etiquette`, `--zn-gris-libelle`, majuscules (CSS).
- Carte : `border-radius:var(--zn-rayon-16); background:var(--zn-papier-clair); border:1px solid var(--zn-voile-10)`. Ligne : `min-height:56px; padding:6px 14px; display:flex; align-items:center; gap:12px`, séparateur `border-top:1px solid var(--zn-voile-06)` (sauf la première). Libellé Geist 15/500, aide Geist 12 `--zn-gris-libelle`, colonne `gap:2px`.
- Interrupteurs : **réutiliser** `input[type=checkbox][role=switch][znInterrupteur]` déjà livré (ADR 0016) en l'ajustant à la maquette : piste `48 × 30`, rayon 15, bouton `24 × 24` blanc `--zn-blanc` à `left:3px` (éteint) / `21px` (allumé), `box-shadow:var(--zn-ombre-bouton-interrupteur)` ; allumé : piste `--zn-sapin` ; éteint : piste `--zn-voile-22` **plus** une bordure 1,5 px `--zn-bordure-controle` (sans elle, la piste éteinte fait ~1,4:1 sur la carte : sous 3:1, 1.4.11). Toute la ligne est un `<label>` : cible ≥ 56 px, nom accessible = libellé visible. Enregistrement immédiat ; retour `role="status"` « Préférence enregistrée » (existant). Défaut éteint (consentements facultatifs, RG-003). Rangées : « Apparaître dans les classements / Sous ton pseudo, jamais ton nom » ; « E-mails des nouveaux défis / Un par semaine au maximum ».
- Ligne lien « Localisation / Seulement appli ouverte · jamais enregistrée » : `<a>` avec chevron 16 px (`M9 5l7 7-7 7`, trait 1,8). Destination non maquettée : page d'explication de la position (réutiliser le texte de l'écran de localisation d'onboarding, en lecture seule, avec la marche à suivre pour changer l'autorisation du navigateur).

### 7.6 Mes données

Carte identique. « Exporter mes données / Carnet, photos et réglages, envoyés par e-mail » : `<a>`/`<button>` selon le flux existant, icône téléchargement 18 px `M12 4v11M7 10l5 5 5-5M5 20h14` trait 1,8. « Supprimer mon compte / Tout est effacé définitivement sous 30 jours » : libellé Geist 15/**600** `--zn-bordeaux` (7,7:1 sur papier-clair), chevron bordeaux ; ouvre la confirmation `<dialog>` existante (RG-014 : « au plus tard sous 30 jours », cohérent avec le texte).

### 7.7 Pied

`margin-top:auto; display:flex; flex-direction:column; align-items:center; gap:8px`. `<nav aria-label="Informations légales">` : `CGU`, `Confidentialité`, `Mentions légales`, Geist 13, `--zn-gris-45`, `gap:14px`, **zone de toucher 44 px de haut** (`padding-block:12px; margin-block:-12px`) et soulignés (style global des liens). Bouton « Se déconnecter » : `height:44px; padding:0 16px; font:500 15px; color:--zn-encre; background:none`.

### 7.8 États du profil

Chargement : texte `sr-only` « Chargement du profil » `role="status"` ; avatar et blocs en gabarit fixe sans animation. Erreur : `zn-message` `role="alert"` « Profil indisponible » + « Réessayer » (le pied reste actif, « Se déconnecter » toujours accessible). Aucun succès : la grille montre 4 « à découvrir » ou « en cours » (jamais vide) ; le lien est `0 / 11`.

---

## 8. Écrans sans maquette, dans le même langage

Langage commun : papier + carte papier-clair rayon 16 + filet voile-10 ; Gloock pour les titres, Geist Mono pour numéros et étiquettes ; tampons et emplacements de la planche ; encre marine/bordeaux/sapin ; aucun nouveau composant graphique en dehors de `zn-tampon`, `zn-planche`, `zn-medaille`.

### 8.1 Collections

**Données** (RG-R2-05 à 08) : une collection apparaît dès 1 capture dans son ensemble et si son ensemble compte ≥ 3 monuments ; une fois apparue elle ne disparaît pas. Les collections « Tout <ville> » hors Paris s'affichent en « Bientôt ».

#### 8.1.1 Liste (`/collections`)

```
‹            COLLECTIONS                       <- en-tête 44 (retour vers le Carnet)
Collections                                    <- h1 Gloock 28
3 terminées · 2 en cours                       <- Geist 13, gris-45
+--------------------------------------------+
| Tout Paris                       24 / 28   |  <- carte : h2 Gloock 19 | compteur Mono 12
| ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░                    |  <- barre 6 px
+--------------------------------------------+
| Édifices religieux     ✓ Terminée  9 / 9   |
| ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                     |
+--------------------------------------------+
| ╌ Tout Lyon                      Bientôt ╌ |  <- pointillé, non cliquable
+--------------------------------------------+
```

- Carte : `<li><a routerLink="/collections/:code">` ; `min-height:72px; padding:14px 16px; border-radius:var(--zn-rayon-16); background:var(--zn-papier-clair); border:1px solid var(--zn-voile-10)`; liste `gap:10px`. Nom `<h2>` Gloock 19. Compteur Geist Mono 12 tabulaire `24 / 28` à droite. Barre : `<progress value max>` stylé (hauteur 6, rayon 3, piste `--zn-voile-14`, remplissage `--zn-encre`), largeur pleine, `margin-top:10px`. Nom accessible du lien = nom + « 24 / 28 » visible + `sr-only` « monuments » (+ « terminée »).
- Terminée : remplissage `--zn-sapin`, ligne « ✓ Terminée » Geist 13/600 `--zn-sapin` (7,2:1 sur papier-clair) avec coche SVG 14 px ; **jamais la couleur seule** (le mot est écrit).
- Bientôt : carte `border:1.5px dashed var(--zn-bordure-controle)`, sans lien ni barre, mention « Bientôt » Geist 13 `--zn-gris-libelle` ; `aria-label` = « Tout Lyon, bientôt disponible ».
- Ordre : en cours (pourcentage décroissant), terminées, bientôt.
- États : **vide** (aucune collection ouverte) : carte pointillée « Aucune collection pour l'instant. Tamponne ton premier monument pour en ouvrir une. » + bouton secondaire « Voir la carte » (44 px, marine) ; **chargement** : 3 cartes fantômes de 72 px, sans animation ; **erreur** : `role="alert"` « Collections indisponibles » + « Réessayer ».

#### 8.1.2 Détail (`/collections/:code`)

```
‹            COLLECTION                         <- en-tête 44
Tout Paris                                      <- h1 Gloock 28
24 monuments sur 28 · 86 %                      <- Geist 13 gris-45, tabulaire
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░                       <- progress 6 px
+---------------- planche ------------------+
| (tampon)   (tampon)   (emplacement+silh.) |  <- zn-planche dense, pagination 12 / page
| ...                                        |
|  [‹]        ▬ • •        [›]               |
+--------------------------------------------+
```

- Réutilise `zn-planche` à l'identique (§4) : même placement déterministe, mêmes densités (aérée sous 6 tampons), mêmes cases, ordre par numéro. Étiquette « PAGE 1 / 3 — TOUT PARIS ».
- **Terminée** : sous le titre, un tampon cercle `zn-tampon` en encre sapin, 96 px, rotation −8°, arc `COLLECTION COMPLÈTE · TOUT PARIS ·`, centre `COMPLÈTE`, bas `28 / 28`, `role="img"` « Collection complète, 28 sur 28 ». Pas de date (le serveur n'enregistre pas l'achèvement d'une collection). Pose animée seulement à la première visite après achèvement (`pose`, §3.5).
- Case non capturée : `<a>` vers la fiche (RG-042) = emplacement du §4.4 **avec la silhouette de son type** (§3.6) 40 × 40 centrée au-dessus du numéro, `color:--zn-gris-bordure`, `aria-hidden`. Pas de nom, pas de distance dans cette vue. Nom accessible : « N°004, à découvrir ». Silhouettes et masquage : RG-R2-08/042/054.
- Chargement : planche fantôme (§4.6) + titre. Erreur : « Collection indisponible » + « Réessayer ». Code inconnu / collection non encore ouverte : écran « Cette collection n'existe pas ou n'est pas encore ouverte » + lien « Retour aux collections » (`<h1>`, focus dessus).

#### 8.1.3 Point d'entrée

Lien du Carnet (§5.4). Aucun onglet dédié dans la nav.

### 8.2 Célébration d'un succès (modèle O5)

Deux cas, un seul patron visuel (validation-succes-r2 constat 10 : jamais d'empilement d'écrans).

**A. Succès gagnés par une capture** : pas de seconde feuille. Dans la feuille « Ton premier tampon ! » / « Tampon posé » (O5), insérer sous le paragraphe un bloc « Succès débloqués » : jusqu'à 3 lignes (médaille 40 px + nom Geist 15/600 + critère Geist 12 `--zn-gris-libelle`), puis « + 2 autres succès » (lien vers la liste). Cas du premier tampon : PREMIER_TAMPON est gagné en même temps : une ligne.

**B. Succès « non vus »** (rattrapage R2, RG-R2-04, ou capture hors ligne synchronisée) : feuille propre à l'ouverture de l'application.

```
+--------------------------------------+   <- plein écran, voile --zn-voile-modale (72 % nuit)
|                                      |
|           (  médaille  )             |   <- médaille 140 px, papier, rotation -8°, filtre encre
|           ○   ○   ○                  |      (jusqu'à 3 médailles de 96 px si plusieurs)
|                                      |
+======================================+   <- feuille : rayon 26 26 0 0, papier, ombre-feuille
|              ▬                       |   poignée 40×5 (décor)
| SUCCÈS DÉBLOQUÉ                      |   Mono 11, 0.16em, bordeaux
| Apprenti explorateur                 |   h1 Gloock 34/.98, balance
| 10 monuments tamponnés.              |   Geist 15/1.45, gris-texte
| [ Voir mes succès ]                  |   bouton 54 / rayon 14, fond encre
|        Continuer                     |   44 px, marine, Geist 15/500
+--------------------------------------+
```

- Plusieurs succès : surtitre « 3 SUCCÈS DÉBLOQUÉS », `<h1>` « Bravo, explorateur ! » ; liste `<ul>` de lignes (médaille 48 + nom 15/600 + critère 12), `max-height:40dvh; overflow-y:auto` (défilable au clavier : `tabindex="0"` sur la liste avec `aria-label="Succès débloqués"`).
- `<dialog>` modal natif (`showModal()`), `aria-labelledby` = le `<h1>`, focus initial sur le `<h1>` (`tabindex="-1"`), Échap et « Continuer » ferment, focus rendu à l'élément précédent ; appui sur le voile = « Continuer ». « Voir mes succès » mène à `/succes`.
- Mesures de la feuille = O5 : `padding:14px 24px 30px`, `gap:14px`, boutons `gap:6px; margin-top:6px`, fond `papier.webp`. Médaille(s) posée(s) au-dessus de la feuille en `color:var(--zn-papier)` (comme le tampon de O5 sur la photo), jamais en encre foncée sur le voile.
- Animation : médaille = `pose` (§3.5, 460 ms) ; feuille = `transform: translateY(100%) → 0` en `--zn-duree` (200 ms) via `@starting-style`. **Interruptible** (appui = fin). `prefers-reduced-motion` : tout apparaît sans mouvement. Aucun son, aucune vibration imposée.
- Textes (français, sans emoji) : critère = « {seuil} monuments tamponnés », « {seuil} villes explorées », « {seuil} monuments rares », « Premier monument tamponné », « Collection complétée », « 5 types de monuments différents ».
- États : liste vide impossible (la feuille n'est pas ouverte s'il n'y a rien). Erreur de marquage « vu » : ignorée en silence, la feuille ne s'affiche pas deux fois dans la session.

---

## 9. Accessibilité

### 9.1 Contrastes (formule WCAG ; papier `#F4F1EA` L=0,880 ; papier-clair L=0,948)

| Paire | Ratio | Seuil | Verdict |
| --- | --- | --- | --- |
| encre / papier | 15,1 | 4,5 | ok |
| marine / papier (liens, encre commun) | 10,2 | 4,5 | ok |
| bordeaux / papier (libellé proche, encre rare) ; / papier-clair | 7,2 ; 7,7 | 4,5 | ok |
| sapin / papier (libellé zone, encre légendaire) ; / papier-clair | 6,7 ; 7,2 | 4,5 | ok |
| gris-libelle / papier ; / papier-clair | 5,7 ; 6,2 | 4,5 | ok (remplace `#6B6F75` sur papier) |
| gris-6b / papier | **4,47** | 4,5 | **échec** : nav inactive, onglets de villes inactifs, « ? » des médailles → `--zn-gris-libelle` |
| gris-6b / papier-clair | 4,80 | 4,5 | ok (cases de carnet seulement) |
| gris-45 / papier | 8,0 | 4,5 | ok (méta profil, rond « loin ») |
| papier / marine (bandeau) | 10,2 | 4,5 | ok |
| brume / marine | 7,5 | 4,5 | ok |
| or / marine | 5,75 | 4,5 | ok (texte « 6 » et sceau) |
| papier-clair / bordeaux (icône Tamponner, avatar) | 7,75 | 3 | ok |
| papier-clair / gris-45 | 8,6 | 3 | ok |
| papier / voile `nuit` 72 % (médaille de la feuille) | > 9 | 3 | ok |
| halo vert / papier | 1,96 | 3 | **non porteur** : décor redondant avec le mot « Tamponner » |
| bordure de chip au repos `--zn-bordure-champ` / papier | 3,04 | 3 | ok (la maquette `rgba(.2)` ≈ 1,5 : remplacée) |
| piste d'interrupteur éteint `--zn-voile-22` / papier-clair | ≈ 1,4 | 3 | **échec** : bordure `--zn-bordure-controle` ajoutée (§7.5) |
| encre de tampon, trait moyen après trous (estimation) : marine / bordeaux / sapin | 3,6 / 3,35 / 3,04 | 3 | limite côté sapin (illustration, §2.3) |
| ocre `#B07A2A` / papier | 3,3 | 3 | graphique seulement (médaille LEGENDE) ; texte « Légendaire » : `--zn-ocre-texte` |

À contrôler à l'implémentation avec un échantillonneur (pas seulement ce calcul) : le trait moyen d'un tampon rendu, sur l'appareil de référence.

### 9.2 Noms accessibles (WCAG 2.5.3 : le nom contient le texte visible)

| Élément | Texte visible | Nom accessible |
| --- | --- | --- |
| Tampon dans la planche (lien) | `TOUR EIFFEL`, `N°001`, `LÉGENDAIRE` (selon la forme) | « Tour Eiffel, N°001, Paris, légendaire, tamponné le 19 octobre 2026 » : commence par le nom complet (le texte visible tronqué en est un préfixe), contient `N°001` **sans espace** et la rareté |
| Case vide (lien) | `N°004`, `1,9 km` | « N°004, à découvrir, 1,9 km » (jamais le nom, RG-054) |
| Onglet de ville | `Paris 24/28` | contenu visible + `sr-only` « tampons » |
| Bouton Tamponner | `> 2 km` / `420 m` / `Tamponner` / `Déjà tamponné ici` | §6.3 (chaque nom contient son libellé) |
| Lien Collections | `Collections · 3 terminées` | identique au visible |
| Lien Succès | `4 / 11 ›` | « Succès, 4 / 11 » via `sr-only` de tête (le visible reste contenu) |
| Interrupteur | libellé de ligne | `<label>` englobant : nom = libellé visible |
| Retour | chevron seul | « Retour » (pas de texte visible : la règle ne s'applique pas) |

**Pas d'abréviation** dans un tampon (« STE-CHAPELLE » de la maquette) : le nom visible doit être un préfixe du nom complet ; troncature avec « … » seulement (alternative : champ `nomCourt` fourni par le catalogue, non prévu).
Médailles et sceau du bandeau : `role="img"` ou `aria-hidden` selon qu'ils portent une information.

### 9.3 Structure et focus

- Un `<h1>` par écran : Carnet = pseudo (avec « Carnet de » en `sr-only`), Profil = pseudo, Collections = « Collections », Détail = nom de la collection, feuille de succès = titre. Focus sur le `<h1>` après chaque navigation (ADR 0018) ; changement de ville ou de page : focus reste sur le contrôle pressé, annonce par `aria-live="polite"` de l'étiquette.
- Focus : `:focus-visible { outline: 3px solid var(--zn-focus); outline-offset: 2px }` partout ; bouton Tamponner `outline-offset:6px` sur le rond. Pas de transition sur le focus. Aucun élément focalisable masqué par la nav : `scroll-padding-bottom` = hauteur de nav + saillie + zone sûre.
- Ordre de tabulation = ordre de lecture = ordre des numéros (grille), grâce à l'ADR 0022 §6.
- Cibles ≥ 44 × 44 : flèches de pagination 44, onglets 44, chips 34 + zone étendue 44, lien Collections et lien Succès à zone étendue, liens légaux 44, cellules de planche ≥ 104 × 108.
- Zoom 200 % / 320 px : bandeau à hauteur libre, stats qui passent à la ligne, planche en 2 colonnes, rangée de pagination dans le flux, profil qui défile. Aucun `overflow:hidden` sur l'écran.

### 9.4 Mouvement et préférences

| Animation | Spécification | `prefers-reduced-motion: reduce` |
| --- | --- | --- |
| Pose du tampon / de la médaille | 460 ms, `transform` + `opacity`, interruptible | apparition immédiate |
| Feuille du bas | 200 ms, `translateY` | apparition immédiate |
| Impulsion du halo | 3 répétitions de 1,8 s | supprimée, halo fixe |
| Défilement vers la ville courante | instantané si mouvement réduit | `behavior:auto` |
| Changement de page / de ville | aucune animation | — |
| Chargement | fantômes statiques | — |

`forced-colors: active` : filtre et mélange coupés, traits `CanvasText`, cartes bordées `CanvasText`, focus conservé. Aucun clignotement dans aucune animation.

### 9.5 Contrôles de recette

axe sur chaque écran (0 violation, ADR 0018) ; test unitaire de présence de `#zn-encre` dans `index.html` (ADR 0022) ; test de `placement` (§4.3) ; test de `FORME_PAR_TYPE`/`contenuTampon` (largeurs, troncatures, 34 caractères de l'arc) ; recette clavier + VoiceOver/TalkBack sur planche, nav et feuille de succès ; mesure de défilement du carnet (aucune tâche > 50 ms, ADR 0017 §6) sur l'appareil de référence, **avec et sans** `mix-blend-mode`.

---

## 10. Décisions client nécessaires (valeur par défaut recommandée)

| N° | Décision | Valeur par défaut recommandée | Si refusé |
| --- | --- | --- | --- |
| 1 | Encre d'un tampon : la maquette ne la lie pas à la rareté (deux Légendaires, deux couleurs) ; le cahier §12 la valide « une par rareté » | commun marine, rare bordeaux, légendaire sapin (jamais d'ocre en encre) | tirage déterministe sur le numéro parmi les 3 encres (fidèle visuellement, sans sens) ; ou ocre `#8A5E1E` pour légendaire (`carnet-r1`) |
| 2 | Rareté écrite sur **tous** les tampons (cahier), la maquette n'écrit pas « COMMUN » | oui ; la date du tampon cède la place (rectangle, octogone, ovale) | garder la date et accepter un tampon commun sans mot (contredit le cahier) |
| 3 | Règle de gestion « Niveau » (aucune n'existe) | `niveau = 1 + ⌊tampons ÷ 3⌋`, anneau = reste ÷ 3, indépendant de l'XP | retirer « Niveau n » et l'anneau tant que la règle n'est pas écrite |
| 4 | Types vers formes : cercle (TOUR, PHARE, AUTRE), rectangle (PONT, CHATEAU, PALAIS), octogone (RELIGIEUX), ovale (MUSEE). Sacré-Cœur est ovale dans la maquette, mais RELIGIEUX donne l'octogone | table appliquée telle quelle ; vérifier le type de l'Arc de Triomphe et du Panthéon dans le catalogue | corriger la maquette ou ajouter un champ `forme` par monument |
| 5 | Pagination : la maquette a des pages de 6 à 11 cases et un nom de secteur (« RIVE DROITE ») absent du catalogue ; RG-041 liste tous les monuments | 6 cases par page sous 6 tampons, 12 ensuite ; étiquette `PAGE n / N — VILLE` sans secteur | champ `secteur` par monument pour des pages thématiques |
| 6 | Accès au profil depuis le Carnet : la maquette n'en montre aucun (le carnet livré a un avatar) ; `AccueilV4` non fourni | conserver l'accès livré (avatar 44 px) tant qu'`AccueilV4` ne le remplace pas ; le sceau Z reste décoratif | lien dans la nav ou l'Explorer |
| 7 | « CARNET D'EXPLORATEUR · N°1 » : « N°1 » n'a pas de source et se lit comme un classement | supprimer « · N°1 » | le définir (tome ? rang ?) et le tester avec un lecteur d'écran |
| 8 | Succès : la maquette (« 12 / 40 », « Dame de fer », « Noctambule ») ≠ RG-R2-01 (11 succès) | afficher la liste et les noms de RG-R2-01 / `validation-succes-r2.md`, compteur `obtenus / 11` | ajouter ces succès au périmètre R2 |
| 9 | Carte et Défis dans la nav avant leur livraison | présents, mènent à un écran « Bientôt » (cinq emplacements stables) | masquer l'entrée et passer à 3 + 1 emplacements |
| 10 | Silhouettes : RG-R2-08 les demande dans les collections, la planche du carnet de la maquette n'en a pas ; la célébration regroupe les succès | silhouettes de type dans les collections seulement ; célébration d'un succès gagné en capture intégrée à la feuille O5 | pas de silhouettes ; feuille séparée après O5 |
| 11 | Déviations de forme justifiées par WCAG 2.2 : bordure de chip 3:1, piste d'interrupteur éteint bordée, nav inactive `gris-libelle`, nav opaque sans flou | appliquées | accepter les échecs 1.4.3 / 1.4.11 documentés ci-dessus |

Actions induites : le `tech-lead-front` amende l'ADR 0022 §7 (trait de rareté supprimé, forme/encre du §3.2) ; le `product-owner` marque `docs/design/carnet-r1.md` « remplacé par ce document » (je n'y ai pas touché) ; l'`amoa` écrit la règle de niveau (n° 3) si elle est validée.

