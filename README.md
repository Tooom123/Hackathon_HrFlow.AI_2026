# Hackathon_HrFlow.AI_2026

Base d'architecture pour un projet full-stack avec :
- `frontend`: React + Vite + Tailwind
- `backend`: Python + FastAPI

Le repo ne contient volontairement pas de code applicatif pour le moment, uniquement une structure propre et prete a implementer.

Contrainte de conception :
- pas de base de donnees SQL
- backend centre sur l'orchestration d'une API externe et d'une API LLM

## Arborescence

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   ├── clients/
│   │   ├── core/
│   │   ├── dependencies/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── utils/
│   ├── scripts/
│   └── tests/
│       ├── integration/
│       └── unit/
├── docs/
└── frontend/
    ├── public/
    ├── src/
    │   ├── app/
    │   ├── assets/
    │   ├── components/
    │   │   ├── common/
    │   │   ├── layout/
    │   │   └── ui/
    │   ├── config/
    │   ├── features/
    │   ├── hooks/
    │   ├── lib/
    │   ├── pages/
    │   ├── routes/
    │   ├── services/
    │   ├── styles/
    │   ├── types/
    │   └── utils/
    └── tests/
```

Consulte `frontend/README.md` et `backend/README.md` pour le role de chaque dossier.
