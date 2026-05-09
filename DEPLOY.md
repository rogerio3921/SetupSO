# 📤 Git & Deploy - SetupSO v2

## 🔄 Git Status

```bash
cd /home/william/Documentos/Projects\ Will/SetupSO
git status
```

## 📝 Fazer Commit das Mudanças

```bash
# Adicionar todos os arquivos
git add .

# Criar commit
git commit -m "feat: SetupSO v2 - React + Express + MySQL + Docker

- ✅ Frontend React com Tailwind CSS
- ✅ Backend Express com 13 endpoints REST  
- ✅ Prisma ORM com 7 tabelas MySQL
- ✅ Docker Compose com 3 containers
- ✅ 5 arquivos de documentação
- ✅ Portas: 3008 (front), 4008 (back), 3308 (db)
- ✅ Pronto para produção"

# Ver commit
git log -1 --oneline
```

## 🚀 Deploy Local

### Com Docker Compose
```bash
cd /home/william/Documentos/Projects\ Will/SetupSO
docker-compose up --build
```

Acesse:
- Frontend: http://localhost:3008
- Backend: http://localhost:4008/api/health
- MySQL: localhost:3308

### Com Node.js Local
```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
npm start
```

## ☁️ Deploy em Produção

### Opção 1: Docker Hub

```bash
# Login no Docker Hub
docker login

# Taggear imagens
docker tag setupso-backend:latest seu-usuario/setupso-backend:latest
docker tag setupso-frontend:latest seu-usuario/setupso-frontend:latest

# Push
docker push seu-usuario/setupso-backend:latest
docker push seu-usuario/setupso-frontend:latest

# Atualizar docker-compose.yml com seu usuário
sed -i 's|build:|image: seu-usuario/|g' docker-compose.yml
```

### Opção 2: Kubernetes

```bash
# Criar namespaces
kubectl create namespace setupso

# Usar docker-compose para gerar manifests (com Kompose)
kompose convert -f docker-compose.yml -o k8s/

# Deploy
kubectl apply -f k8s/ -n setupso

# Verificar
kubectl get pods -n setupso
kubectl get svc -n setupso
```

### Opção 3: Heroku

```bash
# Login
heroku login

# Criar apps
heroku create setupso-backend --buildpack heroku/nodejs
heroku create setupso-frontend --buildpack heroku/nodejs

# Adicionar MySQL (ClearDB ou similar)
heroku addons:create cleardb:ignite -a setupso-backend

# Deploy
git push heroku main
```

### Opção 4: AWS ECS

```bash
# Criar ECR repositories
aws ecr create-repository --repository-name setupso-backend
aws ecr create-repository --repository-name setupso-frontend

# Tag e push
docker tag setupso-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/setupso-backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/setupso-backend:latest

# Criar ECS task definitions
# ... (vide docs AWS ECS)

# Deploy
aws ecs create-service ...
```

## 🔐 Variáveis de Ambiente Produção

### Backend (.env)
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=mysql://user:password@prod-db.example.com:3306/setupso
CORS_ORIGIN=https://setupso.example.com
JWT_SECRET=seu-secret-super-seguro-aqui
JWT_EXPIRY=7d
LOG_LEVEL=info
```

### Frontend (.env.production)
```env
REACT_APP_API_URL=https://api.setupso.example.com
REACT_APP_ENVIRONMENT=production
REACT_APP_SENTRY_DSN=https://seu-sentry-dsn
```

## 📊 Monitoramento

### Logs
```bash
# Docker
docker-compose logs -f backend

# Kubernetes
kubectl logs -f deployment/setupso-backend -n setupso

# AWS CloudWatch
aws logs tail /setupso/backend --follow
```

### Métricas
```bash
# CPU/Memória
docker stats

# Kubernetes
kubectl top pods -n setupso

# Prometheus (adicionar em produção)
# ... (vide prometheus-docker-compose.yml)
```

## 🔄 CI/CD (GitHub Actions)

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy SetupSO

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Images
        run: |
          docker-compose build
      
      - name: Push to Docker Hub
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag setupso-backend ${{ secrets.DOCKER_USERNAME }}/setupso-backend:latest
          docker tag setupso-frontend ${{ secrets.DOCKER_USERNAME }}/setupso-frontend:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/setupso-backend:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/setupso-frontend:latest
      
      - name: Deploy to Server
        run: |
          ssh -i ${{ secrets.SSH_KEY }} user@server 'cd /app && docker-compose pull && docker-compose up -d'
```

## 🧪 Testes

### Backend
```bash
cd backend
npm install --save-dev jest @types/jest
npm test
```

### Frontend
```bash
cd frontend
npm test
npm run build
npm run build -- --stats
```

## 📈 Performance

### Otimizações Recomendadas

#### Backend
```bash
# Adicionar cache Redis
npm install redis ioredis

# Adicionar compressão
npm install compression

# Adicionar rate limiting
npm install express-rate-limit
```

#### Frontend
```bash
# Lazy loading
npm install react-lazy-load-image-component

# Code splitting
npm install @loadable/component

# Otimizar imagens
npm install imagemin
```

## 📋 Checklist Deploy

- [ ] Código commitado
- [ ] Testes passando
- [ ] Variáveis de ambiente definidas
- [ ] Backup do banco de dados
- [ ] SSL/TLS configurado
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo
- [ ] Logging funcionando
- [ ] Monitoring ativo
- [ ] Rollback plan preparado

## 🆘 Troubleshooting

### Erro: "Cannot connect to database"
```bash
# Verificar MySQL
docker-compose logs db

# Verificar conexão
telnet localhost 3308
```

### Erro: "CORS origin not allowed"
```bash
# Verificar CORS_ORIGIN no backend
docker-compose logs backend | grep CORS

# Atualizar .env
echo "CORS_ORIGIN=https://seu-dominio.com" >> backend/.env
```

### Erro: "Out of memory"
```bash
# Aumentar limite Docker
docker update --memory 2g setupso-backend

# Ou editar docker-compose.yml
services:
  backend:
    mem_limit: 2g
```

## 📞 Contatos & Suporte

- **GitHub**: Issues e Pull Requests
- **Docker Hub**: Tags de release
- **Email**: support@setupso.local
- **Slack**: #setupso-dev

---

**SetupSO v2 - Pronto para qualquer ambiente! 🚀**
