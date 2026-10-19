# ADR 0018 — Front : accessibilité WCAG 2.2 AA

- **Statut :** accepté
- **Date :** 2026-10-19

## Contexte

Le cahier (§12) impose que la rareté et l'état du bouton Tamponner ne passent jamais par la couleur seule. La story r0-socle-3 exige les contrastes AA et un focus visible. L'usage principal se fait dehors, au soleil, d'une main.

## Décision

Niveau visé : **WCAG 2.2 AA** sur tous les écrans. Règles pratiques applicables par `dev-frontend` :

- **Sémantique d'abord** : éléments natifs (`button`, `a`, `input`, `nav`, `main`, `dialog`), un seul `<h1>` par écran, `lang="fr"` sur `<html>`, `title` de route par écran (2.4.2).
- **Changement d'écran** : focus placé sur le `<h1>` après chaque navigation (ADR 0013), lien d'évitement « Aller au contenu ».
- **Focus** : `:focus-visible` avec un `outline` de 3 px marine décalé de 2 px. Le focus n'est jamais masqué par une barre fixe (2.4.11) : `scroll-padding-bottom` égal à la hauteur de la barre d'action.
- **Cibles** : ≥ 44 × 44 px (au-delà du minimum 2.5.8 de 24 px, à cause des usages au soleil et à une main).
- **Couleur** : jamais seule (1.4.1). Contrastes mesurés dans l'ADR 0016, avec la réserve sur l'ocre.
- **Formulaires** :
  - libellés visibles, `autocomplete` correct (`email`, `username`, `new-password`, `current-password`, `bday-*`) ;
  - erreurs : à la soumission, résumé en tête de formulaire (`role="alert"`, focus dessus) avec un lien vers chaque champ en erreur. Chaque champ affiche aussi son erreur (`aria-describedby`, `aria-invalid`). Pas de validation intrusive à chaque frappe ; validation à la sortie du champ ;
  - **authentification accessible (3.3.8)** : coller autorisé, gestionnaires de mots de passe compatibles, bouton « Afficher le mot de passe », aucun test cognitif ;
  - **saisie redondante (3.3.7)** : l'e-mail saisi à l'inscription est repris sur l'écran « vérifie ton e-mail » pour le renvoi.
- **Messages asynchrones** (enregistrement d'un consentement, renvoi d'un lien) : `role="status"`. Échecs : `role="alert"`.
- **Zoom et reflow (1.4.4, 1.4.10)** : tailles en `rem`, aucun `user-scalable=no`, mise en page à 320 px de large sans défilement horizontal.
- **Écart au cahier à signaler** : la règle « chaque écran tient sans défilement » (§12, RG-045) est un **objectif de conception** au zoom par défaut, sur le téléphone de référence (360 × 740). Ce n'est **pas** une contrainte technique : on n'écrit jamais `overflow: hidden` sur l'écran. À 200 % de zoom, ou clavier ouvert, l'écran **doit** défiler, faute de quoi on viole 1.4.4 et 1.4.10. Le formulaire d'inscription, avec ses 6 champs et ses 3 consentements, ne tient pas avec le clavier ouvert : voir le découpage en deux étapes dans `frontend.md`.
- **Mouvement** : `prefers-reduced-motion` (ADR 0017). Aucun clignotement.
- **Contrôle** :
  1. axe (Playwright) sur chaque écran, avec les tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` : **0 violation**, sinon la CI est rouge (ADR 0019) ;
  2. revue `qa` au clavier seul et au lecteur d'écran (VoiceOver iOS, TalkBack Android) avant `done`, parce que axe ne détecte qu'une partie des défauts.

## Alternatives écartées

- **Viser AAA** : ce n'est pas exigé, et le contraste AAA exclurait le bordeaux et le sapin sur certains textes secondaires sans gain proportionné.
- **Une bibliothèque de composants « accessibles » tierce** : les éléments natifs suffisent pour R0.

## Conséquences

- Chaque story d'écran comporte un test axe et une ligne de recette clavier et lecteur d'écran.
- Le découpage de l'inscription en deux étapes est soumis à `ux-designer`.
