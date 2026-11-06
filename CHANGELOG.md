# Historique des versions

## 0.9.1

- Corrige la validation géométrique des fondatrices et des filles. Une division sans position valide est rejetée sans dépenser l'énergie parentale, incrémenter les statistiques ou consommer l'identifiant et les tirages de mutation.
- Met en cache les cellules d'habitat pondérées des ressources et borne les recherches locales de terrain.
- Cadre initialement le monde selon le viewport, conserve la caméra au redimensionnement et culle les éléments hors écran. Les tris de rendu sont réutilisés entre deux instantanés.
- Remplace la comparaison à deux conditions par un plan factoriel 2×2 : témoin, différenciation seule, transfert seul, et combinaison.
- Réorganise le README et renforce les tests ciblés. Les règles biologiques existantes et les formats de sauvegarde V1–V4 sont conservés.

## 0.9.0 — Différenciation cellulaire

Les cellules héritent de gènes continus d'acquisition des ressources, motricité et résistance structurelle. Leur expression varie selon les ressources locales et la position dans la colonie ; les capacités ont des coûts énergétiques. Les cellules liées peuvent transférer de l'énergie, avec un débit limité et une part dissipée. L'inspection et les statistiques exposent gènes, expressions, lignées et transferts. Les sauvegardes V4 ajoutent ces champs ; les formats précédents restent chargeables par migration.

## 0.8.1 — Observation de la croissance multicellulaire

Ajout d'un monde laboratoire reproductible à fondateurs contrastés, d'indicateurs de colonies et d'une inspection de groupe. Les configurations permettent d'observer la croissance avec les règles ordinaires de simulation.

## 0.8.0 — Anatomies multicellulaires élémentaires

Ajout de l'angle de division, de la bifurcation, de la persistance des liens et de formes elliptiques héréditaires. Les colonies restent des groupes temporaires définis par les liens.

## 0.7.0 — Rendu illustré

Ajout de détails décoratifs déterministes pour les biomes, d'un terrain raster mis en cache et d'un rendu plus lisible des cellules. Les décorations n'ont pas d'effet sur la simulation.

## 0.6.0 — Terrains et biomes

Génération procédurale déterministe des plaines, forêts, déserts, montagnes et eaux. Les biomes influencent accessibilité, coût de déplacement et potentiel de ressources. La seed et les réglages de terrain sont exposés dans l'interface.

## 0.5.1 et versions antérieures

Consolidation du moteur, interactions physiques entre cellules, reproduction, métabolisme, survie et mortalité, puis socle initial React/TypeScript/Vite avec Canvas, caméra, workers, horloge fixe et seeds reproductibles. Les thèmes clair et sombre sont disponibles.
