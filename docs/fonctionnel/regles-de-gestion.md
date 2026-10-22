# Règles de gestion — R0 « Socle » et R1 « Capturer »

Source de vérité : `cahier-des-charges.md` (CDC). Les valeurs marquées **[à valider]** sont des propositions par défaut, listées dans « Questions ouvertes ». Périmètre : R0 et R1 uniquement (succès, XP, classement, carte, partage = R2+). Décisions client du 2026-10-19 : voir « Décisions » en fin de document ; toutes les valeurs **[à valider]** restantes sont validées par défaut.

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

**RG-007 — Vérification de l'e-mail.** À l'inscription, un lien est envoyé à l'adresse. Le compte n'est « vérifié » qu'après clic sur ce lien. Le lien est à usage unique et expire (24 h **[à valider]**). L'explorateur peut demander un nouvel envoi, ce qui invalide l'ancien lien. Tant que l'e-mail n'est pas vérifié, la capture est impossible (décision client, Q-10).
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
- Cas limite : arrondi aux entiers (voir Q-8). Affichage de la rareté : dès R1, en toutes lettres dans le tampon et sur la fiche (décision client, Q-6).
- Source : §5.

**RG-021 — Rayon de capture.** 150 m par défaut, ajustable par monument (grand site, enceinte vaste). Le rayon ajusté survit aux imports.
- Exemple : Versailles réglé à 400 m.
- Cas limite : le rayon reste compris entre 50 m et 500 m (Q-15, validé) pour rester jouable.
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
- Cas limite : e-mail non vérifié (RG-007) : refusé avant tout autre contrôle (décision client, Q-10).
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

**RG-042 — Fiche d'un monument non capturé.** Affiche numéro, nom, type, ville, rareté, distance et une photo en noir et blanc (décision client, Q-4). Le tampon, la section histoire et la photo en couleur sont verrouillés jusqu'à la capture.
- Exemple : fiche n° 12 : nom, type, ville, rareté, distance, photo noir et blanc, bouton « Aller le tamponner » (précisions : RG-054).
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

## Compléments R1 (RG-046 à RG-058)

Ces règles précisent ou complètent RG-021 à RG-045 ; en cas de conflit, la règle la plus récente prime.

**RG-046 — Mesure de la distance.** La distance est la ligne droite entre la position annoncée et le point unique de référence du monument. La décision (RG-032) se prend sur la valeur exacte ; l'affichage est arrondi. Quand la capture est refusée, la distance affichée est arrondie à la dizaine supérieure, pour ne jamais afficher une valeur ≤ au rayon.
- Exemple : rayon 150 m, distance réelle 151,2 m : refusé, message « Tu es à 160 m ».
- Cas limite : grand site (Versailles) : la distance se mesure au point de référence, pas au bord de l'enceinte ; c'est le rayon ajusté (RG-021) qui compense.

**RG-047 — Précision GPS insuffisante : conduite à tenir.** Un refus pour précision (RG-031) n'enregistre rien et ne compte pas dans la limite de fréquence (RG-030). « Réessayer » relit la position et renvoie la même photo tant que l'écran reste ouvert **[à valider]** ; aucune limite au nombre d'essais autre que RG-030. L'appli n'accepte jamais une précision mauvaise « faute de mieux ».
- Exemple : précision 140 m dans une rue étroite ; l'explorateur sort sur la place, « Réessayer », précision 25 m : capture acceptée.
- Cas limite : précision toujours > 100 m en intérieur ou en sous-sol : pas de capture possible, message RG-039 ; pas de mode dégradé.

**RG-048 — Horodatage.** La date de capture est celle du serveur à la réception (horloge de l'appareil ignorée). Elle sert aux contrôles RG-030 et RG-033. Affichage en heure de Paris, au format jj/mm/aaaa.
- Exemple : capture à 14 h 32 à Paris : « 22/10/2026 ».
- Cas limite : un appareil à l'heure fausse n'a aucun effet sur les contrôles.

**RG-049 — Ce qui est conservé d'une capture.** Exactement : explorateur, monument, date (RG-048), distance mesurée, photo. Ne sont conservés ni la position, ni sa précision, ni l'appareil, ni les métadonnées de la photo. Les refus peuvent être journalisés (type de refus, date, compte), jamais avec une position, 30 jours maximum **[à valider]**.
- Exemple : l'export (RG-013) d'un explorateur ne contient pour chaque capture que monument, date, distance et photo.
- Cas limite : la précision GPS, utilisée pour le contrôle, est oubliée une fois la réponse donnée (cohérent avec RG-036).

**RG-050 — Choix du monument capturé.** L'explorateur choisit le monument qu'il tamponne ; l'appli ne devine pas. Une photo = un monument. S'il n'y en a qu'un dans la zone, il est présélectionné.
- Exemple : place avec 3 monuments dans leur zone : liste de 3, choix explicite, une capture par photo.
- Cas limite : une même photo ne peut pas servir à plusieurs monuments.

**RG-051 — Photo : format, taille, traitement.** Formats acceptés : JPEG, PNG, WebP (RG-028 ; Q-20). Les 5 Mo se mesurent sur le fichier envoyé, après réduction par l'appli. Le serveur vérifie que c'est une vraie image, corrige l'orientation avant d'effacer les métadonnées, réduit à 1600 px maximum sur le côté long et la stocke dans un format unique (choix technique). Pas de recadrage ni de filtre. Une seule photo par capture.
- Exemple : photo prise en portrait : elle s'affiche à l'endroit ; aucune coordonnée GPS dedans.
- Cas limite : un remplacement (RG-035) est tout ou rien : si le nouvel envoi échoue, l'ancienne photo reste.

**RG-052 — Pas de modération en R1.** Les photos sont privées (RG-037) : aucun contrôle de contenu (monument visible, personnes, légalité), aucune file de modération. Le contenu relève de la responsabilité de l'explorateur (CGU). Le partage d'une photo (R4) est une action volontaire ; sa modération éventuelle est à arbitrer avant R4 **[à valider]**.
- Exemple : un selfie à la place du monument est accepté tant que la position est bonne.
- Cas limite : signalement d'un contenu illicite par un tiers : traité à la main par l'équipe (adresse de contact des mentions légales), pas d'outil en R1.

**RG-053 — Ordre complet des contrôles R1.** Complète RG-029 : connexion, e-mail vérifié, monument existant et capturable, déjà capturé (bascule vers le remplacement, RG-035), format et taille, fréquence, précision, distance, vitesse (non appliquée au remplacement, Q-5). Une seule erreur est renvoyée.
- Exemple : monument déjà capturé + photo invalide : message « déjà capturé » avec proposition de remplacement.
- Cas limite : monument retiré du catalogue (Q-7) : visible pour ceux qui l'ont capturé, plus capturable par les autres.

**RG-054 — Silhouette, fiche non capturée, fiche débloquée.** Précise RG-041 à RG-043.

| Élément | Carnet : case non capturée | Fiche non capturée | Fiche capturée |
| --- | --- | --- | --- |
| Numéro | oui | oui | oui |
| Nom, type, ville, rareté | silhouette + numéro seulement | oui | oui |
| Distance | non | oui | oui |
| Image | non | noir et blanc | couleur + photo souvenir **[à valider]** |
| Stats (année, style, hauteur) | non | non **[à valider]** | oui |
| Histoire | non | cadenas | oui (RG-055) |
| Tampon | non | non | oui |

- Exemple : n° 12 non capturé : le carnet montre « 12 » et une silhouette ; sa fiche donne le nom et la photo noir et blanc.
- Cas limite : le contenu verrouillé n'est jamais obtenable avant la capture, même en connaissant l'adresse technique de la fiche (le serveur ne l'envoie pas).

**RG-055 — Déblocage de la section histoire.** Elle se débloque dans la réponse de la capture réussie, avant toute autre action ; le déblocage est définitif et indépendant d'un remplacement de photo. Texte, source et licence (RG-022) sont affichés.
- Exemple : tampon posé, l'écran suivant montre la fiche avec l'histoire lisible.
- Cas limite : monument sans texte : « Histoire à venir » (RG-023) ; la capture reste valide, et le texte, une fois importé, est visible sans nouvelle action.

**RG-056 — Liste Tamponner et monuments déjà capturés.** La liste de RG-024 inclut les monuments déjà capturés, marqués « tamponné ». L'état du bouton (RG-025) ne tient compte que des monuments non capturés ; si tout ce qui est proche est déjà capturé, il est gris avec le texte « Déjà tamponné ici » **[à valider]**.
- Exemple : à 50 m de la tour Eiffel déjà capturée, rien d'autre à 2 km : bouton gris « Déjà tamponné ici », pas de halo.
- Cas limite : le remplacement de photo reste accessible depuis la fiche.

**RG-057 — Hors ligne au moment de la capture.** Complète RG-040. L'appli (écrans) se charge sans réseau, mais carnet, fiches et capture exigent le réseau : message « Pas de connexion. Réessayer ». Rien n'est gardé sur l'appareil. La photo n'est conservée qu'en mémoire tant que l'écran de capture reste ouvert ; quitter l'écran ou fermer l'appli la perd. À « Réessayer », la position est relue si elle date de plus de 30 s **[à valider]**.
- Exemple : tunnel puis sortie : « Réessayer » relit la position, renvoie la photo, capture validée.
- Cas limite : la capture est enregistrée mais la réponse est perdue : l'explorateur retrouve le tampon dans le carnet ; l'animation n'est pas rejouée, et « Réessayer » ne crée pas de doublon (RG-034).

**RG-058 — Anti-triche : périmètre R1.** Sont couverts : contrôles serveur RG-029 à RG-033 et RG-053, photo prise en direct par l'appli (RG-026), une capture par monument (RG-034), e-mail vérifié (RG-007). **Hors périmètre, acceptés jusqu'à R6/R7** : GPS falsifié (limite connue du CDC), vérification que la photo montre bien le monument (R7), photo d'un écran ou d'une photo, comptes multiples, signalement (R6, obligatoire au plus tard), sanction ou blocage automatique d'un compte (aucun en R1). Raison : sans classement avant R6, tricher ne nuit qu'à soi.
- Exemple : un explorateur simule sa position à 50 m d'un monument : accepté en R1 (risque assumé).
- Cas limite : les refus répétés ne déclenchent aucune sanction, uniquement la limite de fréquence (RG-030).

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
| Q-23 | Après un refus de précision GPS, garde-t-on la photo et relit-on la position, ou faut-il reprendre la photo ? (RG-047) | Garder la photo, relire la position |
| Q-24 | Fraîcheur maximale de la position à « Réessayer » (RG-057) | 30 s |
| Q-25 | Stats (année, style, hauteur) visibles avant capture ? Photo souvenir affichée sur la fiche capturée ? (RG-054) | Stats verrouillées ; photo souvenir affichée |
| Q-26 | Monuments déjà capturés dans la liste Tamponner et état du bouton (RG-056) | Listés « tamponné » ; bouton gris « Déjà tamponné ici » |
| Q-27 | Journalisation des refus de capture, sans position (RG-049) | Oui, 30 jours |
| Q-28 | Modération avant partage en R4 ; aucun contrôle de contenu en R1 (RG-052) | R1 : aucun ; R4 : à arbitrer |
| Q-22 | Mot de passe ≥ 12 caractères, pseudo unique et âge ≥ 15 ans sont partiellement hors CDC (pseudo unique et 12 caractères non écrits) | Retenus comme consignes AMOA ; à faire confirmer |

## Décisions client (2026-10-19)

- **Q-4** : le nom, le numéro, la rareté, la distance et une photo noir et blanc d'un monument non capturé sont **visibles**. Seuls le tampon, l'histoire et la photo couleur sont verrouillés.
- **Q-6** : la rareté est **affichée dès R1** (tampon et fiche). R2 garde les succès et les collections.
- **Q-10** : **aucune capture tant que l'e-mail n'est pas vérifié** (l'exploration reste possible).
- **Q-19** : le libellé de l'onglet est « Explorer » (cahier des charges §12, icônes) ; le nom de la collection est encore à trouver avant le lancement public.
- **Toutes les autres questions (Q-1 à Q-3, Q-5, Q-7 à Q-9, Q-11 à Q-18, Q-20 à Q-22)** : les propositions par défaut sont **validées**.
