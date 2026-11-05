# Artificial Life — version 0.2

Laboratoire de simulation 2D React + TypeScript strict + Vite. Cette version ajoute un écosystème primitif déterministe : organismes autonomes, ressources alimentaires, déplacements, collisions, régénération et inspection.

## Démarrer

```sh
npm install
npm run dev
```

## Vérifier

```sh
npm test
npm run build
```

## Organisation

- `src/core/` : état du monde, configuration, snapshots, horloge fixe et orchestration de simulation.
- `src/organisms/` : données d’organisme et création déterministe de la population initiale.
- `src/environment/` : ressources alimentaires et régénération basée sur le temps simulé.
- `src/systems/` : mouvement/réflexion aux frontières et résolution des collisions alimentaires.
- `src/workers/` : protocole typé et boucle de simulation indépendante par monde.
- `src/rendering/` et `src/components/` : rendu Canvas, caméra, sélection et interface.

Chaque monde a son propre worker, sa seed et sa configuration. Les paramètres de population initiale et de nourriture sont modifiables dans « Paramètres » et appliqués lors de la réinitialisation du monde. Monde A démarre avec 50 organismes et 250 ressources ; Monde B avec 40 organismes et 180 ressources.

À chaque tick, l’ordre est stable : mouvement et âge, collisions et alimentation, régénération des ressources, puis avancement de l’horloge. Si plusieurs organismes touchent la même ressource, le premier dans l’ordre stable de la population la consomme. Les ressources peuvent être consommées même si l’organisme a presque atteint sa capacité énergétique ; l’énergie reçue est plafonnée.

## Limites de la version 0.2

Les organismes n’ont ni métabolisme, ni dépense énergétique, ni mort, ni reproduction. Ils ne cherchent pas volontairement la nourriture et n’ont pas de perception, génome ou réseau neuronal. Les conditions de départ ne sont pas sauvegardées entre les sessions. Les réglages visibles permettent de modifier les effectifs initiaux ; les autres paramètres sont définis dans `WorldConfig`.

## Suite proposée (0.3)

Ajouter une dépense énergétique de base et une règle de famine/mort, avec tests dédiés et réglages calibrés. Garder les capteurs et la reproduction pour des étapes suivantes afin que les comportements continuent d’émerger des règles plutôt que d’être codés artificiellement.
