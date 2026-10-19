# Règles de gestion — R0 « Socle » et R1 « Capturer »

Source de vérité : `cahier-des-charges.md` (CDC). Les valeurs marquées **[à valider]** sont des propositions par défaut, listées dans « Questions ouvertes ». Périmètre : R0 et R1 uniquement (rareté affichée, succès, XP, classement, carte, partage = R2+).

## Module Compte (RG-001 à RG-015)

**RG-001 — Compte obligatoire.** Il faut un compte pour utiliser l'appli (voir le catalogue, capturer). Seuls l'écran de bienvenue et les pages légales sont publics.
- Exemple : un visiteur qui ouvre l'appli voit « Bienvenue » puis « Crée ton carnet ».
- Cas limite : un lien direct vers une fiche monument sans session renvoie à la connexion, puis à la fiche.
- Source : §12 Onboarding.

**RG-002 — Âge minimum 15 ans.** À l'inscription, la date de naissance déclarée doit donner au moins 15 ans révolus ce jour-là. Sinon l'inscription est refusée, sans création de compte ni conservation de l'e-mail.
- Exemple : né le 19/10/2011, inscription le 19/10/2026 : acceptée. Né le 20/10/2011 : refusée.
- Cas limite : date dans le futur ou invalide : refusée. L'âge est déclaratif, non vérifié.
- Source : §5, §7.

**RG-003 — Consentements.** L'acceptation des CGU et de la politique de confidentialité est obligatoire. Les consentements facultatifs (classement, e-mails) sont décochés par défaut. Chaque consentement est enregistré avec sa date et sa version du texte.
- Exemple : inscription avec CGU cochées, le reste décoché : OK, aucun e-mail promotionnel envoyé.
- Cas limite : CGU non cochées : inscription impossible. Le classement n'existe qu'en R6 mais son consentement est déjà collecté (décoché).
- Source : §5, §7, §12.

**RG-004 — E-mail unique.** Une adresse e-mail ne peut servir qu'à un seul compte. Le message d'erreur ne révèle pas si l'adresse existe déjà **[à valider]**.
- Exemple : inscription avec une adresse déjà utilisée : message générique « Si cette adresse est valide, un e-mail t'a été envoyé ».
- Cas limite : majuscules/minuscules et espaces autour sont ignorés.
- Source : §5 (email), §7 sécurité.

**RG-005 — Pseudo unique.** Le pseudo est unique (sans tenir compte des majuscules/minuscules), de 3 à 20 caractères **[à valider]**. Un pseudo libéré par suppression de compte peut être réattribué.
- Exemple : « Marco » existe ; « marco » est refusé.
- Cas limite : pseudo offensant ou usurpant un tiers : hors périmètre R0/R1 (signalement obligatoire en R6).
- Source : §5.

**RG-006 — Mot de passe.** Au moins 12 caractères. Jamais affiché ni envoyé par e-mail ; conservé chiffré uniquement.
- Exemple : « chat-bleu-47-lune » (16) accepté ; « Abc123!xyz » (11) refusé.
- Cas limite : espaces et caractères accentués acceptés ; pas d'exigence de composition (majuscule, symbole) **[à valider]**.
- Source : §5, §7.

**RG-007 — Vérification de l'e-mail.** À l'inscription, un lien est envoyé à l'adresse. Le compte n'est « vérifié » qu'après clic sur ce lien. Le lien est à usage unique et expire (24 h **[à valider]**). L'explorateur peut demander un nouvel envoi, ce qui invalide l'ancien lien. Tant que l'e-mail n'est pas vérifié, la capture est impossible **[à valider]**.
- Exemple : clic dans les 24 h : « E-mail confirmé ».
- Cas limite : lien expiré ou déjà utilisé : message clair + renvoi proposé. Lien ouvert sur un autre appareil : fonctionne.
- Source : §3 R0, §7 sécurité.

**RG-008 — Connexion.** Connexion par e-mail + mot de passe. En cas d'échec, le message ne dit pas lequel des deux est faux. Pas de connexion Google/Apple en V1.
- Exemple : mauvais mot de passe : « E-mail ou mot de passe incorrect ».
- Cas limite : compte en cours de suppression (RG-014) : connexion refusée **[à valider]**.
- Source : §4, §7.

**RG-009 — Limite de tentatives de connexion.** Après 5 échecs consécutifs **[à valider]** sur un même compte, la connexion est bloquée 15 minutes **[à valider]**. Un succès remet le compteur à zéro.
- Exemple : 5 mauvais mots de passe, 6e essai avec le bon : refusé jusqu'à la fin du blocage.
- Cas limite : le blocage s'applique aussi aux adresses inexistantes (même message) pour ne rien révéler.
- Source : §7 sécurité.

**RG-010 — Session.** Une fois connecté, l'explorateur reste connecté sans ressaisir son mot de passe pendant une durée limitée (30 jours d'inactivité **[à valider]**). Déconnexion volontaire possible à tout moment. Changer de mot de passe (RG-011) ferme les autres sessions.
- Exemple : retour dans l'appli 5 jours plus tard : toujours connecté.
- Cas limite : session expirée en pleine capture : retour à la connexion sans perdre la photo prise si possible **[à valider]**.
- Source : §4.

**RG-011 — Mot de passe oublié.** L'explorateur demande un lien de réinitialisation par e-mail. Réponse identique que l'adresse existe ou non. Lien à usage unique, valable 1 h **[à valider]**. Le nouveau mot de passe respecte RG-006.
- Exemple : demande pour une adresse inconnue : même message de confirmation, aucun e-mail envoyé.
- Cas limite : plusieurs demandes successives : seul le dernier lien est valide.
- Source : §3 R0.

**RG-012 — Profil et consentements modifiables.** L'explorateur peut modifier son pseudo (RG-005), son mot de passe (RG-006) et activer/désactiver les consentements facultatifs. Retirer un consentement prend effet immédiatement.
- Exemple : coupe « e-mails » dans le profil : plus d'e-mail non indispensable.
- Cas limite : changement d'adresse e-mail : hors périmètre précisé, voir Q-14.
- Source : §7 droits, §12 Profil.

**RG-013 — Export des données.** L'explorateur peut télécharger ses données : fichier JSON (compte, consentements, captures) + archive des photos. La position GPS n'en fait pas partie (jamais stockée).
- Exemple : « Mes données » > Exporter : fichier prêt avec toutes ses captures.
- Cas limite : aucun tampon : export valide, sans photo.
- Source : §7.

**RG-014 — Suppression du compte.** L'explorateur demande la suppression depuis le profil, après confirmation explicite. Compte, captures et photos sont effacés définitivement au plus tard sous 30 jours.
- Exemple : demande le 1er ; plus aucune donnée le 30 au plus tard.
- Cas limite : annulation pendant le délai et pseudo/e-mail réutilisables pendant ce délai : voir Q-9.
- Source : §7.

**RG-015 — Inactivité.** Compte sans connexion depuis 3 ans : e-mail d'avertissement, puis suppression (RG-014) si l'explorateur ne se reconnecte pas dans un délai de 30 jours **[à valider]**.
- Exemple : dernière connexion le 01/01/2027 ; avertissement le 01/01/2030.
- Cas limite : e-mail non vérifié ou injoignable : suppression sans avertissement possible.
- Source : §7 conservation.

## Module Catalogue (RG-016 à RG-023)

**RG-016 — Villes et quotas paramétrables.** Le catalogue couvre les 10 plus grandes villes de France ; maximum 10 monuments par ville, Paris ~25-30. Villes et quotas se modifient dans `catalogue-quotas.yml`, sans interface d'admin.
- Exemple : passer Lyon de 10 à 12 puis relancer l'import ajoute au plus 2 monuments à Lyon.
- Cas limite : ville avec moins de monuments éligibles que son quota : on importe ce qui existe.
- Source : §2.

**RG-017 — Sélection par popularité.** Dans chaque ville, on retient les monuments les plus populaires (vues Wikipédia via Wikidata) jusqu'au quota. Sources : Mérimée + Wikidata/Wikipédia/Commons.
- Exemple : quota 10 : les 10 monuments aux plus fortes vues.
- Cas limite : égalité de popularité au dernier rang : départage reproductible (ordre alphabétique **[à valider]**).
- Source : §2, §5.

**RG-018 — Import relançable.** Relancer l'import sans changer la config ne crée aucun doublon ni ne modifie les numéros, rayons ajustés ou captures existantes. Un monument est identifié par ses identifiants Wikidata/Mérimée.
- Exemple : deux imports de suite : catalogue identique.
- Cas limite : un monument déjà capturé qui sort du quota ou des sources n'est jamais supprimé ni masqué à ceux qui l'ont capturé (voir Q-7).
- Source : §4, §5.

**RG-019 — Numéro fixe, jamais réutilisé.** Chaque monument reçoit un numéro à sa création ; il ne change plus et n'est jamais attribué à un autre monument. Un nouveau monument prend le numéro suivant.
- Exemple : 118 monuments (n° 1 à 118) ; le suivant ajouté est le n° 119.
- Cas limite : monument retiré du catalogue : son numéro reste réservé (trou dans la série).
- Source : §5.

**RG-020 — Rareté calculée à l'import.** Selon la popularité sur l'ensemble du catalogue : 5 % les plus populaires = Légendaire, 20 % suivants = Rare, le reste = Commun. Stockée avec le monument.
- Exemple : 120 monuments : 6 Légendaires, 24 Rares, 90 Communs.
- Cas limite : arrondi aux entiers (voir Q-8). Affichage de la rareté : R2, pas en R1 (voir Q-6).
- Source : §5.

**RG-021 — Rayon de capture.** 150 m par défaut, ajustable par monument (grand site, enceinte vaste). Le rayon ajusté survit aux imports.
- Exemple : Versailles réglé à 400 m.
- Cas limite : le rayon ne peut pas être inférieur à la précision GPS exigée de façon à rester jouable (valeur plancher à fixer, Q-15).
- Source : §5.

**RG-022 — Source et licence affichées.** Tout texte et toute image d'un monument est accompagné de sa source et de sa licence (ex. texte Wikipédia CC BY-SA ; chaque image Commons a sa licence), affichées sur la fiche. Un élément sans licence connue n'est pas importé : le monument s'affiche sans lui.
- Exemple : fiche avec « Texte : Wikipédia, CC BY-SA 4.0 ; Image : Wikimedia Commons, CC BY 3.0, auteur X ».
- Cas limite : image sans licence identifiable : silhouette utilisée à la place. Citation de l'auteur des images : obligatoire si la licence l'exige.
- Source : §5, §12.

**RG-023 — Contenu d'une fiche.** Un monument porte : numéro, nom, type, ville, stats (année, style, hauteur), texte histoire, image de référence. Les stats inconnues s'affichent « — », jamais d'invention.
- Exemple : hauteur inconnue : « Hauteur : — ».
- Cas limite : sans texte histoire, la section histoire indique « Histoire à venir » après capture **[à valider]**.
- Source : §3 R1, §5.

## Module Capture (RG-024 à RG-040)

**RG-024 — Monuments à proximité.** « Tamponner » liste les monuments à moins de 2 km de l'explorateur, du plus proche au plus lointain.
- Exemple : 3 monuments à 300 m, 900 m, 1,8 km : 3 lignes.
- Cas limite : aucun monument à 2 km : message « Rien à tamponner près de toi » + accès au carnet.
- Source : §6.1.

**RG-025 — État du bouton Tamponner.** Gris « > 2 km » (aucun monument à moins de 2 km) ; bordeaux + distance (« 420 m ») si un monument est proche ; halo vert « Tamponner » dans la zone de capture. L'état n'est jamais porté par la couleur seule.
- Exemple : à 100 m d'un monument de rayon 150 m : halo vert.
- Cas limite : le bouton est indicatif ; seul le serveur décide (RG-029).
- Source : §12 Navigation v4, Onboarding.

**RG-026 — Photo en direct uniquement.** La photo est prise avec la caméra de l'appli ; l'import depuis la galerie est impossible. La caméra n'est demandée qu'au premier appui sur Tamponner.
- Exemple : l'écran de capture n'offre pas de bouton « Galerie ».
- Cas limite : caméra refusée : message expliquant pourquoi et comment l'activer ; pas de capture possible.
- Source : §6.2, §12.

**RG-027 — Lecture de la position.** La position et sa précision sont lues au moment de la photo. Sans autorisation, la capture est impossible, avec explication et marche à suivre.
- Exemple : GPS refusé : « Zonumental a besoin de ta position pour vérifier que tu es devant le monument. Voici comment l'activer. »
- Cas limite : autorisation donnée « une fois » seulement : redemandée au prochain appui.
- Source : §6.3, tableau d'erreurs.

**RG-028 — Image acceptée.** Le fichier doit être réellement une image (format JPEG/PNG/WebP **[à valider]**) de 5 Mo maximum. L'image est réduite à ~1600 px sur le côté long avant envoi.
- Exemple : photo 1600 px de 800 Ko : acceptée.
- Cas limite : fichier renommé en .jpg mais non-image, ou > 5 Mo : refusé avec message.
- Source : §6.4-5, §7.

**RG-029 — Ordre des contrôles.** Le serveur vérifie, dans cet ordre et en s'arrêtant à la première erreur : connexion, format et taille de l'image, limite de fréquence, précision GPS, distance, vitesse plausible. Aucune vérification n'est faite uniquement côté appli.
- Exemple : explorateur trop loin avec GPS imprécis : message « signal trop faible » (précision avant distance).
- Cas limite : e-mail non vérifié (RG-007) : refusé avant tout autre contrôle **[à valider]**.
- Source : §6.5, §6 anti-triche.

**RG-030 — Limite de fréquence.** Un explorateur ne peut pas valider plus de 10 captures par heure glissante **[à valider]**. Au-delà : refus avec le délai avant le prochain essai possible.
- Exemple : 11e capture en 40 min : « Doucement, explorateur ! Reviens dans 20 min ».
- Cas limite : seules les captures validées comptent ; remplacements de photo, voir Q-5.
- Source : §6 anti-triche.

**RG-031 — Précision GPS.** La capture est refusée si la précision annoncée est supérieure à 100 m (donc > 100). Message : « Signal trop faible, réessaie à découvert ».
- Exemple : précision 30 m : OK ; 100 m : OK ; 101 m : refusé.
- Cas limite : précision absente : traitée comme imprécise.
- Source : §6.5, tableau d'erreurs.

**RG-032 — Distance au monument.** La capture est acceptée si la distance mesurée est inférieure ou égale au rayon de capture du monument (150 m par défaut). Sinon : « Tu es à 420 m, rapproche-toi ! » avec flèche de direction. Distance affichée arrondie à 10 m **[à valider]**.
- Exemple : rayon 150 m, distance 150 m : OK ; 151 m : refusé.
- Cas limite : la distance utilise la position annoncée, sans marge ajoutée pour la précision.
- Source : §5, §6.5, tableau d'erreurs.

**RG-033 — Vitesse plausible.** Le déplacement entre le monument de la capture précédente et le monument visé, divisé par le temps écoulé, ne doit pas dépasser 300 km/h **[à valider]** en ligne droite. Sinon refus. Le contrôle utilise les positions des monuments, pas celles de l'explorateur.
- Exemple : Paris puis Marseille (660 km) 10 min plus tard : refusé. Paris puis Lyon 3 h plus tard : accepté.
- Cas limite : première capture, aucun contrôle. Deux monuments proches : pas de refus quel que soit le délai.
- Source : §6.5, §7, §6 anti-triche.

**RG-034 — Une capture par monument et par joueur.** Un explorateur capture chaque monument une seule fois ; une 2e tentative n'est pas une nouvelle capture (voir RG-035). Pas de rattrapage ni de récompense en double.
- Exemple : capturer la tour Eiffel (n° 1) deux fois : le carnet compte 1 tampon.
- Cas limite : deux requêtes simultanées pour le même monument : une seule capture créée.
- Source : §5.

**RG-035 — Remplacement de la photo souvenir.** Sur un monument déjà capturé, l'explorateur peut remplacer la photo, sans récompense supplémentaire. La date de capture d'origine est conservée. Les contrôles RG-026 à RG-032 s'appliquent (photo en direct, zone, précision).
- Exemple : nouvelle photo en meilleure lumière : l'ancienne est supprimée, le tampon reste.
- Cas limite : remplacement refusé (trop loin) : l'ancienne photo reste. Vitesse et fréquence : voir Q-5.
- Source : §6 tableau d'erreurs « Déjà capturé ».

**RG-036 — Position jamais stockée.** La position GPS n'est jamais conservée. Seule la distance mesurée est enregistrée avec la capture. Elle n'apparaît ni dans les journaux applicatifs, ni dans l'export.
- Exemple : après une capture, aucune coordonnée de l'explorateur n'existe dans les données.
- Cas limite : la précision GPS n'est pas non plus conservée **[à valider]**.
- Source : §7.

**RG-037 — Photo nettoyée et privée.** La photo est réencodée à l'enregistrement (métadonnées EXIF, dont GPS, supprimées). Elle n'est visible que de son auteur ; aucune galerie publique.
- Exemple : une photo issue d'un téléphone n'a plus de coordonnées intégrées.
- Cas limite : le partage (R4) est une action volontaire hors R1.
- Source : §6.6, §7.

**RG-038 — Résultat d'une capture réussie.** La capture est enregistrée (explorateur, monument, date, distance, photo). Le monument passe de silhouette à tampon dans le carnet, la section histoire se débloque, une animation de déblocage s'affiche puis la fiche. En R1, il n'y a pas de succès (R2).
- Exemple : premier tampon : animation, fiche déverrouillée, invitation « voir le carnet ».
- Cas limite : échec du stockage de la photo : aucune capture enregistrée, l'explorateur peut réessayer.
- Source : §6.6-8, §3 R1.

**RG-039 — Messages d'erreur de capture.** Chaque refus affiche un message distinct et actionnable : trop loin (distance + direction), GPS refusé (pourquoi + comment activer), GPS imprécis, déjà capturé (proposition de remplacement), fréquence (délai), déplacement impossible, image invalide, caméra refusée. Le texte n'accuse jamais de triche.
- Exemple : refus de vitesse : « On dirait que tu as voyagé vite ! Réessaie un peu plus tard. » **[formulation à valider]**
- Cas limite : plusieurs erreurs possibles : seule la première dans l'ordre RG-029 est affichée.
- Source : §6 tableau d'erreurs.

**RG-040 — Pas de réseau.** Sans réseau, l'appli l'indique clairement et propose « Réessayer ». Aucune capture n'est mise en file d'attente hors-ligne en R1 ; la photo prise peut être renvoyée tant que l'écran reste ouvert.
- Exemple : mode avion : « Pas de connexion. Réessayer ».
- Cas limite : coupure en cours d'envoi : aucune capture partielle (RG-038).
- Source : §6 tableau d'erreurs.

## Module Carnet / Progression R1 (RG-041 à RG-045)

**RG-041 — Carnet numéroté.** Le carnet liste tous les monuments du catalogue par numéro. Capturé = tampon (numéro, nom, type) ; non capturé = silhouette avec son numéro.
- Exemple : 118 cases, 5 tampons, 113 silhouettes.
- Cas limite : trou de numérotation (RG-019) : pas de case vide, la série est simplement discontinue.
- Source : §3 R1, §12.

**RG-042 — Fiche d'un monument non capturé.** Affiche numéro, type et ville ; nom et image selon décision Q-4 (proposition : nom masqué, silhouette). Section histoire verrouillée.
- Exemple : fiche n° 12 : « ??? » + indice de type, bouton « Aller le tamponner ».
- Cas limite : un monument proche, même non capturé, montre sa distance.
- Source : §3 R1.

**RG-043 — Section histoire débloquée.** Visible uniquement après capture ; reste visible ensuite définitivement. Elle affiche sa source et sa licence (RG-022).
- Exemple : avant : cadenas ; après : texte complet.
- Cas limite : suppression du compte : disparaît avec lui.
- Source : §3 R1, §12.

**RG-044 — Compteur de progression.** Le carnet affiche « n tampons sur N monuments » où N est le nombre de monuments du catalogue au moment de la consultation.
- Exemple : 5 / 118. Après ajout d'un monument : 5 / 119.
- Cas limite : pas de pourcentage trompeur à 0 monument.
- Source : §3 R1.

**RG-045 — Jour 0 et densité progressive.** Sans tampon : guide en 3 étapes et cases vides ; pas de filtres (ils apparaissent vers 20 tampons), pas de défis ni collections en R1. Chaque écran tient sans défilement.
- Exemple : nouveau compte : Explorer montre le guide, le carnet des cases vides.
- Cas limite : seuil d'apparition des filtres : « environ 20 » (Q-13).
- Source : §12.

## Questions ouvertes

Chacune porte une proposition par défaut, à valider par le PO / client. Les valeurs précédées de **[à valider]** ci-dessus en dépendent.

| # | Question | Proposition par défaut |
| --- | --- | --- |
| Q-1 | Limite de fréquence (CDC : « limitée », sans valeur) | 10 captures validées par heure glissante |
| Q-2 | Vitesse plausible (CDC : exemple 500 km en 10 min) | 300 km/h moyenne en ligne droite (permet le TGV) |
| Q-3 | Durée de validité des liens : vérification e-mail / mot de passe oublié | 24 h / 1 h, usage unique |
| Q-4 | Que voit-on d'un monument non capturé : nom, image ? | Numéro, type, ville ; nom et image masqués |
| Q-5 | Le remplacement de photo compte-t-il dans la fréquence et la vitesse ? | Fréquence : oui ; vitesse : non |
| Q-6 | La rareté est calculée à l'import (R0) mais « Rareté » est en R2 : l'affiche-t-on dès R1 ? Contradiction apparente avec la règle d'accessibilité (rareté en toutes lettres dans le tampon). | Non affichée en R1 ; stockée seulement |
| Q-7 | Un monument qui sort du quota ou des sources : retiré ? | Jamais supprimé ; reste visible, numéro conservé, sans nouvelle capture si retiré |
| Q-8 | Arrondi des 5 % / 20 % et recalcul de la rareté aux imports suivants | Arrondi à l'entier le plus proche ; recalcul à chaque import uniquement pour les nouveaux monuments, les existants gardent leur rareté |
| Q-9 | Suppression : compte désactivé immédiatement ? annulable ? e-mail/pseudo réutilisables ? | Désactivation immédiate, annulation possible pendant 30 j en se reconnectant, pseudo/e-mail libérés à la suppression définitive |
| Q-10 | Un compte non vérifié peut-il capturer ? (CDC §7 « email vérifié » vs onboarding qui mène au 1er tampon sans mention de la vérification) | Peut explorer, ne peut pas capturer avant vérification |
| Q-11 | Durée de session, nombre d'échecs et durée de blocage de connexion | 30 j d'inactivité ; 5 échecs ; blocage 15 min |
| Q-12 | Pseudo : longueur, caractères autorisés, règles de contenu | 3-20 caractères, lettres/chiffres/tiret/souligné |
| Q-13 | Seuil d'apparition des filtres du carnet (« environ 20 ») | 20 tampons |
| Q-14 | Changement d'adresse e-mail dans le profil (non cité par le CDC) | Hors R0/R1 |
| Q-15 | Rayon de capture minimal et maximal admis | Min 50 m, max 500 m |
| Q-16 | Liste exacte des 10 villes et quota de Paris (CDC §11, à proposer par l'AMOA) | À produire dans `catalogue-quotas.yml` : 10 plus grandes villes par population, Paris 25 |
| Q-17 | Définition de « page » du carnet : le CDC ne l'emploie pas | Une page = une ville ; les 10 villes = 10 pages ; ordre par numéro |
| Q-18 | Numérotation initiale : dans quel ordre les premiers numéros sont-ils attribués ? | Par popularité décroissante à la première import (n° 1 = le plus populaire) |
| Q-19 | Nom de la collection (« Pokédex » = marque) et libellé « Explorer » / « Accueil » | En attente du PO ; la documentation dit « carnet » |
| Q-20 | Formats d'image acceptés | JPEG, PNG, WebP |
| Q-21 | Comportement si l'explorateur change d'appareil / de navigateur en pleine capture (session expirée) | Reconnexion puis nouvelle prise de photo |
| Q-22 | Mot de passe ≥ 12 caractères, pseudo unique et âge ≥ 15 ans sont partiellement hors CDC (pseudo unique et 12 caractères non écrits) | Retenus comme consignes AMOA ; à faire confirmer |
