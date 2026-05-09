# 🚀 SetupSO PWA - PRONTO PARA TESTAR

## ✅ O que foi entregue nesta sprint

### 📱 PWA Completa
- ✅ Manifest.json com metadados
- ✅ Service Worker com offline support
- ✅ Meta tags PWA no HTML
- ✅ Instalação em desktop e mobile

### 🎨 Componentes React
- ✅ Layout.tsx - Menu lateral + header
- ✅ Dashboard.tsx - Dashboard com KPIs
- ✅ StatusLegendCRUD.tsx - Gestão de status
- ✅ UsersCRUD.tsx - Gestão de usuários
- ✅ App.tsx - Integração e routing

### 🔐 Segurança & Perfis
- ✅ Autenticação JWT
- ✅ Middleware de proteção
- ✅ Perfis: Master, Admin, User
- ✅ Menu filtrado por perfil

---

## 🏃 Como Rodar (3 passos)

### 1️⃣ Backend Setup
```bash
cd backend

# Instalar dependências
npm install

# Configurar .env (se não existir)
# DATABASE_URL=mysql://user:password@localhost:3306/setupso
# JWT_SECRET=seu_secret_aqui
# JWT_EXPIRY=7d

# Rodar prisma
npx prisma migrate dev --name init
npx prisma db seed

# Rodar servidor
npm run dev
# Deve aparecer: "Server running on http://localhost:4000"
```

### 2️⃣ Frontend Setup
```bash
cd frontend

# Instalar dependências (agora com lucide-react)
npm install

# Rodar desenvolvimento
npm start
# Deve abrir http://localhost:3000 automaticamente
```

### 3️⃣ Docker Compose (Alternativa)
```bash
# Na raiz do projeto
docker-compose up

# Backend → http://localhost:4008
# Frontend → http://localhost:3008
```

---

## 🧪 Sequência de Testes

### Teste 1: Login
```
1. Abrir http://localhost:3000 (ou 3008 em Docker)
2. Preencher credenciais:
   - Email: admin@example.com
   - Senha: admin123 (ou conforme seed)
3. Clicar "Entrar"
4. Deve ir para Dashboard
```

### Teste 2: Menu Lateral
```
1. Após login, verificar menu lateral esquerdo
2. Deve mostrar itens conforme perfil (Admin):
   ✅ Dashboard
   ✅ Salas Cirúrgicas
   ✅ Cadastros → Status
   ✅ Usuários
   ✅ Relatórios
3. Clicar em cada item
4. Deve mudar o conteúdo da página
```

### Teste 3: Dashboard
```
1. Ir para Dashboard
2. Ver KPI cards (4 cards em desktop):
   - Salas em Uso
   - Salas em Preparo
   - Pacientes em Andamento
   - Tempo Médio (120 min)
3. Ver grid de salas abaixo
4. Cada sala deve mostrar:
   - Código
   - Nome
   - Status (cor)
   - Paciente (se houver)
   - Procedimento (se houver)
```

### Teste 4: Cadastro de Status
```
1. Ir para Cadastros
2. Ver lista de status existentes
3. Clicar "Novo Status"
4. Preencher:
   - Status: TESTE
   - Rótulo: Status de Teste
   - Cor: Verde (#16a085)
5. Clicar "Salvar"
6. Deve aparecer na lista
7. Tentar editar (cor)
8. Tentar deletar
```

### Teste 5: Cadastro de Usuários
```
1. Ir para Usuários
2. Ver lista de usuários
3. Clicar "Novo Usuário"
4. Preencher:
   - Email: teste@example.com
   - Nome: João Silva
   - Crachá: 123456
   - Senha: teste123
   - Perfil: Admin
   - Função: Operador
5. Clicar "Salvar"
6. Deve aparecer na lista
7. Tentar editar
8. Tentar deletar
```

### Teste 6: Logout
```
1. Clicar nome do usuário (canto superior direito)
2. Clicar "Sair"
3. Deve voltar para login
4. Token deve ser removido
```

---

## 📦 PWA Installation Test

### Chrome/Edge Desktop
```
1. http://localhost:3000
2. Procurar ícone "Instalar" (canto superior direito)
3. Clicar em "Instalar"
4. Aceitar permissões
5. PWA deve aparecer no menu iniciar/desktop
6. Clicar para abrir como app standalone
```

### Android (Chrome Mobile)
```
1. Abrir Chrome no Android
2. Ir para http://localhost:3000 (HTTPS necessário em produção)
3. Menu (3 pontos) → "Instalar app"
4. Aceitar
5. Ícone aparece na home screen
6. Funciona como app nativo
```

### iOS (Safari)
```
1. Abrir Safari no iPhone
2. Compartilhar → "Adicionar à Tela Inicial"
3. Nome: SetupSO
4. Aceitar
5. Ícone aparece na home screen
6. Funciona como web app
```

---

## 🔍 DevTools Inspection

### Chrome/Edge DevTools
```
1. F12 para abrir DevTools
2. Application → Manifest
   - Verificar nome, ícones, cores
3. Application → Service Workers
   - Deve estar registrado
   - Status: "activated and running"
4. Application → Cache Storage
   - setupso-v1.0.0 (assets)
   - setupso-data-v1.0.0 (API cache)
5. Network → Offline
   - Testar app offline
```

---

## 🐛 Troubleshooting

### Erro: "API não conecta"
```
- Verificar se backend está rodando (localhost:4000 ou 4008)
- Verificar CORS em backend/src/index.ts
- Verificar token no localStorage
```

### Erro: "Service Worker não registra"
```
- HTTPS obrigatório em produção
- HTTP ok em localhost
- Verificar console do navegador (F12)
- Reload com Ctrl+Shift+R
```

### Erro: "Componentes não renderizam"
```
- Verificar se lucide-react foi instalado (npm install)
- Verificar imports em App.tsx
- npm run build para testar produção
```

### Erro: "Tailwind CSS não funciona"
```
- Verificar se tailwindcss está em package.json
- npm install
- Restart do servidor (npm start)
```

---

## 📊 Monitoramento

### Verificar registros
```
Backend: http://localhost:4000 (logs no console)
Frontend: http://localhost:3000 (F12 → Console)
```

### Performance
```
1. F12 → Performance
2. Clicar "Record"
3. Interagir com app
4. Parar recording
5. Ver timeline
```

### Network
```
1. F12 → Network
2. Fazer ação (login, criar status, etc)
3. Ver requisições (status 200 ok, 401 erro)
```

---

## ✅ Checklist de Aceitação

- [ ] App loga com sucesso
- [ ] Menu lateral mostra itens corretos
- [ ] Dashboard carrega KPIs
- [ ] Cadastro de Status funciona (criar)
- [ ] Cadastro de Usuários funciona (criar)
- [ ] Logout remove token
- [ ] Offline funciona (Service Worker)
- [ ] PWA instala em navegador
- [ ] Componentes responsivos (mobile/tablet/desktop)
- [ ] Sem erros no console (F12)

---

## 📝 Endpoints Disponíveis

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me (protegido)
```

### Users
```
GET /api/users (protegido)
POST /api/users (protegido)
PATCH /api/users/:id (protegido)
DELETE /api/users/:id (protegido)
```

### Status Legends
```
GET /api/status-legends (protegido)
POST /api/status-legends (protegido)
PATCH /api/status-legends/:id (protegido)
DELETE /api/status-legends/:id (protegido)
```

### Rooms & Cases
```
GET /api/rooms (protegido)
GET /api/cases (protegido)
(CRUD não implementado ainda)
```

---

## 🎯 Próximas Tarefas

**Sprint 3:**
- [ ] Implementar CRUD completo de Salas
- [ ] Implementar CRUD completo de Cards
- [ ] Dashboard TV (kiosk mode)
- [ ] WebSocket para sync real-time
- [ ] Relatórios avançados
- [ ] Push notifications

---

## 📞 Suporte

**Problemas?**
- Verificar console (F12)
- Verificar network (F12 → Network)
- Verificar Application (F12 → Application)
- Rodar: npm cache clean --force
- Rodar: npm install

**Status: 🟢 PRONTO PARA USAR**

