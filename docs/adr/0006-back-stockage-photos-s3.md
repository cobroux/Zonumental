# ADR 0006 — Stockage des photos : objet S3 compatible, hébergé dans l'UE

- **Statut :** proposé (tech-lead-back, 2026-10-19) — mise en œuvre en R1
- **Stories :** r0-socle-5 (provisionnement seulement), R1 capture

## Contexte

Cahier §4/§6/§7 : les photos de capture vont dans un stockage objet S3 compatible dans l'UE, privées, réencodées sans métadonnées, 5 Mo max, supprimées avec le compte, exportables. R0 ne fait que provisionner le stockage (r0-socle-5) : **aucun code de stockage en R0**.

## Décision (cadre pour R1)

- Client **AWS SDK v2 `software.amazon.awssdk:s3`** avec `endpointOverride` + `forcePathStyle` : fonctionne avec tout fournisseur S3 UE (Scaleway, OVHcloud, Clever Cloud Cellar…). Variables : `ZONUMENTAL_S3_ENDPOINT/REGION/BUCKET/ACCESS_KEY/SECRET_KEY`.
- **Un bucket privé** (aucun accès public, chiffrement côté serveur activé), clés `captures/<utilisateurId>/<numeroMonument>.webp` : une photo par capture, le remplacement (RG-035) écrase la clé.
- Lecture par le joueur : **servie par le backend** sous `/api` (flux depuis S3 après contrôle du propriétaire). On reste sur la même origine, compatible avec la CSP `img-src 'self'` du front (ADR 0015).
- Suppression du compte : effacement du préfixe `captures/<utilisateurId>/` par le module `capture`, à l'écoute de `CompteSupprime` (ADR 0008).
- Le code vit dans `fr.zonumental.capture` (seul module qui en a besoin).
- **Images de référence du catalogue** : voir conséquences.

## Alternatives écartées

- **Photos en base (`bytea`)** : alourdit sauvegardes et requêtes, contraire au cahier.
- **Disque local du conteneur** : perdu au redéploiement, pas de réplication.
- **Spring Cloud AWS** : couche supplémentaire au-dessus du même SDK, sans besoin.
- **Bucket public + URL non devinables** : photos privées par défaut (§7), refusé.
- **URL présignées** : obligeraient à ouvrir la CSP du front au domaine S3 ; le volume (photos de ~1600 px vues par leur seul auteur) ne justifie pas de sortir le trafic du backend.

## Conséquences

- Fournisseur S3 : décision liée à l'hébergeur (cahier §11).
- Émulateur S3 local et Testcontainers : à choisir en R1 (vérifier la licence et la distribution de l'image retenue au moment du choix).
- **Point signalé (R1)** : afficher directement les images Wikimedia Commons (`upload.wikimedia.org`) transmet l'adresse IP des joueurs à un tiers hors UE. Proposition : en R1, l'import copie les images de référence (réduites) dans ce bucket, préfixe `catalogue/`, servies par le backend. À arbitrer avant le premier écran de fiche.

## Amendement 2026-10-22 (r1-capturer-1, plan `docs/architecture/r1-capture-back.md`)

- **Format unique JPEG (qualité 0,85), pas WebP** : aucun encodeur WebP en Java pur (les bibliothèques existantes embarquent `libwebp` natif). Lecture WebP par TwelveMonkeys `imageio-webp`, orientation par `metadata-extractor`, réduction et encodage par le JDK.
- **Clé `captures/<utilisateurId>/<photoId>.jpg`**, `photoId` UUID neuf à chaque envoi et stocké avec la capture (au lieu de `<numeroMonument>.webp`) : le remplacement (RG-035, RG-051) écrit la nouvelle photo, bascule la ligne, puis efface l'ancienne, donc reste tout ou rien ; une écriture concurrente ne peut pas écraser la photo d'une capture validée. Le préfixe par utilisateur garde l'effacement en un passage.
- **Émulateur local et tests : MinIO** (décision client), via Testcontainers `testcontainers-minio`, dans `TestcontainersConfiguration` (donc aussi `LancementLocal`). AGPL sans incidence (usage local, rien n'est distribué) ; plus d'images communautaires publiées depuis fin 2025 : tag figé.
- **Lecture côté front** : `fetch` avec le jeton Bearer en mémoire (ADR 0015) puis `URL.createObjectURL` ; la CSP autorise déjà `img-src blob:`. URL présignées toujours écartées.
