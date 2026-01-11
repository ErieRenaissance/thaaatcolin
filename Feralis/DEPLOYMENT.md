# Feralis Frontend - Deployment Guide

This guide covers various deployment strategies for the Feralis frontend application.

## Table of Contents

1. [Local Development](#local-development)
2. [Production Build](#production-build)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Platforms](#cloud-platforms)
5. [CI/CD Setup](#cicd-setup)

---

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (default: `http://localhost:3000`)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

Access the app at `http://localhost:5173`

---

## Production Build

### Build the Application

```bash
# Install dependencies
npm ci --only=production

# Build for production
npm run build

# Preview production build locally
npm run preview
```

The optimized production files will be in the `dist/` directory.

### Build Optimizations

The production build includes:
- Code minification
- Tree shaking
- Asset optimization
- Source maps (for debugging)
- Code splitting
- Static asset caching

---

## Docker Deployment

### Build Docker Image

```bash
# Build the image
docker build -t feralis-frontend:latest .

# Run the container
docker run -d \
  --name feralis-frontend \
  -p 80:80 \
  -e VITE_API_URL=https://api.yourdomai.com \
  feralis-frontend:latest
```

### Docker Compose (Full Stack)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f frontend

# Stop all services
docker-compose down
```

### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feralis-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: feralis-frontend
  template:
    metadata:
      labels:
        app: feralis-frontend
    spec:
      containers:
      - name: frontend
        image: feralis-frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_API_URL
          value: "https://api.yourdomain.com"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: feralis-frontend
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: feralis-frontend
```

Deploy to Kubernetes:
```bash
kubectl apply -f deployment.yaml
```

---

## Cloud Platforms

### Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Configure environment variables in Vercel dashboard

### Netlify

1. Install Netlify CLI:
```bash
npm i -g netlify-cli
```

2. Build and deploy:
```bash
npm run build
netlify deploy --prod --dir=dist
```

3. Configure build settings in `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### AWS S3 + CloudFront

1. Build the application:
```bash
npm run build
```

2. Upload to S3:
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

3. Invalidate CloudFront cache:
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### Google Cloud Platform

1. Build the application:
```bash
npm run build
```

2. Deploy to Cloud Storage:
```bash
gsutil -m rsync -r -d dist/ gs://your-bucket-name
```

3. Configure bucket for website hosting in GCP Console

### Azure Static Web Apps

1. Install Azure CLI:
```bash
npm i -g @azure/static-web-apps-cli
```

2. Deploy:
```bash
swa deploy dist
```

---

## CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.API_URL }}
      
      - name: Deploy to production
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
image: node:18

stages:
  - build
  - deploy

cache:
  paths:
    - node_modules/

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
  only:
    - main

deploy:
  stage: deploy
  script:
    - echo "Deploying to production..."
    # Add your deployment commands here
  only:
    - main
```

### Jenkins

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any
    
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm run lint'
                sh 'npm run type-check'
            }
        }
        
        stage('Deploy') {
            steps {
                sh '''
                    # Add deployment commands
                    echo "Deploying to production..."
                '''
            }
        }
    }
}
```

---

## Environment Configuration

### Production Environment Variables

```env
VITE_API_URL=https://api.yourdomain.com
VITE_API_TIMEOUT=30000
VITE_APP_NAME=Feralis Manufacturing Platform
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PORTAL=true
VITE_ENABLE_REAL_TIME_UPDATES=true
```

### Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Environment Variables**: Never commit secrets to version control
3. **API Keys**: Store sensitive keys in secure vaults (AWS Secrets Manager, etc.)
4. **CSP Headers**: Configure Content Security Policy in nginx
5. **CORS**: Ensure backend allows only your domain

---

## Performance Optimization

### Enable Caching

Configure nginx for optimal caching:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Enable Compression

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1024;
```

### CDN Configuration

Use a CDN (CloudFlare, Fastly, etc.) for:
- Static asset delivery
- DDoS protection
- SSL termination
- Geographic distribution

---

## Monitoring

### Health Checks

The nginx configuration includes a health endpoint:
```bash
curl http://your-domain/health
```

### Application Monitoring

Integrate monitoring tools:
- **Sentry**: Error tracking
- **Google Analytics**: User analytics
- **LogRocket**: Session replay
- **New Relic**: Performance monitoring

### Logging

Configure structured logging:
```javascript
// Example logging setup
console.log({
  level: 'info',
  message: 'User logged in',
  userId: user.id,
  timestamp: new Date().toISOString()
});
```

---

## Rollback Strategy

### Docker Rollback

```bash
# Tag previous working version
docker tag feralis-frontend:latest feralis-frontend:backup

# Rollback
docker stop feralis-frontend
docker rm feralis-frontend
docker run -d --name feralis-frontend feralis-frontend:backup
```

### Kubernetes Rollback

```bash
# View deployment history
kubectl rollout history deployment/feralis-frontend

# Rollback to previous version
kubectl rollout undo deployment/feralis-frontend

# Rollback to specific revision
kubectl rollout undo deployment/feralis-frontend --to-revision=2
```

---

## Troubleshooting

### Common Issues

**Issue**: Blank page after deployment
- Check browser console for errors
- Verify API_URL is correct
- Check nginx error logs

**Issue**: Assets not loading
- Verify asset paths in build
- Check nginx static file serving
- Clear browser cache

**Issue**: API calls failing
- Check CORS configuration
- Verify API_URL environment variable
- Check network tab in dev tools

### Debug Mode

Enable debug logging:
```env
VITE_DEBUG=true
```

---

## Support

For deployment issues:
- Email: devops@feralis.com
- Slack: #deployment
- Wiki: [Internal Deployment Docs]
