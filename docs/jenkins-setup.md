## Intégration Jenkins / GitHub

### Démarrer Jenkins avec Docker Compose
- Le service `jenkins` est déjà défini dans `docker-compose.yml`.  
  ```bash
  docker compose up -d jenkins
  ```
- Jenkins s’ouvre sur [http://localhost:8081](http://localhost:8081).  
- Les données sont conservées dans le volume `jenkins-data`.  
- Le conteneur contient le client Docker et l’outil Docker Compose, et monte le socket Docker hôte (`/var/run/docker.sock`) pour exécuter `docker` et `docker compose` depuis les pipelines.

### Pré-requis côté Jenkins
- Jenkins ≥ 2.426 avec les plugins : *Pipeline*, *Docker Pipeline*, *Git*, *GitHub*.  
  (Avec le conteneur fourni, l’assistant d’installation installe ces plugins au premier démarrage.)
- Le pipeline s’exécute directement dans ce conteneur Jenkins, qui possède déjà Docker configuré.
- Jenkins doit pouvoir accéder au dépôt GitHub `e-booking`.

### Étapes de configuration
1. **Créer des identifiants GitHub**  
   - Dans *Gérer Jenkins → Gérer les identifiants*, ajoute un identifiant de type *Nom d’utilisateur et mot de passe* ou *Jeton d’accès personnel* pour un compte ayant accès au dépôt.  
   - Note l’ID Jenkins de cet identifiant (exemple : `github-creds`).

2. **Créer le pipeline**  
   - *Nouvel élément → Pipeline* (nom suggéré : `e-booking-ci`).  
   - Dans l’onglet *Pipeline → Définition*, choisis *Pipeline script from SCM*.  
   - SCM = Git, URL = `https://github.com/<organisation>/e-booking.git`.  
   - Sélectionne l’identifiant GitHub créé à l’étape 1.  
   - Laisse la branche par défaut (`*/main` ou `*/master`).  
   - Jenkins lira automatiquement le `Jenkinsfile` situé à la racine du dépôt.

3. **Configurer les déclencheurs GitHub**  
   - Dans le job Jenkins, onglet *Déclencheurs de build*, coche `GitHub hook trigger for GITScm polling`.  
   - Dans GitHub : *Settings → Webhooks → Add webhook*.  
     - URL de la charge utile : `https://<adresse-jenkins>/github-webhook/`.  
     - Type de contenu : `application/json`.  
     - Événements : `Just the push event` (ajoute aussi `Pull request` si tu souhaites déclencher sur les PR).  
   - Enregistre, puis effectue un `git push` pour vérifier que Jenkins reçoit la notification.

4. **Vérifier l’accès Docker**  
   - Les étapes backend et frontend utilisent les images `maven:3.9-eclipse-temurin-17` et `node:20-bullseye`.  
   - Assure-toi que l’utilisateur Jenkins peut exécuter `docker ps` et que les caches (`$HOME/.m2`, `$HOME/.npm`) sont accessibles en écriture.

5. **(Optionnel) Pousser les images**  
   - L’étape `Docker Images` exécute `docker compose build`.  
   - Pour publier vers un registre, ajoute une étape avec `docker login` puis `docker compose push`, en définissant les identifiants du registre dans Jenkins.

### Ouvrir Jenkins sur Internet avec ngrok (pour les webhooks)
1. Installe ngrok depuis [https://ngrok.com/download](https://ngrok.com/download) et connecte-le à ton compte (`ngrok config add-authtoken <ton_token>`).  
2. Démarre un tunnel HTTP vers Jenkins (port 8081) :  
   ```bash
   ngrok http 8081
   ```
3. ngrok affiche une URL publique de type `https://xxxxx.ngrok.io`. Utilise cette URL dans GitHub :  
   - Payload URL : `https://xxxxx.ngrok.io/github-webhook/`
4. Tant que le tunnel reste actif, GitHub peut contacter ton Jenkins local. Si tu relances ngrok et que l’URL change, n’oublie pas de mettre à jour le webhook GitHub.  
5. Pour la sécurité, protège Jenkins (utilisateur/mot de passe) et évite d’exposer ce tunnel plus longtemps que nécessaire.

### Résultat
À chaque push GitHub, la pipeline :  
1. exécute `mvn clean verify` sur le backend et publie les rapports JUnit,  
2. construit le frontend Angular (`npm ci` puis `npm run build --configuration production`),  
3. lance `docker compose build` pour générer les images.  
Les fichiers construits côté frontend (`frontend/dist/frontend/browser`) sont archivés dans Jenkins pour téléchargement.
