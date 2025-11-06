FROM jenkins/jenkins:lts-jdk17

USER root

ARG DOCKER_COMPOSE_VERSION=2.27.0

# Install Docker CLI and Docker Compose plugin (standalone binary)
RUN apt-get update \
    && apt-get install -y --no-install-recommends docker.io curl \
    && mkdir -p /usr/local/lib/docker/cli-plugins \
    && curl -SL "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose \
    && chmod +x /usr/local/lib/docker/cli-plugins/docker-compose \
    && rm -rf /var/lib/apt/lists/*

# Allow the jenkins user to access the Docker socket
RUN usermod -aG docker jenkins

USER jenkins
