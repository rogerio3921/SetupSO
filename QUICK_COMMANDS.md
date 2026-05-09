# ⚡ QUICK COMMANDS - SetupSO PWA

## 🚀 Start Development (3 comandos)

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev
# Aparece: "Server running on http://localhost:4000"

# Terminal 2: Frontend  
cd frontend
npm install
npm start
# Abre automaticamente http://localhost:3000
```

## 🐳 Docker (1 comando)

```bash
docker-compose up
# Frontend: http://localhost:3008
# Backend: http://localhost:4008
```

---

## 🧪 Testes Rápidos

```bash
# 1. Login
http://localhost:3000
Email: admin@example.com
Senha: admin123

# 2. Dashboard
Clicar "Dashboard" no menu

# 3. Criar Status
Clicar "Cadastros"
Botão "Novo Status"
Preencher form
Salvar

# 4. Criar Usuário
Clicar "Usuários"
Botão "Novo Usuário"
Preencher form
Salvar

# 5. Offline
F12 → Network → Offline
Reload página
Deve funcionar

# 6. PWA
F12 → Application → Manifest
Deve ter dados
Ícone instalar (canto superior)
```

---

## 🛠️ Build & Deploy

```bash
# Frontend Build
cd frontend
npm run build
# Output: frontend/build/

# Backend Build
cd backend
npm run build
# Output: backend/dist/

# Deploy Frontend (Vercel)
vercel deploy --prod

# Deploy Backend (Railway)
railway up
```

---

## 🐛 Debug Rápido

```bash
# Console Errors
F12 → Console
Procurar red errors

# Network Issues
F12 → Network
Fazer ação
Ver status 200 (ok) ou 4xx/5xx (erro)

# Service Worker
F12 → Application → Service Workers
Deve estar "activated and running"

# Cache
F12 → Application → Cache Storage
Ver setupso-v1.0.0 e setupso-data-v1.0.0

# Token
F12 → Application → Local Storage
Ver "token" e "user"
```

---

## 🔧 Comum Issues & Fixes

```bash
# "npm: command not found"
→ Instalar Node.js em nodejs.org

# "Port 3000 already in use"
→ Kill processo: lsof -ti:3000 | xargs kill -9

# "Module not found: lucide-react"
→ npm install
→ Restart npm start

# "Service Worker não registra"
→ F12 → Clear site data
→ Hard refresh: Ctrl+Shift+R

# "Offline não funciona"
→ F12 → Service Workers
→ Verificar se "activated and running"

# "API timeout"
→ Verificar se backend está rodando
→ curl http://localhost:4000/api/health

# "Database connection error"
→ Verificar DATABASE_URL em .env
→ npx prisma migrate deploy
```

---

## 📱 PWA Quick Test

```bash
# Chrome Desktop
1. http://localhost:3000
2. F12 (DevTools)
3. Application → Manifest
4. Clicar ícone instalação (top right)
5. Aceitar
6. Deve aparecer no menu iniciar

# Mobile (Android)
1. Chrome no Android
2. Ir para http://localhost:3000
3. Menu (3 pontos) → "Instalar app"
4. Aceitar
5. Ícone aparece na home

# iOS (Safari)
1. Safari no iPhone
2. Compartilhar → "Adicionar à Tela Inicial"
3. Aceitar
4. Ícone aparece na home
```

---

## 🔐 Security Quick Check

```bash
# JWT Token
LocalStorage key: "token"
Format: "Bearer eyJhbGci..."
Expiry: 7 dias

# Senha Hashing
bcryptjs 10 salt rounds
Nunca em plain text

# CORS
Configurado para localhost:3000 (dev)
Produção: seu-frontend.com
```

---

## 📊 Database Quick Commands

```bash
# Conectar Database
mysql -u root -p setupso

# Listar tabelas
SHOW TABLES;

# Ver usuários
SELECT * FROM User;

# Ver rooms
SELECT * FROM Room;

# Ver status legends
SELECT * FROM StatusLegend;

# Reset Database (DEV ONLY)
npx prisma migrate reset

# Seed Data
npx prisma db seed
```

---

## 🎯 Endpoints Quick Ref

```bash
# Auth
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET /api/auth/me

# Users
GET /api/users (Bearer token)
POST /api/users (Bearer token)
PATCH /api/users/:id (Bearer token)
DELETE /api/users/:id (Bearer token)

# Status Legends
GET /api/status-legends (Bearer token)
POST /api/status-legends (Bearer token)
PATCH /api/status-legends/:id (Bearer token)
DELETE /api/status-legends/:id (Bearer token)

# Rooms
GET /api/rooms (Bearer token)

# Cases
GET /api/cases (Bearer token)
```

---

## 📝 File Structure Quick Ref

```
frontend/
├── public/
│   ├── manifest.json ............ PWA metadata
│   ├── service-worker.js ........ Offline
│   └── index.html .............. PWA tags
├── src/
│   ├── components/
│   │   ├── Layout.tsx .......... Menu
│   │   ├── Dashboard.tsx ....... KPIs
│   │   ├── StatusLegendCRUD.tsx  Status
│   │   └── UsersCRUD.tsx ....... Users
│   ├── App.tsx ................. Router
│   └── Login.tsx ............... Auth
└── package.json

backend/
├── src/
│   ├── index.ts ............... Main
│   ├── auth.ts ................ JWT
│   ├── routes/
│   │   ├── auth.ts ............ Login
│   │   ├── users.ts .......... Users
│   │   └── ...
│   └── prisma/
│       └── schema.prisma ...... DB schema
└── package.json

docs/
├── LEIA_PRIMEIRO.md
├── RESUMO_EXECUTIVO.md
├── PWA_GUIA_COMPLETO.md
├── TESTE_E_INSTALACAO.md
├── CHECKLIST_FINAL.md
└── BUILD_E_DEPLOY.md
```

---

## 🎓 Environment Variables

```bash
# Frontend .env.development
REACT_APP_API_URL=http://localhost:4000/api

# Backend .env
DATABASE_URL=mysql://user:pass@localhost:3306/setupso
JWT_SECRET=seu_secret_32chars_minimo
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

---

## 📱 Responsive Breakpoints

```
Mobile:  < 768px
Tablet:  768px - 1024px
Desktop: > 1024px

Test sizes:
Mobile:  375x667 (iPhone)
Tablet:  768x1024 (iPad)
Desktop: 1920x1080
```

---

## 🔍 How to...

```bash
# Encontrar um componente
grep -r "Dashboard" frontend/src/

# Encontrar um endpoint
grep -r "GET /api" backend/src/

# Listar portas em uso
lsof -i :3000 | grep LISTEN

# Kill processo na porta
kill -9 $(lsof -t -i:3000)

# Ver variáveis de ambiente
env | grep REACT_APP

# Verificar JWT
node -e "console.log(require('jwt-decode')(token))"
```

---

## 📚 Documentation Quick Links

```
📖 LEIA_PRIMEIRO.md ........... Este documento
🎯 RESUMO_EXECUTIVO.md ....... Status & Roadmap
📱 PWA_GUIA_COMPLETO.md ...... PWA Technical
🧪 TESTE_E_INSTALACAO.md .... Tests & Setup
✅ CHECKLIST_FINAL.md ....... Deliverables
🏗️ BUILD_E_DEPLOY.md ....... Production
```

---

## ⚡ Most Used Commands

```bash
# Start everything
npm install && npm start (frontend)
npm install && npm run dev (backend)

# Build for production
npm run build (frontend)
npm run build (backend)

# Install dependencies
npm install

# Run tests
npm test

# Clear cache
npm cache clean --force

# Update dependencies
npm update

# Check version
npm --version
node --version

# Docker quick
docker-compose up
docker-compose down
docker-compose ps
docker-compose logs
```

---

## 🎯 Daily Checklist

```
☐ Backend rodando na porta 4000
☐ Frontend rodando na porta 3000
☐ Consegui fazer login
☐ Dashboard carregou
☐ Menu funciona
☐ Consegui criar um status
☐ Consegui criar um usuário
☐ Service Worker registrado (F12)
☐ Sem erros no console (F12)
```

---

## 📞 Quick Help

```
🤔 Não sei por onde começar
→ TESTE_E_INSTALACAO.md → "Como Rodar"

🧪 Quero testar
→ TESTE_E_INSTALACAO.md → "Testes"

🐛 Tem erro
→ TESTE_E_INSTALACAO.md → "Troubleshooting"

📚 Quero entender
→ RESUMO_EXECUTIVO.md

🚀 Vou fazer deploy
→ BUILD_E_DEPLOY.md

🔍 Procuro um arquivo
→ grep -r "nome" frontend/
```

---

## ✨ That's it!

**Setup:** 3 minutos  
**First test:** 5 minutos  
**Full test:** 30 minutos  
**Deploy:** 15 minutos  

**Status: 🟢 READY TO USE**

```bash
npm start
# 🚀 You're in!
```

