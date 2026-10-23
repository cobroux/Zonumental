# Glossaire métier — Zonumental (R0 « Socle » et R1 « Capturer »)

Source : `cahier-des-charges.md` (CDC). Vocabulaire du jeu = vocabulaire du carnet d'explorateur (CDC §12).

| Terme | Définition |
| --- | --- |
| Explorateur | Le joueur : personne titulaire d'un compte, âgée d'au moins 15 ans. |
| Compte | Identité de l'explorateur (e-mail, mot de passe, pseudo, date de naissance déclarée). Obligatoire pour jouer. |
| Pseudo | Nom public de l'explorateur, unique. N'est visible des autres qu'avec son accord (classement, R6). |
| Consentement | Accord daté donné par l'explorateur. Obligatoires : CGU / politique de confidentialité. Facultatifs, décochés par défaut : classement, e-mails. |
| Monument | Lieu du catalogue pouvant être capturé : position, type, stats, histoire, image de référence. |
| Catalogue | Ensemble des monuments disponibles, importé depuis des sources ouvertes selon les quotas. |
| Ville | Ville du catalogue (code INSEE) portant un quota de monuments. |
| Quota | Nombre maximal de monuments retenus pour une ville (10 par défaut, ~25-30 pour Paris), configurable. |
| Import | Opération qui construit ou met à jour le catalogue à partir des sources et des quotas. Relançable sans effet de bord. |
| Popularité | Mesure de notoriété d'un monument (vues Wikipédia via Wikidata). Sert à choisir les monuments et à calculer la rareté. |
| Numéro | Numéro d'ordre fixe d'un monument dans le carnet, attribué une fois, jamais réutilisé. |
| Type | Catégorie du monument (Château, Religieux, Pont, Phare…). Détermine la forme du tampon. |
| Stats | Caractéristiques d'un monument : année, style, hauteur. |
| Rareté | Classe d'un monument : Légendaire (5 % les plus populaires), Rare (20 % suivants), Commun (le reste). Calculée à l'import ; affichée dès R1 (décision client du 2026-10-19). |
| Zone de capture | Disque autour du monument dans lequel la capture est possible. Rayon de capture : 150 m par défaut, ajustable par monument. |
| Capture | Action de photographier un monument, en direct, depuis sa zone de capture, et de la faire valider. Une par monument et par explorateur. |
| Tampon | Représentation du monument capturé dans le carnet. « Tamponner » = capturer. |
| Photo souvenir | Photo prise lors de la capture. Privée. Remplaçable après la capture, sans récompense. |
| Précision GPS | Marge d'erreur, en mètres, annoncée par l'appareil lors de la lecture de position. |
| Distance mesurée | Écart entre la position de l'explorateur et le monument au moment de la capture. Seule donnée de position conservée. |
| Vitesse plausible | Contrôle qui refuse une capture si le déplacement depuis la capture précédente est impossible. |
| Limite de fréquence | Nombre maximal de captures par heure pour un explorateur. |
| Carnet | Collection de l'explorateur : tous les monuments numérotés, tampons pour les capturés, silhouettes pour les autres. (Nom provisoire de la collection : « Pokédex » est une marque, voir CDC §12.) |
| Page | Regroupement d'entrées du carnet. Définition à confirmer (voir Questions ouvertes Q-17). |
| Silhouette | Case du carnet d'un monument non capturé : forme grisée + numéro. Sa fiche montre nom, rareté, distance et photo noir et blanc (RG-054). |
| Fiche monument | Écran détaillé d'un monument : numéro, nom, type, stats, source et licence. Section histoire visible seulement après capture. |
| Section histoire | Texte historique du monument, débloqué à la capture. |
| Explorer | Écran d'accueil : « où je tamponne maintenant ? » (libellé à confirmer, CDC §12). |
| Jour 0 | État d'un explorateur sans aucun tampon : guide en 3 étapes, cases vides. |
| Source / Licence | Origine et licence d'un texte ou d'une image (ex. CC BY-SA), affichées sur la fiche. |
| Consentements facultatifs | Classement et e-mails ; décochés par défaut, modifiables dans le profil. |
| Export | Téléchargement par l'explorateur de ses données (JSON + photos en zip). |
| Suppression | Effacement définitif du compte et des photos, effectif sous 30 jours. |
