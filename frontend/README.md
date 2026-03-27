# Frontend

Structure cible pour une application `React + Vite + Tailwind`.

## Dossiers

- `public/`: assets servis tels quels
- `src/app/`: bootstrap de l'application, providers globaux, config runtime
- `src/assets/`: assets importes par le code
- `src/components/common/`: composants partages orientés produit
- `src/components/layout/`: header, sidebar, shells, wrappers de page
- `src/components/ui/`: primitives UI reutilisables
- `src/config/`: constantes, variables de config, mapping d'environnement
- `src/features/`: logique par domaine fonctionnel
- `src/hooks/`: hooks React partages
- `src/lib/`: clients externes, helpers transverses, integrations
- `src/pages/`: vues de haut niveau si routing base page
- `src/routes/`: definition et composition du routing
- `src/services/`: appels API et services applicatifs cote front
- `src/styles/`: styles globaux, tokens, couches Tailwind
- `src/types/`: types transverses
- `src/utils/`: helpers purs
- `tests/`: tests front hors colocalisation

## Convention recommandee

Les elements lies a une feature doivent vivre en priorite dans `src/features/<feature-name>/`.
Les composants vraiment generiques seulement remontent dans `components/` ou `ui/`.
