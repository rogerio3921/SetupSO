# 🚀 SetupSO - Sprint 2 (JWT Auth) - Guia de Instalação

## 📋 Pré-requisitos

- Node.js 20+ 
- Docker Desktop instalado
- Git

## 🎯 O que é Sprint 2?

Sprint 2 implementa autenticação JWT completa:
- ✅ Login/Registro com email e senha
- ✅ Criptografia de senhas com bcrypt
- ✅ Geração de JWT tokens
- ✅ Proteção de rotas com middleware
- ✅ Controle de acesso por role (Admin/User)
- ✅ UI de login React

---

## 🐳 Instalação com Docker (RECOMENDADO)

### 1️⃣ Clonar/preparar projeto

```bash
cd "/home/william/Documentos/Projects Will/SetupSO"
```

### 2️⃣ Construir e iniciar containers

```bash
docker-compose up --build
```

**Outputs esperados:**
```
db        | 2026-05-09 10:30:45 0 [System] MySQL Server has started
backend   | Server running on port 4000
frontend  | webpack compiled with warnings
```

### 3️⃣ Acessar aplicação

- **Frontend**: http://localhost:3008
- **Backend**: http://localhost:4008/api
- **MySQL**: localhost:3308

### 4️⃣ Primeiro login

Na tela de login:
- **Registrar novo usuário** (primeira vez)
- Email: `admin@setupso.com`
- Senha: `senha123`
- Nome: `Admin User`
- Crachá: `001`

```
Após registrar, você receberá um JWT token
que será armazenado no localStorage
```

---

## 💻 Instalação Local (Sem Docker)

### Backend Setup

#### 1️⃣ Instalar dependências

```bash
cd backend
npm install
```

**Novas dependências adicionadas:**
- `jsonwebtoken` - JWT tokens
- `bcryptjs` - Password hashing
- `@types/jsonwebtoken` - TypeScript types
- `@types/bcryptjs` - TypeScript types

#### 2️⃣ Configurar ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env
```

**Arquivo `.env` deve conter:**
```
DATABASE_URL="mysql://user:password@localhost:3306/setupso"
JWT_SECRET="sua-chave-secreta-super-segura-mude-em-producao"
JWT_EXPIRY="7d"
CORS_ORIGIN="http://localhost:3000"
PORT=4000
NODE_ENV="development"
```

#### 3️⃣ Setup banco de dados

```bash
# Gerar cliente Prisma
npm run prisma:generate

# Executar migrações
npm run prisma:migrate

# Popular com dados iniciais
npm run prisma:seed
```

#### 4️⃣ Iniciar servidor

```bash
npm run dev
```

**Output esperado:**
```
Server running on port 4000
Connected to MySQL
```

---

### Frontend Setup

#### 1️⃣ Instalar dependências

```bash
cd frontend
npm install
```

#### 2️⃣ Configurar ambiente

```bash
# Arquivo .env.development (já deve existir)
REACT_APP_API_URL=http://localhost:4008/api
```

#### 3️⃣ Iniciar dev server

```bash
npm start
```

**Output esperado:**
```
webpack compiled successfully
Local: http://localhost:3000
```

---

### MySQL Setup (Local)

Se não usar Docker:

#### 1️⃣ Instalar MySQL 8.0

```bash
# Ubuntu/Debian
sudo apt-get install mysql-server

# macOS (brew)
brew install mysql

# Windows: Download do MySQL.com
```

#### 2️⃣ Criar banco de dados

```bash
mysql -u root -p

CREATE DATABASE setupso;
CREATE USER 'setupso'@'localhost' IDENTIFIED BY 'setupso123';
GRANT ALL PRIVILEGES ON setupso.* TO 'setupso'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 3️⃣ Atualizar `.env` do backend

```
DATABASE_URL="mysql://setupso:setupso123@localhost:3306/setupso"
```

---

## 🧪 Testando Autenticação

### Via Postman/cURL

#### 1️⃣ Registrar usuário

```bash
curl -X POST http://localhost:4008/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "senha123",
    "fullName": "João Silva",
    "badgeNumber": "002",
    "department": "Centro Cirúrgico",
    "function": "Cirurgião"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid...",
    "email": "usuario@example.com",
    "fullName": "João Silva",
    "role": "User"
  }
}
```

#### 2️⃣ Login

```bash
curl -X POST http://localhost:4008/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "senha123"
  }'
```

#### 3️⃣ Acessar rota protegida

```bash
# Substituir TOKEN pelo value retornado acima
curl -X GET http://localhost:4008/api/rooms \
  -H "Authorization: Bearer TOKEN"
```

**Sem token:**
```bash
curl -X GET http://localhost:4008/api/rooms
# Response: { "error": "No token provided" }
```

---

## 🔐 Segurança em Sprint 2

### ✅ Implementado

- Passwords hasheadas com bcryptjs
- JWT com expiração (7 dias padrão)
- CORS restrito para localhost:3000
- Middleware validação de token
- Controle por role (Admin/User)

### ⚠️ TODO (Próximas sprints)

- [ ] HTTPS em produção
- [ ] Refresh token rotation
- [ ] Rate limiting de login
- [ ] 2FA (two-factor auth)
- [ ] Password reset email
- [ ] Session revocation
- [ ] Audit logging

---

## 📁 Estrutura de Arquivos - Sprint 2

```
backend/
├─ src/
│  ├─ auth.ts                    ← JWT + bcrypt utilities
│  ├─ routes/
│  │  └─ auth.ts                 ← Login/Register endpoints
│  └─ server.ts                  ← Atualizado com middlewares
└─ package.json                  ← Novas dependências

frontend/
├─ src/
│  ├─ Login.tsx                  ← Nova: formulário de login
│  ├─ App.tsx                    ← Atualizado: autenticação
│  └─ index.tsx
└─ package.json
```

---

## 🐛 Troubleshooting

### "Cannot find module 'jsonwebtoken'"

```bash
# No backend/
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

### "JWT is not defined"

```bash
# Verificar import em server.ts
import { authMiddleware } from './auth';
```

### "CORS error quando faz login"

```bash
# Verificar CORS_ORIGIN no .env
CORS_ORIGIN="http://localhost:3000"
```

### "MySQL connection refused"

```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql
sudo systemctl start mysql

# Ou com Docker
docker-compose logs db
```

### Token não persiste no localStorage

```javascript
// Verificar no console:
localStorage.getItem('token')
localStorage.getItem('user')
```

---

## 📊 Endpoints Sprint 2

### Auth (Público)

| Method | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrar novo usuário |
| POST | `/api/auth/login` | Login com email/senha |
| POST | `/api/auth/logout` | Logout (limpar client) |
| GET | `/api/auth/me` | Dados do usuário atual |

### Protected (Requer Token)

| Method | Endpoint | Requer Role |
|--------|----------|-------------|
| GET | `/api/rooms` | User |
| GET | `/api/cases` | User |
| GET | `/api/events` | User |
| POST | `/api/events` | User |
| GET | `/api/users` | Admin |
| POST | `/api/users` | Admin |

---

## 🎓 Próximos Passos

### Para Testar Sprint 2:

1. Iniciar projeto (Docker/Local)
2. Ir para http://localhost:3008
3. Clicar "Não tem conta? Registre-se"
4. Preencher formulário
5. Fazer login
6. Ver grid de salas (protegido)
7. Clicar "Sair" e verificar limpeza

### Para Sprint 3:

Após Sprint 2 funcionar 100%, iniciaremos:
- Interface avançada com detalhes da sala
- Dashboard TV com KPIs
- Timeline visual de eventos

---

## 📞 Suporte

**Erro ao iniciar?**

1. Verificar logs: `docker-compose logs`
2. Deletar containers: `docker-compose down -v`
3. Reconstruir: `docker-compose up --build`

**Precisa resetar dados?**

```bash
# Com Docker
docker-compose exec db mysql -u root -p setupso < /dev/null
docker-compose exec backend npm run prisma:reset

# Sem Docker
npm run prisma:reset
```

---

**Versão**: Sprint 2 (9/5/2026)  
**Status**: ✅ Pronto para testes  
**Próxima Sprint**: Sprint 3 - Interface Avançada
