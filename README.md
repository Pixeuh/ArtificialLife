# Artificial Life

Prototype expérimental de simulation 2D de vie artificielle. La version 0.5.1 consolide les mondes reproductibles, les catégories de monde, la sérialisation de l'état et les premières mesures de performance. Les organismes actuels sont des cellules abstraites : ils ne sont ni des animaux ni des intelligences artificielles cognitives.

Le principe de travail est de programmer des règles et des contraintes explicites, puis d'observer leurs conséquences. Une émergence sociale ou cognitive reste une hypothèse de recherche, jamais un résultat garanti par le modèle.

## Démarrer

Prérequis : Node.js 24 LTS et npm.

```sh
npm ci
npm run dev
```

Commandes utiles :

```sh
npm test          # tests unitaires et d'intégration
npm run build     # vérification TypeScript stricte et build Vite
npm run benchmark # benchmark reproductible du moteur sans interface
npm run preview   # prévisualisation locale du build
```

Les dépendances directes sont verrouillées à leurs versions installées dans `package.json` et `package-lock.json`. La CI exécute `npm ci`, les tests et le build sur les pull requests vers `dev` et `main`.

## Utilisation

- Choisir un monde dans la barre supérieure. Chaque monde possède un worker, une seed, un état et des commandes de temps indépendants.
- Démarrer ou mettre en pause, puis sélectionner ×1, ×2, ×5 ou ×10. Ces facteurs changent le temps simulé traité, pas la fréquence de rendu.
- **Rejouer** recrée le monde avec sa seed et sa configuration de départ enregistrées. **Nouveau monde** conserve les réglages du panneau Paramètres et tire une autre seed via Web Crypto. La seed affichée est celle utilisée pour initialiser le moteur ; le moteur reste déterministe et n'appelle pas `Math.random()`.
- Modifier les paramètres puis générer un nouveau monde pour appliquer ces valeurs. La configuration de départ et la configuration courante d'une simulation sont distinguées.
- Glisser dans le Canvas pour déplacer la caméra, utiliser la molette pour zoomer autour du curseur et cliquer une cellule pour l'inspecter. Le thème clair/sombre et le changement d'onglet ne réinitialisent pas les simulations.

Les mondes de démonstration ont chacun des graines et paramètres initiaux différents. Leur origine (`primordial` ou `custom`) est distincte de leur mode d'intervention (`observation` ou `divine`). Les deux mondes fournis sont primordiaux ; le second est étiqueté divin pour préparer ce mode, mais aucun pouvoir divin n'est implémenté.

## Mécanismes présents

- Cellules dotées d'énergie, d'âge, d'un métabolisme et d'un mouvement aléatoire local.
- Consommation de ressources ponctuelles, dépense énergétique, mort par épuisement et régénération des ressources.
- Division asexuée avec partage de l'énergie et mutations possibles de deux traits héréditaires : adhésion et rapport d'allongement.
- Corps elliptiques orientés ; leur forme influence les contacts, l'accès aux nutriments et la résolution physique.
- Liens d'adhésion issus de divisions, entretien énergétique des liens, formation et séparation de colonies.
- Statistiques de population, de mortalité, de consommation, de morphologie et échantillons d'historique.

Les liens ne donnent pas de bonus d'énergie ni de vitesse de groupe. Les cellules conservent leur mouvement et leur métabolisme individuels. L'accès à une ressource dépend du contact géométrique et d'une ligne d'accès qui peut être bloquée par une autre cellule. Les règles et l'ordre de traitement sont déterministes pour une seed, une configuration et un état initial identiques.

Hypothèses observables : des ressources rares pourraient rendre coûteux le fait d'être masqué par d'autres cellules ; une nourriture abondante pourrait rendre le coût des liens plus neutre ; une forme allongée pourrait améliorer l'accès dans l'axe long, tout en le réduisant dans l'axe court. Ces effets dépendent de la densité et de la distribution spatiale, et ne sont pas garantis.

## Reproductibilité et état

Une expérience reproductible doit conserver la seed, la configuration, le nombre de ticks, la version du code et les conditions d'exécution. Le PRNG Mulberry32 est propre à chaque simulation. Les actions d'interface utilisent `crypto.getRandomValues` uniquement pour proposer une nouvelle seed ; elles n'interviennent pas dans les règles du moteur.

Le moteur distingue l'instantané léger `WorldSnapshot`, destiné au rendu et aux statistiques, de `SimulationSaveV1`, destiné à reprendre le calcul. Le format versionné complet contient notamment l'état du PRNG, l'accumulateur de l'horloge, les cellules et leurs traits, les liens, les ressources, les compteurs, l'historique et l'état du régénérateur de ressources. `Simulation.save()` et `Simulation.fromSave()` sont des interfaces moteur ; l'application ne propose pas encore d'import/export ou de stockage persistant.

Pour comparer une hypothèse, fixer toutes les conditions sauf une et répéter sur plusieurs seeds. Les taux affichés sont des moyennes cumulées depuis le début du monde. Une différence dans une seule simulation ne démontre pas un avantage évolutif général.

## Architecture

```text
src/
  core/         monde, horloge fixe, PRNG, simulation, format de sauvegarde
  organisms/    cellules, création, géométrie et appartenance aux colonies
  environment/  ressources et régénération
  systems/      alimentation, métabolisme, mouvement, reproduction, adhésion,
                collisions et grille spatiale commune
  workers/      protocole typé et exécution hors du fil principal
  rendering/    caméra et rendu Canvas 2D
  components/   interface, contrôles et actions de seed
  benchmark/    mesures du moteur sans interface
  styles/       présentation responsive et thèmes
```

La simulation ne dépend ni de React, ni du DOM, ni du Canvas. Chaque worker possède son moteur. Les workers publient des instantanés pour l'interface à intervalle régulier, tandis que le pas fixe du moteur reste indépendant du rendu. Le rendu utilise des coordonnées monde et écran séparées.

## Performance

Exécuter `npm run benchmark` pour mesurer plusieurs populations fixes (100, 500, 1 000 cellules) et plusieurs seeds, pendant 120 ticks. Le rapport écrit le temps total, le temps moyen par tick, la population active, les ressources, les candidats locaux d'alimentation et de collision. Il compare le nombre de candidats d'alimentation examinés par la grille à la borne de l'ancienne recherche exhaustive (`population × ressources`). Les temps dépendent du matériel ; aucune limite temporelle fragile n'est imposée par les tests.

Avant la grille, la recherche de cellule pour chaque ressource balayait la population entière, puis pouvait balayer à nouveau les cellules pour vérifier l'accès. La grille spatiale partagée réduit le travail habituel aux cellules voisines ; dans des scènes très denses, les candidats locaux peuvent tout de même approcher une recherche exhaustive. Les collisions réutilisent cette même structure spatiale. Le benchmark permet de refaire cette comparaison sur la machine cible.

## Limites et validité scientifique

- Les mouvements n'utilisent ni capteurs ni décision orientée vers un objectif ; il n'y a pas de cerveau, mémoire ou apprentissage.
- Le solveur de collision est une correction positionnelle légère, sans inertie ni énergie cinétique complète ; des recouvrements peuvent persister dans les scènes denses.
- Les ressources sont ponctuelles et uniformément régénérées ; il n'y a ni diffusion, gradients, absorption partielle ou climat.
- Les cellules sont elliptiques, sans segments, organes ou membres. Les colonies ne constituent pas encore des organismes multicellulaires spécialisés.
- Il n'y a ni terrain, biomes, obstacles, interaction divine, communication, langage, objets, constructions, espèces ou civilisations simulés.
- Les résultats émergents ne sont pas garantis et le modèle n'est pas une reproduction fidèle de l'histoire de la vie terrestre.

## Suite envisagée

1. Exploiter les seeds et la sérialisation pour organiser des expériences comparatives et des tests de longues séries.
2. Préparer puis implémenter des terrains et biomes, sans confondre leur rendu 2D/2,5D avec les règles écologiques.
3. Étendre progressivement la morphologie modulaire et les mécanismes multicellulaires, avec mesures et tests dédiés.
4. Étudier des capteurs, des réseaux neuronaux, de la mémoire et de l'apprentissage avant tout objectif de comportement complexe.
5. Explorer les interactions, la communication et les constructions seulement lorsque les mécanismes sous-jacents sont définis et vérifiables.

Artificial Life est un projet expérimental. Les modèles et leurs conclusions doivent être décrits avec leurs limites et ne doivent pas être interprétés comme des preuves sur l'évolution réelle.
