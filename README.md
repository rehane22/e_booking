# e-booking

Plateforme de réservation composée d’un backend Spring Boot, d’un frontend Angular et d’un socle d’outils (PostgreSQL, pgAdmin, Jenkins) orchestrés avec Docker Compose.

## Structure du dépôt

```
.
├── backend/            # API Spring Boot (Java 17)
├── frontend/           # Application Angular
├── jenkins/            # Image Jenkins personnalisée (CLI Docker + plugins)
├── docker-compose.yml  # Orchestration multi-services
├── .env.example        # Variables d’environnement à copier
└── README.md
```

## Prérequis

- Docker et Docker Compose v2
- Node.js 20+ (optionnel si vous lancez le frontend hors Docker)
- Java 17 + Maven (optionnel si vous buildiez le backend hors Docker)

## Variables d’environnement

1. Copiez le fichier d’exemple :
   ```bash
   cp .env.example .env
   ```
2. Ajustez les valeurs sensibles dans `.env` (`DB_PASSWORD`, `JWT_SECRET`, mots de passe pgAdmin/Jenkins, etc.).

Docker Compose charge automatiquement ce fichier. Il n’est **pas** versionné (`.env` est ignoré par git).

## Lancer l’environnement complet

Depuis la racine du projet :

```bash
docker compose up --build -d
```

Services exposés :

- Backend Spring Boot : http://localhost:${BACKEND_PORT} (par défaut http://localhost:8080, le contexte applicatif est `/api`)
- Frontend Angular (servi par nginx) : http://localhost:${FRONTEND_PORT} (par défaut http://localhost:4200)
- PostgreSQL : port 5432 interne (variables `POSTGRES_*`)
- pgAdmin : http://localhost:${PGADMIN_PORT} (par défaut http://localhost:5050)
- Jenkins : http://localhost:${JENKINS_HTTP_PORT} (par défaut http://localhost:8081)

Arrêter l’ensemble :

```bash
docker compose down
# Ajouter -v pour supprimer les volumes de données
docker compose down -v
```

## Jenkins intégré

Le conteneur `jenkins` embarque la CLI Docker, Docker Compose et le plugin JUnit. Points clés :

- Les données Jenkins persistent dans le volume `jenkins-data`.
- Le socket Docker hôte est monté pour permettre aux pipelines d’exécuter des builds Docker.
- L’URL webhook GitHub à utiliser (si Jenkins tourne en local) est `http://localhost:${JENKINS_HTTP_PORT}/github-webhook/` ou via un tunnel ngrok.
- La pipeline se base sur `Jenkinsfile` : build/test backend, build frontend, `docker compose build`, archivage des artefacts et rapports.

Instructions détaillées : `docs/jenkins-setup.md`.

## Tests backend

Dans le répertoire `backend/` :

```bash
./mvnw test
```

Les tests utilisent H2 en mémoire et couvrent notamment les règles métier de `RendezVousServiceImpl`.

## Développement local hors Docker (optionnel)

- Backend : `./mvnw spring-boot:run` (port 8080, variables `DB_*` attendues)
- Frontend : `npm install && npm run start` (port 4200 avec proxy vers le backend si nécessaire)

## Contribution

1. Fork / branche de feature
2. Mettre à jour/ajouter les tests
3. Vérifier `./mvnw test` et, si pertinent, `docker compose up --build`
4. Soumettre une PR

---

Pensez à ne **jamais** commiter votre fichier `.env` ni vos jetons personnels. Utilisez `git status` avant chaque commit pour contrôler ce qui est versionné.
