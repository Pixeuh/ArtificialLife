# Artificial Life — version 0.5

Simulation 2D React + TypeScript strict + Vite, avec Canvas et un worker isolé par monde. La V0.5 ajoute les contacts physiques entre cellules et les effets de la morphologie sur les collisions, l'accès aux ressources et le déplacement des colonies.

## Démarrer et vérifier

```sh
npm install
npm run dev
npm test
npm run build
```

## Mécanismes

- Les cellules sont des ellipses orientées dont les demi-axes viennent du trait génétique `aspectRatio`, avec une aire approximativement constante.
- Une grille spatiale répartit les cellules et ne propose au solveur que les paires des cases voisines. Le solveur estime le contact par les rayons de support des ellipses, corrige les positions en plusieurs passes relaxées et respecte les bords du monde.
- Les liens parent-descendance restent des contraintes distinctes. Après les contacts, le système rétablit leur longueur cible, puis réapplique les contacts pour limiter les recouvrements.
- Une cellule consomme une ressource seulement si elle la touche et si aucune autre cellule ne bloque la ligne entre elle et le nutriment. La portée du contact dépend de l'orientation et de la forme de l'ellipse. L'effet est géométrique : une cellule allongée peut atteindre plus loin le long de son axe et moins loin perpendiculairement.
- Chaque cellule continue à se déplacer avec son propre mouvement actif. Les liaisons et les collisions déterminent ensuite le mouvement collectif ; aucune vitesse supplémentaire n'est accordée aux colonies.

Les cellules liées gardent leur métabolisme individuel et paient toujours l'entretien des liaisons. La reproduction partage l'énergie existante entre parent et fille. La morphologie peut donc modifier les contacts et la nourriture accessible sans donner de bonus énergétique direct aux colonies.

## Statistiques et expériences

L'inspecteur affiche population, cellules isolées, colonies multicellulaires, tailles moyenne et maximale des colonies, adhésion moyenne, allongement moyen, génération maximale, divisions, décès et taux moyens de naissance/mortalité. Les taux sont des moyennes cumulées depuis le début du monde. Deux graphiques suivent population et colonies à raison d'un échantillon par seconde, avec au plus 600 échantillons (10 minutes simulées).

Chaque monde conserve sa seed et ses paramètres. Les réglages incluent la quantité et la régénération des ressources, leur énergie, le seuil de division, la mutation, l'entretien de l'adhésion et la population maximale. Pour comparer une condition, garder la seed et les autres paramètres fixes, modifier une seule variable, puis répéter avec plusieurs seeds. Une différence sur un seul monde ne démontre pas un avantage évolutif général.

Hypothèses à étudier : des ressources rares pourraient amplifier le coût d'être masqué par d'autres cellules ; un apport abondant pourrait rendre l'entretien des liens plus neutre ; une géométrie allongée peut améliorer l'accès selon son orientation, mais réduire les contacts dans l'axe court et modifier le mouvement du groupe. Ces conséquences dépendent de la densité et de la distribution spatiale ; elles ne sont pas garanties.

## Limites

Le solveur est un modèle positionnel léger, sans inertie ni énergie cinétique. Les contacts sont calculés par support elliptique et quelques passes, donc les configurations extrêmement denses ou un monde plus petit que ses cellules peuvent conserver des recouvrements résiduels. La nourriture est représentée par des ressources ponctuelles uniformément régénérées ; il n'y a ni gradients, ni diffusion, ni absorption partielle. La ligne de visibilité donne un accès binaire. Il n'y a pas encore de communication, de spécialisation, de collisions avec obstacles ou de reproduction collective.

La suite peut ajouter une validation expérimentale sur des lots de seeds, une meilleure intégration des contraintes dans les colonies très denses, puis des signaux locaux et une distribution spatiale contrôlée des nutriments. Toute comparaison devrait conserver les mêmes lois et mesurer plusieurs répétitions avant de conclure.
