# Écarts maquettes v4-v6 : écrans restants

Source : canvas « Zonumental — Directions artistiques » (copies dans `maquettes-v4-v6/`). Carnet, Profil, Collections, Succès, NavBar : déjà fidèles (hors périmètre). Gravité H/M/F ; effort en points (pts). Analyse statique, rien lancé.

## Onboarding

### O1 Bienvenue (`/bienvenue`, `compte/bienvenue`)
| Écart | Gravité | Pts |
|---|---|---|
| Photo Arc de Triomphe (540 px) + dégradé haut remplacés par un aplat marine (shortcut licence) | H | 2 (visuel) + décision D1 |
| Papier/grain absent sur la feuille ; ombre haute `0 -12 30 -14` à vérifier | F | 0,5 |
| Tampon : sous-titre « TON CARNET T'ATTEND » au lieu de « 118 MONUMENTS À TAMPONNER » ; pas d'encre irrégulière (filtre `inkO1`), position (maquette : chevauche la photo, top 418 px) | M | 1 |
| Lien « J'ai déjà un carnet » en bouton secondaire, maquette : lien texte marine 44 px | F | 0,5 |
| Libellé « CARNET D'EXPLORATEUR » : OK. Titre 46 px : OK | - | - |

### O6 Compte (`/inscription`)
| Écart | Gravité | Pts |
|---|---|---|
| Champs, aides, consentements, en-tête « Étape 1 / 2 » : conformes | - | - |
| Retour (chevron 44 px) à vérifier ; mention RGPD du pied (« Export ou suppression… Hébergé dans l'UE ») à vérifier | F | 0,5 |
| Fond papier texturé absent | F | (cf. transversal) |

### O2 Localisation (`/inscription/localisation`)
| Écart | Gravité | Pts |
|---|---|---|
| Illustration : viewBox 342x220 (maquette 342x260), couleurs rayon/anneaux à aligner (`#2F5D4A` pointillé, `#1F3A5F`), filtre d'encre du tampon absent | F | 0,5 |
| Engagements : 3 textes différents (« Jamais enregistrée / Seule la distance / Rien d'autre ») ; maquette : « Seulement appli ouverte / Jamais enregistrée / Réversible » | M | 0,5 (+ D2) |
| États refus/délai/indisponible : ajouts utiles absents de la maquette (conservés) | - | - |

### O3 Caméra (sheet « Dernière étape : la caméra »)
| Écart | Gravité | Pts |
|---|---|---|
| Aucun équivalent : la caméra est demandée directement par `Camera.ngOnInit` au clic « Aller le tamponner » | H | 3 |
| Sheet : fond flou de la photo, icône appareil, « TON PREMIER TAMPON », texte « photo en direct uniquement », « Autoriser la caméra » / « Pas maintenant » | H | inclus |

### O4 Hors zone et O5 Garde-tampon
- O4 : voir Capture. O5 Garde-tampon : copié, traité avec la célébration (déjà livré, fidelite-4).

## Explorer / Accueil (`/explorer`, `features/explorer/explorer.ts`) — écart le plus fort
| Écart | Gravité | Pts |
|---|---|---|
| Écran livré = `<h1>Explorer</h1>` + liste 3 étapes ou lien « Dernier tampon » sans style (`coquille.css`) | H | - |
| En-tête : date mono + « Bonjour, [pseudo] » (Gloock 28) ; « Bienvenue » au jour 0 | H | 1 |
| Anneau de niveau (cercle 50 px, arc bordeaux, niveau au centre) vers le profil, à la place de l'icône générique | H | 1 |
| Carte héros 340 x 440/470 px : photo, chip « N°005 · À DÉCOUVRIR », pastille de rareté, kicker (TON PREMIER TAMPON T'ATTEND / LE PLUS PROCHE / IL TE MANQUE ENCORE), nom Gloock 40, distance + temps à pied, bouton « Y aller » ; aperçu 60 px du suivant (carrousel) | H | 5 |
| Bloc « COMMENT ÇA MARCHE » 3 étapes (jour 0) : livré en liste brute | M | 1 |
| Carte Défi en cours (3 pastilles, nom, reste, compteur) | H | 2 (+ backend défis) |
| Ligne « Dernier tampon · X, hier » avec tampon encre | M | 1 |
| Papier/grain, ombres, filtres d'encre | F | transversal |
| Accessibilité : maquette donne `aria-label` anneau « Niveau N, ouvrir le profil » ; livré « Mon profil » | F | 0 |

## Tamponner (`/tamponner`) et NavBar
| Écart | Gravité | Pts |
|---|---|---|
| Liste radio brute de monuments < 2 km ; la maquette n'a pas de liste : le bouton central ouvre « le plus proche » (loin) ou la caméra (proche/zone) | H | 2 (routage par état de la nav) |
| NavEtats : trois états (loin gris, proche bordeaux + distance, zone halo vert) : `zn-navigation` les gère déjà (`data-etat`), à confirmer le branchement dans `app.html` | F | 0,5 |

## Fiche monument (`/monument/:numero`, `monument/fiche.ts`)
| Écart | Gravité | Pts |
|---|---|---|
| Structure maquette : photo 360 px en haut, boutons ronds Retour/Partager, feuille arrondie, kicker « N°001 · PARIS 7ᵉ », titre Gloock 42, pastilles rareté + type, trio ANNÉE/HAUTEUR/MATÉRIAU (3 colonnes), histoire, bloc succès « Dame de fer », CTA « Partager ma page » + rejouer. Livré : `<h1>`, `<p>`, `<dl>` sans mise en forme | H | 5 |
| Tampon encré animé sur la photo (`zf-press`, `reduced-motion` géré dans la maquette) : le composant `app-celebration` existe, pas le tampon de la fiche | M | 2 |
| Stats : livré Année/Style/Hauteur ; maquette Année/Hauteur/**Matériau** | M | décision D3 + backend |
| Bloc « Dame de fer » (succès lié) absent de la fiche | M | 1 (backend `mes-succes` existe) |
| Bouton Partager absent | H | cf. Partage |
| Fiche non capturée (verrouillée, N&B) : pas de maquette dans le canvas lu (V2-Fiche = état capturé) | M | D4 |

## Capture (`/monument/:numero/capturer`, `monument/camera.ts`)
| Écart | Gravité | Pts |
|---|---|---|
| Écran livré : `<h1>Prendre la photo</h1>` + `<video>` 70 dvh + boutons texte | H | - |
| Plein écran sombre, flux plein cadre, dégradés haut/bas | H | 2 |
| Pastille de statut « Dans la zone · 84 m » (point vert pulsant) / « Hors zone · 420 m » (ocre) en direct, depuis `Position` + `Proximite` | H | 2 |
| Cadre à 4 coins, bloc monument (N°, rareté, ville, nom Gloock 40, consigne « Cadre le monument entier… ») | M | 1 |
| Déclencheur 80 px (blanc) ; hors zone : verrouillé (cadenas, `aria-disabled`) + « encore 270 m » ; boutons flash et changement de caméra, accès carnet | H | 2 |
| Hors zone : carte boussole (flèche vers le monument, distance, temps à pied) : la logique de cap existe (`capVers`, `POINTS`), seul le rendu manque | M | 1 |
| Erreurs métier (`refusDe`) : textes riches déjà livrés, à intégrer au nouveau gabarit | F | 0,5 |

## Partage (V2-Partage) : story 1080 x 1920 (« page de carnet »)
Aucun équivalent livré (ni route, ni bouton). Page 405 x 720 : photo souvenir, tampon « CAPTURÉ », nom, ville, pseudo, « 38 / 118 en France », ligne MRZ, guillochis.
| Écart | Gravité | Pts |
|---|---|---|
| Rendu de l'image (canvas ou SVG vers PNG), Web Share API / téléchargement | H | 5 |
| Consentement : le pseudo partagé suppose l'accord « classement »/partage | M | D5 |

## Carte (`/carte` = `Bientot`) : écran « Bientôt disponible », aucun équivalent
| Écart | Gravité | Pts |
|---|---|---|
| Carte Paris : fond plan, brouillard masqué par cercles autour des tampons (masque SVG), épingles obtenues (tampon encré) / à faire (rond + numéro), position utilisateur, bouton recentrer, carte du monument le plus proche | H | 8 (à scinder) |
| Carte France : silhouette, villes (compteurs `6/28`, `0/10`), halo Paris, résumé « 1 ville dévoilée sur 10 », hachures | H | 5 |
| Bascule Paris / France (tablist) + pastille « Paris dévoilé à 21 % » | M | 1 |

## Défis et classement (`/defis` = `Bientot`) : aucun équivalent
| Écart | Gravité | Pts |
|---|---|---|
| Carte « Défi de la semaine » (minuteur, nom, compteur, pastilles, récompense) | H | 3 |
| Classement 3 portées (Amis/Paris/France), lignes (rang, médaille, avatar, score, tendance), ligne « Toi » surlignée, trous « ··· » | H | 5 |
| État lancement : seuil « 50 explorateurs », progression 23/50, invitation d'amis | M | 3 |
| Mention de confidentialité (pseudo seulement si accepté) | F | 0,5 |

## Transversal
| Écart | Gravité | Pts |
|---|---|---|
| Fond « papier » (filtre `paperX`) : présent sur les écrans refaits (`papier.webp`), absent sur Explorer/Fiche/Capture/Défis | F | 0,5 |
| Filtre d'encre sur tampons SVG (`ink*`) : à mutualiser dans `tampon.ts` | F | 1 |

## Découpage proposé (<= 5 pts, par visibilité)
1. **onb-1** Bienvenue : photo ou illustration (D1), tampon, lien texte, papier (3).
2. **onb-2** Compte + Localisation : finitions et engagements (D2) (1).
3. **onb-3** Sheet « Autoriser la caméra » avant la 1re capture (3).
4. **exp-1** Accueil : en-tête, anneau de niveau, bloc jour 0 (3).
5. **exp-2** Accueil : carte héros « le plus proche » + « Y aller » (5).
6. **exp-3** Accueil : défi en cours + dernier tampon (3, dépend de défis-2 pour le défi).
7. **nav-1** Bouton Tamponner : ouvre le plus proche / la caméra ; suppression de la liste `/tamponner` (2).
8. **fiche-1** Fiche capturée : gabarit maquette, trio de stats, pastilles (5).
9. **fiche-2** Tampon animé + bloc succès + bouton Partager (3).
10. **cap-1** Capture : plein écran, pastille de statut, cadre, bloc monument (5).
11. **cap-2** Capture : déclencheur verrouillé, boussole hors zone, flash/caméra (4).
12. **part-1** Carte à partager (image + Web Share) (5).
13. **carte-1** Carte Paris statique (épingles + brouillard) (5), **carte-2** position, recentrer, carte du plus proche (3), **carte-3** carte France (5).
14. **defis-1** Défi de la semaine (3), **defis-2** classement actif (5), **defis-3** état lancement + invitation (3).

Total estimé : environ 60 pts.

## Décisions client (défaut recommandé)
- D1 Photo de Bienvenue : licence vérifiée requise. Défaut : photo Wikimedia Commons libre du Louvre/Arc avec crédit, sinon illustration vectorielle.
- D2 Engagements de localisation : « appli ouverte / jamais enregistrée / réversible » (maquette) ; à vérifier avec RGPD (le front dit « seule la distance » : exact côté serveur ?). Défaut : maquette.
- D3 « Matériau » vs « Style » dans la fiche. Défaut : maquette (Matériau), donnée à ajouter.
- D4 Fiche non capturée (verrouillée) : maquette à produire. Défaut : même gabarit, photo N&B, stats masquées.
- D5 Partage : pseudo visible dans l'image ? Défaut : pseudo uniquement si consentement classement, sinon « Explorateur ».
- D6 Défis/classement et carte France hors v1 ? Défaut : garder « Bientôt » pour France et classement ; livrer Paris et défi de la semaine.

## Dépendances backend (à confirmer, aucun endpoint trouvé)
- Niveau et progression d'anneau (profil) : `ring`, niveau N.
- Défis : défi courant, créneaux, échéance, récompense ; classement par portée (amis/Paris/France), tendance, seuil de lancement ; amis/invitations. Aucun code `defi`/`classement` côté API (seul le consentement classement existe).
- Monument le plus proche avec distance et temps à pied (calculable côté client avec `position` + `rayonCaptureMetres`).
- Matériau (champ `stats`), numéro de ville par monument (compteur `6/28`), total par ville et pour la France (118).
- Zones dévoilées de la carte (dérivable des captures : `captureeLe` + `position`), fond de carte (tuiles ou SVG statique).
- Données de partage : rang « 38 / 118 » (dérivable de `mes-collections`).
