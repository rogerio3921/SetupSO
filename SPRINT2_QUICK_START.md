# ⚡ Sprint 2 - Quick Start Guide

## 🚀 Start em 5 Minutos

```bash
# 1. Ir ao projeto
cd "/home/william/Documentos/Projects Will/SetupSO"

# 2. Build
docker-compose up --build

# 3. Abrir navegador
http://localhost:3008

# 4. Registrar novo usuário
- Email: seu-email@test.com
- Senha: senha123
- Nome: Seu Nome
- Crachá: 001

# 5. Pronto! Autenticado ✅
```

---

## 📝 O que foi feito em Sprint 2

### Backend
- ✅ JWT token generation (7 dias expiry)
- ✅ bcryptjs password hashing
- ✅ 4 auth endpoints (register, login, logout, me)
- ✅ Protected routes middleware
- ✅ Role-based access (Admin/User)

### Frontend
- ✅ Login component (register/login toggle)
- ✅ Token persistence (localStorage)
- ✅ Authorization headers (Bearer token)
- ✅ User info in header
- ✅ Logout functionality

### Files Created
```
backend/src/auth.ts                    (JWT utils)
backend/src/routes/auth.ts             (Auth endpoints)
frontend/src/Login.tsx                 (Login form)
ROADMAP_DETALHADO.md                   (5 sprints)
SPRINT2_SETUP.md                       (Setup guide)
SPRINT2_CHECKLIST.md                   (Validation)
SPRINT2_SUMARIO.md                     (Summary)
```

---

## 🧪 Quick Tests

### Test 1: Register
```bash
curl -X POST http://localhost:4008/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "fullName": "Test User",
    "badgeNumber": "TEST001"
  }'

# Response: { "token": "eyJ...", "user": {...} }
```

### Test 2: Login
```bash
curl -X POST http://localhost:4008/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'

# Response: { "token": "eyJ...", "user": {...} }
```

### Test 3: Protected Route
```bash
# SAVE TOKEN FROM ABOVE
TOKEN="eyJ..." 

curl http://localhost:4008/api/rooms \
  -H "Authorization: Bearer $TOKEN"

# Response: [{ "id": "...", "code": "SO1", ... }]
```

### Test 4: Without Token
```bash
curl http://localhost:4008/api/rooms

# Response: { "error": "No token provided" }
```

---

## 🔑 Key Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| /auth/register | POST | ❌ | Create account |
| /auth/login | POST | ❌ | Get token |
| /auth/logout | POST | ✅ | Client logout |
| /auth/me | GET | ✅ | Current user |
| /rooms | GET | ✅ | List rooms |
| /cases | GET | ✅ | List cases |
| /events | GET/POST | ✅ | Events |
| /users | GET | ✅ Admin | List users |

---

## 🛠️ Environment Setup

### If using Docker (Recommended)
```bash
docker-compose up --build
# Automatically configured!
```

### If running locally
```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET
npm run prisma:migrate
npm run prisma:seed
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm start
```

---

## 📁 Project Structure

```
SetupSO/
├── backend/
│   ├── src/
│   │   ├── auth.ts ✨ NEW
│   │   ├── routes/auth.ts ✨ NEW
│   │   └── server.ts (modified)
│   └── package.json (modified)
├── frontend/
│   ├── src/
│   │   ├── Login.tsx ✨ NEW
│   │   └── App.tsx (modified)
│   └── package.json
└── docker-compose.yml (modified)
```

---

## 🔐 Security Summary

| Feature | Status |
|---------|--------|
| Password Hashing | bcryptjs (10 rounds) ✅ |
| JWT Tokens | 7 days expiry ✅ |
| CORS | localhost:3000 ✅ |
| Protected Routes | Bearer token required ✅ |
| Role-based Access | Admin/User roles ✅ |
| Secrets in .env | Not hardcoded ✅ |

---

## 🐛 Common Issues

**"Module not found"** → `cd backend && npm install`  
**"CORS error"** → Check docker-compose CORS_ORIGIN  
**"DB connection"** → `docker-compose logs db`  
**"Token invalid"** → `localStorage.clear()` and re-login  

---

## 📊 What's Next?

### Sprint 3 (In 2 weeks)
- Advanced room detail view
- Dashboard TV with KPIs
- Timeline visualization
- Real-time event tracking

### See Also
- `ROADMAP_DETALHADO.md` - Full 5-sprint plan
- `SPRINT2_SETUP.md` - Detailed setup
- `SPRINT2_CHECKLIST.md` - Validation checklist

---

## ✅ You're All Set!

Sprint 2 is complete and ready to test. Follow the Quick Start above to see authentication in action.

**Questions?** Check the documentation files in the project root.

**Ready for Sprint 3?** Let's build the advanced interface! 🎨
