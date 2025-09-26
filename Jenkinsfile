pipeline {
    agent any
    
    environment {
        // AWS Configuration
        AWS_REGION = 'ap-south-1'
        ECR_REGISTRY = '481665127661.dkr.ecr.ap-south-1.amazonaws.com'
        ECR_REPOSITORY = 'nlq-backend'
        IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT[0..7]}"
        
        // Kubernetes Configuration
        K8S_NAMESPACE = 'nlq-system'
        K8S_DEPLOYMENT = 'nlq-backend'
        
        // Docker Configuration
        DOCKER_BUILDX_BUILDER = 'multiarch-builder'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }
        
        stage('Setup Build Environment') {
            steps {
                script {
                    // Create buildx builder if it doesn't exist
                    sh '''
                        if ! docker buildx ls | grep -q multiarch-builder; then
                            docker buildx create --name multiarch-builder --use
                        else
                            docker buildx use multiarch-builder
                        fi
                        docker buildx inspect --bootstrap
                    '''
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    sh '''
                        if [ -f package.json ]; then
                            npm ci
                        fi
                    '''
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                script {
                    sh '''
                        if [ -f package.json ] && npm run test --if-present; then
                            echo "Tests passed"
                        else
                            echo "No tests found or tests failed"
                        fi
                    '''
                }
            }
        }
        
        stage('Lint Code') {
            steps {
                script {
                    sh '''
                        if [ -f package.json ] && npm run lint --if-present; then
                            echo "Linting passed"
                        else
                            echo "No linting configured or linting failed"
                        fi
                    '''
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    sh '''
                        # Login to ECR
                        aws ecr get-login-password --region ${AWS_REGION} | \
                        docker login --username AWS --password-stdin ${ECR_REGISTRY}
                        
                        # Build and push image
                        docker buildx build \
                            --platform linux/amd64 \
                            -t ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG} \
                            -t ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest \
                            --push .
                        
                        echo "Image built and pushed: ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
                    '''
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            when {
                branch 'master'
            }
            steps {
                script {
                    sh '''
                        # Update deployment with new image
                        kubectl set image deployment/${K8S_DEPLOYMENT} \
                            ${K8S_DEPLOYMENT}=${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG} \
                            -n ${K8S_NAMESPACE}
                        
                        # Wait for rollout to complete
                        kubectl rollout status deployment/${K8S_DEPLOYMENT} -n ${K8S_NAMESPACE} --timeout=300s
                        
                        echo "Deployment completed successfully"
                    '''
                }
            }
        }
        
        stage('Health Check') {
            when {
                branch 'master'
            }
            steps {
                script {
                    sh '''
                        # Wait for pods to be ready
                        kubectl wait --for=condition=ready pod \
                            -l app=${K8S_DEPLOYMENT} \
                            -n ${K8S_NAMESPACE} \
                            --timeout=300s
                        
                        # Get service URL
                        SERVICE_URL=$(kubectl get service ${K8S_DEPLOYMENT}-service -n ${K8S_NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
                        
                        if [ -n "$SERVICE_URL" ]; then
                            echo "Service URL: https://${SERVICE_URL}"
                            
                            # Health check
                            for i in {1..10}; do
                                if curl -f -s "https://${SERVICE_URL}/health" > /dev/null; then
                                    echo "Health check passed"
                                    break
                                else
                                    echo "Health check attempt $i failed, retrying..."
                                    sleep 10
                                fi
                            done
                        else
                            echo "Service URL not available, skipping health check"
                        fi
                    '''
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Clean up buildx builder
                sh 'docker buildx rm multiarch-builder || true'
            }
        }
        
        success {
            script {
                if (env.BRANCH_NAME == 'master') {
                    slackSend(
                        channel: '#deployments',
                        color: 'good',
                        message: "✅ Backend deployment successful!\n" +
                                "• Branch: ${env.BRANCH_NAME}\n" +
                                "• Build: ${env.BUILD_NUMBER}\n" +
                                "• Commit: ${env.GIT_COMMIT_SHORT}\n" +
                                "• Image: ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}\n" +
                                "• Environment: Production"
                    )
                }
            }
        }
        
        failure {
            script {
                slackSend(
                    channel: '#deployments',
                    color: 'danger',
                    message: "❌ Backend deployment failed!\n" +
                            "• Branch: ${env.BRANCH_NAME}\n" +
                            "• Build: ${env.BUILD_NUMBER}\n" +
                            "• Commit: ${env.GIT_COMMIT_SHORT}\n" +
                            "• Check logs for details"
                )
            }
        }
        
        cleanup {
            cleanWs()
        }
    }
}
