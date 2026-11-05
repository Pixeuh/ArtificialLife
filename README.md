# Artificial Life — version 0.3

Laboratoire de simulation 2D avec React, TypeScript strict, Vite, Canvas 2D et un worker indépendant par monde. La V0.3 ajoute les coûts énergétiques, la famine, la mortalité et les statistiques historiques à l'écosystème déterministe.

## Démarrer et vérifier

```sh
npm install
npm run dev
npm test
npm run build
```

## Organisation

- `src/core/` : état, configuration, snapshots, horloge fixe et orchestration.
- `src/organisms/` : données et création déterministe des organismes.
- `src/environment/` : ressources alimentaires et régénération.
- `src/systems/` : déplacement, alimentation, métabolisme et cycle de vie.
- `src/workers/` : protocole typé et boucle de simulation par monde.
- `src/rendering/`, `src/components/` : Canvas, caméra et interface.

Les deux mondes ont leurs propres workers, seed, configuration, état et commandes. Les taux de métabolisme se règlent depuis Paramètres et s'appliquent à la réinitialisation. Les thèmes clair et sombre sont conservés, ainsi que le choix utilisateur.

## Règles énergétiques

Les valeurs par défaut sont `baseMetabolismRate = 0.08` énergie/s et `movementEnergyCost = 0.0005` énergie/unité. À 22 unités/s, le coût total est d'environ 0.091 énergie/s : une réserve de 60 dure environ 11 minutes sans repas. Une ressource apporte 30 unités d'énergie, plafonnées à la capacité individuelle de 100. Ces valeurs permettent d'observer les organismes avant famine tout en rendant la nourriture utile et l'extinction possible. Aucun organisme ne reçoit de bonus de survie.

Chaque tick applique cet ordre stable : retrait des organismes déjà non viables, déplacement et vieillissement, alimentation, coûts métaboliques, retrait des morts, régénération des ressources, puis avancement de l'horloge. Une ressource est attribuée au premier organisme en ordre stable qui la touche. Les compteurs de nourriture consommée et de décès sont conservés dans l'état du monde après la disparition des organismes.

Le coût de déplacement est calculé depuis la distance commandée (`vitesse × deltaTime`), même si une limite du monde réduit le déplacement réellement effectué. Un organisme de vitesse nulle ne paie donc que le métabolisme de base. Les dépenses ne dépendent que du temps simulé ; ×2, ×5 et ×10 exécutent davantage de ticks dans le même temps réel sans changer le calcul d'un tick.

L'énergie initiale supérieure à `maxEnergy` est plafonnée à cette capacité. Les paramètres négatifs sont ramenés à zéro et les valeurs non finies utilisent la valeur de repli définie par le moteur. L'énergie d'un organisme reste toujours finie et dans l'intervalle `[0, maxEnergy]`.

## Limites et suite

Les organismes se déplacent aléatoirement et ne perçoivent pas la nourriture. Il n'y a pas encore de reproduction, de génétique, de vieillissement mortel, de prédation ou de maladie. Les prochaines étapes V0.4 peuvent introduire reproduction et héritage de traits individuels sans changer le protocole de monde.
