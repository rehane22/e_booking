#!/bin/bash
set -euo pipefail

if [ -S /var/run/docker.sock ]; then
    DOCKER_GID=$(stat -c '%g' /var/run/docker.sock || echo 0)
    TARGET_GROUP="docker"

    if [ "$DOCKER_GID" -eq 0 ]; then
        TARGET_GROUP="root"
    else
        if ! getent group "$TARGET_GROUP" >/dev/null 2>&1; then
            groupadd -g "$DOCKER_GID" "$TARGET_GROUP"
        else
            CURRENT_DOCKER_GID=$(getent group "$TARGET_GROUP" | cut -d: -f3)
            if [ "$CURRENT_DOCKER_GID" != "$DOCKER_GID" ]; then
                groupmod -g "$DOCKER_GID" "$TARGET_GROUP"
            fi
        fi
    fi

    usermod -aG "$TARGET_GROUP" jenkins || true
    chmod 666 /var/run/docker.sock || true
fi

chown -R jenkins:jenkins /var/jenkins_home

if command -v gosu >/dev/null 2>&1; then
    exec gosu jenkins /usr/bin/tini -- /usr/local/bin/jenkins.sh "$@"
else
    exec /usr/bin/tini -- /usr/local/bin/jenkins.sh "$@"
fi
