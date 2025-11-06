pipeline {
    agent none

    stages {
        stage('Checkout') {
            agent any
            steps {
                checkout scm
            }
        }

        stage('Backend - Build & Tests') {
            agent {
                docker {
                    image 'maven:3.9.6-eclipse-temurin-17'
                    args '-v $HOME/.m2:/root/.m2'
                    reuseNode false
                }
            }
            steps {
                sh 'mvn -B -f backend/pom.xml clean verify'
            }
            post {
                always {
                    junit 'backend/target/surefire-reports/*.xml'
                }
            }
        }

        stage('Frontend - Build') {
            agent {
                docker {
                    image 'node:20-bullseye'
                    args '-v $HOME/.npm:/root/.npm'
                    reuseNode false
                }
            }
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build -- --configuration production'
                }
                archiveArtifacts artifacts: 'frontend/dist/frontend/browser/**', allowEmptyArchive: true
            }
        }

        stage('Docker Images') {
            agent any
            steps {
                sh 'docker compose -f docker-compose.yml build'
            }
        }
    }

    post {
        success {
            echo 'Build succeeded. Images are available locally on the Jenkins agent.'
        }
        failure {
            echo 'Build failed. Please inspect the stage logs above.'
        }
    }
}
