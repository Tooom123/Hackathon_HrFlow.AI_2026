# Backend

Structure cible pour une API `Python + FastAPI`.

Cette architecture est pensee pour un backend sans base de donnees SQL.
Le backend sert surtout de couche d'orchestration entre :
- les endpoints exposes au frontend
- une ou plusieurs APIs externes
- une API de LLM

## Dossiers

- `app/api/v1/`: endpoints versionnes
- `app/clients/`: clients techniques vers API externes et API LLM
- `app/core/`: settings, securite, logging, gestion centrale
- `app/dependencies/`: dependances FastAPI partagees
- `app/schemas/`: schemas Pydantic de requete/reponse
- `app/services/`: logique metier
- `app/utils/`: helpers transverses
- `scripts/`: scripts d'outillage projet
- `tests/unit/`: tests unitaires
- `tests/integration/`: tests d'integration

## Convention recommandee

Le flux recommande est :
`api -> dependencies -> services -> clients`

Les schemas de validation restent dans `schemas/` pour separer clairement transport API et logique d'orchestration.

## Intention d'architecture

- `services/` contient la logique metier et l'enchainement des appels
- `clients/` encapsule les details HTTP, auth, retries et format des APIs distantes
- `schemas/` decrit les contrats d'entree/sortie de ton API

Cette separation evite de melanger logique produit et details des fournisseurs externes.
