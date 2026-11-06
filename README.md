# Artificial Life

Prototype de simulation 2D déterministe. Les organismes sont des cellules abstraites. Le projet explore des règles locales de survie, de reproduction et d'interaction ; il ne garantit pas l'émergence d'une intelligence ou d'une société.

## État actuel

La version 0.9.1 réunit les fondations du simulateur, les terrains procéduraux, les organismes multicellulaires et la différenciation fonctionnelle. La reproduction dépend de la place disponible et du terrain. Les quatre scénarios factoriels A–D permettent de comparer séparément la différenciation et le transfert énergétique.

Le moteur demeure déterministe pour une seed, une configuration et une version de code données. Une évolution des règles peut modifier les trajectoires reproduites par les anciennes versions. Les formats de sauvegarde V1 à V4 restent pris en charge.

## Démarrer

Prérequis : Node.js 24 LTS et npm.

```sh
npm ci
npm run dev
```

Commandes de validation et de maintenance :

```sh
npm test
npm run build
npm run benchmark
npm run preview
```

## Utilisation

- Choisissez un monde dans les onglets. Chaque monde possède son worker, son état et ses commandes temporelles.
- Démarrez, mettez en pause ou sélectionnez ×1, ×2, ×5 et ×10. Le multiplicateur change le temps simulé traité.
- **Rejouer** restaure seed et paramètres initiaux. **Nouveau monde** applique les paramètres affichés et choisit une seed.
- Glissez sur le Canvas pour déplacer la caméra, utilisez la molette pour zoomer autour du curseur et cliquez une cellule pour l'inspecter. Le cadrage initial adapte le monde au Canvas ; le redimensionnement conserve la caméra.
- Les scénarios A–D partagent leurs conditions initiales : A témoin, B différenciation seule, C transfert énergétique seul, D combinaison des deux. Ils se consultent par onglet sur le Canvas unique.

## Architecture

- `src/core` : monde, simulation, horloge, configurations et déterminisme.
- `src/systems` et `src/organisms` : règles biologiques et géométrie des cellules.
- `src/environment` : terrain, biomes et ressources.
- `src/workers` : exécution isolée et protocole des workers.
- `src/rendering` : caméra, Canvas, terrain et rendu des organismes.
- `src/components` : interface React ; `src/styles` : thèmes et mise en page.
- `src/experiments` : conditions initiales reproductibles et scénarios d'étude.

La logique de simulation ne dépend pas de React ou du Canvas. Les workers transmettent des instantanés à l'interface ; l'horloge de simulation reste indépendante du rythme de rendu.

## Expériences et limites

Les statistiques observées sur une seed décrivent une exécution et ne constituent pas une preuve d'avantage évolutif. Pour comparer des effets, gardez les mêmes paramètres et répétez les quatre conditions sur plusieurs seeds et durées identiques. Le changement de seed, de version du moteur ou de paramètres invalide la comparaison directe.

Le rendu utilise un Canvas 2D. Le laboratoire expose une vue du monde sélectionné, pas quatre vues simultanées. L'import/export des mondes et la persistance après fermeture ne sont pas encore fournis.

## Historique

Les notes de versions détaillées sont dans [CHANGELOG.md](CHANGELOG.md).
