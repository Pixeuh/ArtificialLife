# Artificial Life

## Version 0.9 — différenciation cellulaire et fonctions multicellulaires

Chaque cellule hérite désormais de trois capacités continues : acquisition des ressources, motricité et résistance structurelle. Ces gènes mutent à la division. Leurs expressions dépendent aussi de la disponibilité locale des ressources et de la position relative de la cellule dans sa colonie. Elles ne créent pas de classes de cellules fixes.

Les capacités participent aux règles du moteur : l’acquisition modifie la portée d’accès à la nourriture et coûte de l’énergie d’entretien ; la motricité change la vitesse effective et le coût de déplacement ; la résistance augmente la tolérance des nouveaux liens et leur coût d’entretien. Les cellules directement reliées transfèrent une petite quantité d’énergie de la cellule la plus chargée à la moins chargée. Un passage par lien limite le débit ; 10 % du débit est dissipé et comptabilisé.

Les nouveaux mondes du laboratoire **Diff · Traitement** et **Diff · Témoin** partagent une seed, des fondateurs, un terrain et des paramètres initiaux. Le témoin désactive les trois fonctions et le transfert énergétique. Les statistiques exposent leur expression moyenne, l’énergie moyenne des cellules à faible ou forte acquisition, les colonies présentant un écart d’expression, ainsi que l’énergie transférée et dissipée. Une paire de mondes ne suffit pas à établir un avantage évolutif général ; répéter la comparaison sur plusieurs seeds.

Sur la seed `20260901`, après 40 secondes simulées, le traitement compte 60 cellules, 36 divisions, 18 colonies, 0 décès et 33,3 % de colonies différenciées ; 112,42 unités d'énergie ont été transférées et 11,24 dissipées. Le témoin compte 50 cellules, 26 divisions, 16 colonies et 0 décès. C'est une mesure descriptive d'une seule seed, pas une preuve d'avantage évolutif.

Au zoom microscopique, trois arcs indiquent l’expression de l’acquisition, de la motricité et de la résistance. Le panneau d’inspection distingue les valeurs génétiques des valeurs exprimées et montre leur contexte local. La parenté enregistre parent, fondateur de lignée et tick de naissance. Les sauvegardes V4 conservent ces champs et les compteurs d’échange. Les sauvegardes V1 à V3 restent chargeables : leurs nouveaux gènes sont initialisés à 0,5, les parents manquants sont inconnus, chaque ancienne cellule démarre une lignée individuelle, les ticks de naissance sont estimés depuis l’âge sauvegardé et les compteurs d’échange commencent à zéro.

## Version 0.8.1 — observer et valider la croissance multicellulaire

Le monde **Laboratoire** propose un départ expérimental reproductible avec trois profils génétiques fondateurs contrastés. Il utilise les règles de simulation ordinaires : aucune forme de colonie, division ou survie n'est scriptée par le scénario. La seed par défaut est `20260815` ; rejouer le monde avec la même seed et la même version du moteur reproduit son évolution. Les sauvegardes V3 conservent le scénario et ses profils de départ.

À 60 secondes simulées avec cette seed, le scénario de test atteint 168 cellules issues de 20 fondatrices, 148 divisions, 37 groupes de cellules liées et 108 liaisons ; le plus grand groupe compte 11 cellules. Ces chiffres décrivent une exécution reproductible, pas une preuve d'avantage évolutif des profils. Dans le monde naturel A avec ses paramètres habituels, le contrôle sur 60 secondes atteint 65 cellules, 15 divisions et 5 groupes liés.

Sélectionner une cellule affiche sa colonie courante, les gènes, l'énergie et la génération des membres. Le bouton **Suivre** garde la cellule sélectionnée au centre ; le zoom reste contrôlable. Les statistiques et l'historique exposent notamment l'allongement des colonies, les liaisons et les tendances morphologiques. La parenté a été ajoutée en V0.9 ; aucun arbre généalogique graphique n'est encore fourni.

## Version 0.8 — anatomies multicellulaires élémentaires

Les cellules héritent maintenant de trois paramètres de croissance : angle préférentiel de division, tendance à bifurquer et persistance des liaisons. À chaque division, ces règles déterminent l'axe et l'écart de placement de la cellule fille ; les mutations restent bornées et utilisent le flux aléatoire déterministe de la simulation. Les cellules gardent leurs formes elliptiques héréditaires. Les liens persistants tolèrent davantage d'étirement, avec un coût énergétique d'entretien proportionnel à cette persistance. Les colonies restent des groupes temporaires déduits des liaisons ; elles n'ont pas de cycle de vie distinct.

L'inspection expose les gènes, le nombre et la force moyenne des liens ainsi qu'une taille géométrique approximative. Les statistiques incluent la tendance moyenne à bifurquer, la persistance des liaisons, la densité de liens et le rapport d'allongement approximatif des colonies. Ce dernier décrit l'emprise spatiale, pas une aptitude biologique. Les formes sont des conséquences des divisions, mutations, mouvements, collisions et ruptures, pas des catégories d'espèces.

Les sauvegardes V3 conservent les nouveaux gènes. Les sauvegardes V1 et V2 restent chargeables ; les gènes absents reçoivent des valeurs neutres (`divisionAngle = 0`, `branching = 0.5`, `bondPersistence = 1`) et les anciens échantillons d'historique sont complétés. Aucune différenciation cellulaire n'est ajoutée : des rôles fonctionnels demanderaient un cycle de vie et des coûts spécifiques qui ne sont pas encore établis.

## Version 0.7 — rendu illustré du monde

Le rendu Canvas masque désormais le quadrillage et adoucit les transitions entre cellules. Il ajoute des détails décoratifs déterministes à partir de la seed du terrain : houppiers et ombres dans les forêts, herbes dans les plaines, ondulations de dunes, rochers, relief ombré et rives claires. Les reflets de l'eau bougent avec une horloge de présentation indépendante du moteur. Les décorations sont préparées au changement de terrain, puis seules celles proches de la vue sont dessinées.

Les cellules biologiques gardent leur taille physique ; leur rendu possède une taille minimale pour rester lisible à distance, avec orientation, ombre, surbrillance en gros plan et contour renforcé à la sélection. Le terrain reste une carte 2D et les décorations sont purement graphiques : elles ne sont ni des organismes ni des obstacles.

## Version 0.6 — terrains et biomes

Les mondes possèdent maintenant une carte procédurale déterministe dérivée de leur seed : plaines, forêts, déserts, montagnes et plans d'eau cohérents. Les cellules de terrain contiennent altitude, humidité, température, type de terrain, accessibilité, coût de déplacement et potentiel de nourriture. L'eau bloque le déplacement ; les biomes difficiles réduisent la vitesse. La dépense énergétique de mouvement suit cette vitesse effective, sans appliquer deux fois le coût du terrain. La nourriture est initialisée et régénérée sur les biomes terrestres, avec une densité favorisant les zones productives.

La carte est générée dans le moteur sans dépendance au DOM, avec une graine dérivée indépendante du flux biologique. Le worker transmet un instantané de terrain à l'initialisation et à la réinitialisation, puis continue d'envoyer uniquement les instantanés d'écosystème habituels. Le rendu raster statique est mis en cache séparément des cellules animées. Les réglages de seed, relief, humidité et proportion d'eau sont appliqués lors de la création d'un nouveau monde ; **Rejouer** reproduit seed, terrain et état initial. Les seeds personnalisées sont accessibles dans Paramètres.

Les sauvegardes moteur V1 existantes restent lisibles ; les nouvelles sauvegardes V2 enregistrent également l'état du flux aléatoire indépendant des ressources. L'application n'ajoute pas d'import/export ou de stockage persistant.

Prototype expérimental de simulation 2D de vie artificielle. Les organismes actuels sont des cellules abstraites : ils ne sont ni des animaux ni des intelligences artificielles cognitives.

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

Les mondes de démonstration ont chacun des graines et paramètres initiaux différents. Leur origine (`primordial` ou `custom`) est distincte de leur mode d'intervention (`observation` ou `divine`). Monde A et Monde B sont les deux mondes primordiaux ; les autres onglets sont des scénarios expérimentaux dédiés. Le second monde reste étiqueté divin pour préparer ce mode, mais aucun pouvoir divin n'est implémenté.

## Mécanismes présents

- Cellules dotées d'énergie, d'âge, d'un métabolisme et d'un mouvement aléatoire local.
- Carte de terrain déterministe avec plaines, forêts, déserts, montagnes et eau ; les cellules ne traversent pas l'eau et la vitesse effective limite la dépense de mouvement au même facteur.
- Consommation de ressources ponctuelles, dépense énergétique, mort par épuisement et régénération des ressources.
- Division asexuée avec partage de l'énergie et mutations des traits héréditaires de morphologie, croissance et fonctions cellulaires.
- Corps elliptiques orientés ; leur forme influence les contacts, l'accès aux nutriments et la résolution physique.
- Liens d'adhésion issus de divisions, entretien énergétique des liens, formation et séparation de colonies.
- Statistiques de population, de mortalité, de consommation, de morphologie et échantillons d'historique.

Les liens ne donnent pas de vitesse de groupe ; chaque cellule conserve son mouvement individuel. En V0.9, les cellules reliées peuvent transférer de l'énergie avec une dissipation mesurée. L'accès à une ressource dépend du contact géométrique, de la capacité d'acquisition et d'une ligne d'accès qui peut être bloquée par une autre cellule. Les règles et l'ordre de traitement sont déterministes pour une seed, une configuration et un état initial identiques.

Hypothèses observables : des ressources rares pourraient rendre coûteux le fait d'être masqué par d'autres cellules ; une nourriture abondante pourrait rendre le coût des liens plus neutre ; une forme allongée pourrait améliorer l'accès dans l'axe long, tout en le réduisant dans l'axe court. Ces effets dépendent de la densité et de la distribution spatiale, et ne sont pas garantis.

## Reproductibilité et état

Une expérience reproductible doit conserver la seed, la configuration, le nombre de ticks, la version du code et les conditions d'exécution. Le PRNG Mulberry32 est propre à chaque simulation. Les actions d'interface utilisent `crypto.getRandomValues` uniquement pour proposer une nouvelle seed ; elles n'interviennent pas dans les règles du moteur.

Le moteur distingue l'instantané léger `WorldSnapshot`, destiné au rendu et aux statistiques, des sauvegardes `SimulationSaveV1` à `SimulationSaveV4`, destinées à reprendre le calcul. V1 reste lisible. V2 enregistre les états des flux aléatoires séparés ; V3 conserve les gènes multicellulaires ; V4 ajoute les fonctions exprimées, la parenté et les compteurs d'échange. La carte est reconstruite depuis la seed. `Simulation.save()` et `Simulation.fromSave()` sont des interfaces moteur ; l'application ne propose pas encore d'import/export ou de stockage persistant.

Pour comparer une hypothèse, fixer toutes les conditions sauf une et répéter sur plusieurs seeds. Les taux affichés sont des moyennes cumulées depuis le début du monde. Une différence dans une seule simulation ne démontre pas un avantage évolutif général.

## Architecture

```text
src/
  core/         monde, horloge fixe, PRNG, simulation, format de sauvegarde
  organisms/    cellules, création, géométrie et appartenance aux colonies
  environment/  terrain procédural, biomes, ressources et régénération
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
- Les ressources restent ponctuelles ; il n'y a ni diffusion, gradients, absorption partielle ou climat dynamique. Leur apparition est désormais pondérée par le potentiel de nourriture des biomes.
- Les cellules sont elliptiques, sans segments, organes ou membres. Les colonies peuvent répartir différemment des capacités fonctionnelles continues, sans rôles cellulaires discrets ni cycle de vie collectif.
- Il n'y a pas encore d'interaction divine, communication, langage, objets, constructions, espèces ou civilisations simulés. Les rivières, saisons et climats dynamiques restent à implémenter.
- Les résultats émergents ne sont pas garantis et le modèle n'est pas une reproduction fidèle de l'histoire de la vie terrestre.

## Suite envisagée

1. Exploiter les seeds et la sérialisation pour organiser des expériences comparatives et des tests de longues séries.
2. Étudier des gradients et variations climatiques sans introduire de comportements codés en dur.
3. Étendre progressivement la morphologie modulaire et les mécanismes multicellulaires, avec mesures et tests dédiés.
4. Étudier des capteurs, des réseaux neuronaux, de la mémoire et de l'apprentissage avant tout objectif de comportement complexe.
5. Explorer les interactions, la communication et les constructions seulement lorsque les mécanismes sous-jacents sont définis et vérifiables.

Artificial Life est un projet expérimental. Les modèles et leurs conclusions doivent être décrits avec leurs limites et ne doivent pas être interprétés comme des preuves sur l'évolution réelle.
