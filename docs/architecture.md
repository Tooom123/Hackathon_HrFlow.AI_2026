# Architecture Notes

Cette base separe clairement :
- le frontend web dans `frontend/`
- l'API dans `backend/`
- la documentation technique dans `docs/`

Objectif :
- faciliter l'evolution du projet
- garder une separation nette entre UI, logique metier et integrations externes
- permettre un demarrage rapide sans devoir refactorer la structure trop tot

## Choix structurants

- pas de couche SQL
- pas de migrations
- backend concu comme facade metier et couche d'orchestration
- integrations distantes centralisees dans `backend/app/clients/`
