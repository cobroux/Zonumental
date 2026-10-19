# ADR 0016 — Front : design system « Carnet d'explorateur » en CSS natif

- **Statut :** accepté (réserve sur l'ocre, à valider par `ux-designer` et le client)
- **Date :** 2026-10-19

## Contexte

Le §12 fixe la direction B « Carnet d'explorateur » : Gloock, Geist, Geist Mono ; papier `#F4F1EA`, encre `#1A1C20`, marine `#1F3A5F`, bordeaux `#8C2F39`, sapin `#2F5D4A`, ocre `#B07A2A` (réservé au légendaire) ; guilloches. Le §10 interdit Material tel quel, les dégradés violets, les emojis comme icônes et les cartes arrondies toutes identiques. La story r0-socle-3 exclut de R0 les tampons, les silhouettes et la barre à 5 onglets.

## Décision

**Tokens** : définis une seule fois, en propriétés CSS dans `shared/styles/tokens.css`, importés par `styles.css`. Pas de Sass, pas de Tailwind : le CSS natif (custom properties, imbrication, `clamp()`) suffit.

| Groupe | Tokens |
| --- | --- |
| Couleurs | `--zn-papier #F4F1EA`, `--zn-encre #1A1C20`, `--zn-marine #1F3A5F`, `--zn-bordeaux #8C2F39`, `--zn-sapin #2F5D4A`, `--zn-ocre #B07A2A`, `--zn-encre-douce` (texte secondaire, ≥ 4,5:1 sur papier, valeur à fixer par `ux-designer`) |
| Rôles | `--zn-fond`, `--zn-texte`, `--zn-action` (bordeaux), `--zn-succes` (sapin), `--zn-erreur` (bordeaux), `--zn-focus` (marine). Les composants utilisent les **rôles**, jamais les couleurs brutes. |
| Espacements | base 4 px : `--zn-esp-1` 4, `-2` 8, `-3` 12, `-4` 16, `-6` 24, `-8` 32, `-12` 48 |
| Typographie | `--zn-police-titre` Gloock, `--zn-police-ui` Geist, `--zn-police-mono` Geist Mono ; échelle `--zn-taille-0` 16 px (taille minimale d'un champ, sinon iOS zoome) jusqu'à `--zn-taille-4` en `clamp()` |
| Formes | `--zn-rayon` 2 px (papier découpé, pas de « cartes arrondies »), `--zn-trait` 1 px encre ; pas d'ombre portée générique |
| Mouvement | `--zn-duree-courte` 120 ms, `--zn-duree` 200 ms, `--zn-courbe` `cubic-bezier(0.2, 0, 0, 1)` (voir ADR 0017) |

`color-scheme: light`, pas de thème sombre : le papier fait partie de l'identité et le cahier n'en demande pas.

**Contrastes mesurés** sur le papier `#F4F1EA` (formule WCAG) : encre 15,1:1 ; marine 10,2:1 ; bordeaux 7,2:1 ; sapin 6,7:1 ; **ocre 3,3:1**. L'ocre **échoue** l'AA pour du texte courant (seuil 4,5:1). Il passe pour du texte de grande taille (≥ 24 px) et pour des éléments graphiques (≥ 3:1).
→ **Écart à signaler** : pour écrire « Légendaire » en toutes lettres (règle UX du conseil), il faut soit du texte ≥ 24 px, soit une variante texte plus sombre, par exemple `#8A5E1E` (5,0:1). Décision à prendre par `ux-designer` et le client avant R1. R0 n'utilise pas l'ocre.

**Polices** : auto-hébergées via `@fontsource/gloock`, `@fontsource-variable/geist` et `@fontsource-variable/geist-mono` (5.3.0, licence OFL-1.1, vérifié sur npm). On importe **le sous-ensemble `latin` uniquement**, qui couvre le français (é, è, ç, œ, «, », espace fine insécable). Les fichiers sont copiés et hachés par le build, servis depuis notre origine (pas de Google Fonts, donc pas de transfert d'adresse IP hors UE), et mis en cache par le service worker. `font-display: swap`.

**Composants R0** (`shared/ui/`). Ils s'appuient sur les éléments HTML natifs : on stylise l'élément, on ne le réimplémente pas.

| Composant | Forme | Notes |
| --- | --- | --- |
| Bouton | `button[znBouton]`, `a[znBouton]` (sélecteur d'attribut) | variantes `principal`, `secondaire`, `danger` ; état `occupé` (`aria-busy`, libellé conservé) ; cible ≥ 44 × 44 px |
| Champ | `<zn-champ>` qui projette un `<input>` natif | libellé visible, aide, erreur liée par `aria-describedby`, `aria-invalid`, icône et texte d'erreur (jamais la couleur seule) ; variante mot de passe avec bouton « Afficher » |
| Date de naissance | 3 champs jour / mois / année (`inputmode="numeric"`, `autocomplete="bday-day|bday-month|bday-year"`) | un sélecteur de date natif est pénible pour remonter de 20 ans |
| Case à cocher | `input[type=checkbox][znCase]` | consentements, avec le lien vers le texte légal dans le libellé |
| Interrupteur | `input[type=checkbox][role=switch][znInterrupteur]` | profil (r0-socle-11), enregistrement immédiat |
| Message | `<zn-message type="erreur|succes|info">` | icône et texte ; `role="alert"` pour les erreurs, `role="status"` pour le reste |
| Lien | styles globaux de `a` | souligné, focus visible |
| Écran | `<zn-ecran>` | gabarit d'un écran : barre haute (retour, avatar), `<h1>`, zone de contenu, zone d'action en bas, `100dvh` |
| Icône | `<svg><use href="/icons.svg#…">` | sprite unique, un seul détail intérieur par icône (§12), `aria-hidden` ; le libellé porte le sens |

**Spécifiés ici, implémentés en R1** (exclus de R0 par r0-socle-3) :
- **NavBar** `<zn-nav>` : `<nav aria-label="Navigation principale">`, 5 entrées (Explorer · Carnet · [Tamponner] · Carte · Défis), libellés toujours visibles, `aria-current="page"`, barre couleur papier, hauteur 64 px plus `env(safe-area-inset-bottom)`. Bouton central : entrée `etat: 'loin' | 'proche' | 'zone'` et `distanceM`, avec un libellé **toujours textuel** (« > 2 km » / « 420 m » / « Tamponner ») ; gris → bordeaux → halo sapin. Il n'est **jamais `disabled`** : à l'état « loin », il ouvre l'écran « Rien à tamponner près de toi » (RG-024). Nom accessible complet (« Tamponner, monument le plus proche à 420 m »), pas de `aria-live` (la position change trop souvent). Le composant reçoit l'état en entrée et ne lit pas le GPS lui-même.
- **Chip de rareté** `<zn-rarete>` : le texte « Commun », « Rare » ou « Légendaire » est toujours écrit, l'encre de la rareté est un plus. Contraste de l'ocre : voir plus haut.

**Finition (exigence de qualité UI)** : retour de pression `:active { transform: scale(0.97) }` en `--zn-duree-courte` ; survol seulement sous `@media (hover: hover)` ; `touch-action: manipulation` ; pas de transition sur le focus ; `text-wrap: balance` sur les titres ; `font-variant-numeric: tabular-nums` sur les nombres ; espaces fines insécables avant `; : ! ?` et dans les guillemets français.

**Page de démonstration** `/design-system` (fonctionnalité `design-system`), déclarée seulement si `isDevMode()`. Elle sert de base aux tests axe des composants.

## Alternatives écartées

- **Angular Material / CDK pour le style** : interdit par le §10. Le CDK reste admissible plus tard pour un comportement complexe (piège de focus d'un dialogue), mais ce n'est pas nécessaire en R0 : `<dialog>` natif suffit.
- **Tailwind** : il disperse les tokens dans les templates et ajoute un outil. Le CSS natif est suffisant.
- **Polices copiées à la main** : on perd le suivi de version et de licence par Dependabot, pour un gain nul.

## Conséquences

- Tout écran utilise les rôles et les composants de `shared/ui`. La revue refuse les couleurs en dur hors de `tokens.css`. Un simple `grep` en CI (motif `#[0-9a-fA-F]{3,8}` dans `src/app/**/*.css` sauf `tokens.css`) suffit, sans ajouter Stylelint.
- Le logo, les icônes définitives et les guilloches sont fournis par `ux-designer` en SVG optimisés.
