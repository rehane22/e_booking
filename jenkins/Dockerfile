FROM jenkins/jenkins:lts-jdk17

USER root

ARG DOCKER_CLI_VERSION=27.2.0
ARG DOCKER_COMPOSE_VERSION=2.27.0

# Install Docker CLI (binaire statique) et Docker Compose
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates tar \
    && curl -SL "https://download.docker.com/linux/static/stable/$(uname -m)/docker-${DOCKER_CLI_VERSION}.tgz" \
        | tar -xz --strip-components=1 -C /usr/local/bin docker/docker \
    && mkdir -p /usr/local/lib/docker/cli-plugins \
    && curl -SL "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose \
    && chmod +x /usr/local/bin/docker /usr/local/lib/docker/cli-plugins/docker-compose \
    && rm -rf /var/lib/apt/lists/*

# Ajouter l'utilisateur Jenkins au groupe docker (crée si besoin)
RUN groupadd -f docker \
    && usermod -aG docker jenkins

USER jenkins
