# 🆕 NOVAS FUNCIONALIDADES - Sprint 2.5

## 📋 Cadastro de Usuários - ATUALIZADO

### Campos Agora Disponíveis

```
✅ Nome Completo (obrigatório)
✅ Número do Crachá (obrigatório)
✅ Número COREN (opcional)
✅ Departamento (Enfermagem, Médico, Anestesiologia, Instrumentação)
✅ Função (Auxiliar, Técnico, Enfermeiro)
✅ Login/Email (único, não editável)
✅ Senha (requerida ao criar, vazio ao editar)
✅ Perfil (Usuário, Admin)
```

### Perfis e Permissões

| Ação | Usuário | Admin |
|------|---------|-------|
| Ver Dashboard | ✅ | ✅ |
| Setup Sala | ✅ | ✅ |
| Cadastros | ❌ | ✅ |
| Usuários | ❌ | ✅ |
| Relatórios | ❌ | ✅ |
| Editar Dados | ❌ | ✅ |

### Como Usar

```
1. Menu → Usuários
2. Clicar "Novo Usuário"
3. Preencher todos os campos obrigatórios
4. Selecionar Departamento (Enfermagem)
5. Selecionar Função (Auxiliar/Técnico/Enfermeiro)
6. Selecionar Perfil (Usuário ou Admin)
7. Clicar "Salvar"
```

---

## ⏱️ SETUP DE SALA - TEMPOS E MOVIMENTOS

### 🎯 Objetivo Principal

Registrar e monitorar todos os tempos de entrada, saída e início/fim de cada fase da cirurgia de cada paciente.

**Início da Contagem:** A partir do transporte (saída do bloco operatório para buscar paciente)

---

### 📊 Fases Monitoradas

```
1. TRANSPORTE
   - Saída da Unidade (início do transporte)
   - Entrada no CC (fim do transporte)

2. CIRURGIA
   - Início da cirurgia
   - Fim da cirurgia

3. ANESTESIA
   - Início da anestesia
   - Fim da anestesia

4. POSICIONAMENTO
   - Início
   - Fim

5. TIME OUT
   - Início
   - Fim

6. LIMPEZA
   - Entrada
   - Saída

7. FARMÁCIA
   - Entrada
   - Saída

8. ENGENHARIA CLÍNICA
   - Entrada
   - Saída
```

---

### ⚠️ REGRAS IMPORTANTES

#### 1. Registros Não Preenchidos
```
- Se um registro NÃO for preenchido
- Assume valor 00h00 (não contabilizado)
- Sistema mostra popup alertando
```

#### 2. Começar a Contar a Partir do Primeiro Registro
```
- Tempo começa a ser contado no PRIMEIRO registro
- Registros anteriores não preenchidos = 00h00
```

#### 3. Detecção de Atrasos
```
- Se hora de TRANSPORTE_FIM > HORA_PREVISTA
- Status muda para "EM ATRASO"
- Diferença de minutos é exibida
```

#### 4. Justificativa de Atraso
```
Se sistema detecta atraso:
- Popup aparece solicitando motivo
- Motivos disponíveis:
  ✅ Atraso no transporte
  ✅ Atraso Equipe Médica
  ✅ Atraso Equipe Anestesiologia
  ✅ Atraso Equipe Enfermagem
  ✅ Atraso Equipamento
  ✅ Atraso Preparação Sala
  ✅ Outro motivo
```

---

### 🎨 Visual e Status

#### Grid de Salas

```
┌─────────────────────────────────┐
│ SALA 1          03h00    [1]    │
│ SALA 1 - JOSÉ CARLOS            │
│ Paciente: José Carlos           │
│ Hora Prevista: 08:00            │
│ STATUS: EM ATRASO (30 min)      │
│ ⚠️ Justificar atraso            │
└─────────────────────────────────┘
```

#### Cores de Status

```
🟢 LIBERADO .............. Sala vazia, preparada
🟡 EM PREPARO ............ Equipamentos sendo preparados
🔵 EM TRANSPORTE ......... Paciente em transporte
🟣 EM CIRURGIA ........... Cirurgia em andamento
🔴 EM ATRASO ............. Atraso detectado
```

---

### 🖱️ Como Usar - Passo a Passo

#### 1. Acessar Setup de Sala

```
Menu → Setup Sala (relógio ⏱️)
```

#### 2. Selecionar uma Sala

```
Clique em um card de sala para abrir detalhes
- Mostra: Código, Paciente, Status
- Clique abre painel de edição
```

#### 3. Preencher Tempos

```
Para cada fase (ex: TRANSPORTE):
1. Clique no campo de horário
2. Selecione "Início" ou "Fim"
3. Digite horário (ou use timepicker)
4. Sistema valida automáticamente
5. Ícone ✓ aparece após preenchimento
```

#### 4. Se Houver Atraso

```
Se TRANSPORTE_FIM > HORA_PREVISTA:
1. Popup aparece: "Justificar Atraso"
2. Selecione o motivo
3. Clique "Confirmar"
4. Motivo é registrado
```

#### 5. Salvar Alterações

```
1. Preencha todos os campos desejados
2. Clique "✓ Salvar Alterações"
3. Botão "Próxima Sala" para ir para outra sala
4. Dados são sincronizados com API
```

---

### 🔍 Campos de Edição

Cada campo de tempo tem:

```
┌──────────────────────┐
│ TRANSPORTE           │
│ Saída da Unidade     │
├──────────────────────┤
│ [HH:MM timepicker]   │
│ [Início] [Fim]       │
│ ✓ 08:15              │ (após preenchimento)
└──────────────────────┘
```

---

### 📈 Alertas e Validações

| Situação | Alerta | Ação |
|----------|--------|------|
| Atraso na chegada | 🔴 EM ATRASO | Popup de justificativa |
| Tempo não preenchido | ⚠️ Aviso | Assume 00h00 |
| TIME OUT não feito | ❌ Erro | Alerta ao salvar |
| Tempo inválido | ❌ Erro | Campo fica vermelho |

---

### 💾 Dados Salvos

Sistema salva automaticamente:

```
✅ Cada horário registrado
✅ Status calculado
✅ Justificativa de atraso
✅ Timestamp de modificação
✅ Usuário que registrou
```

Dados são sincronizados com o servidor via API.

---

### 📱 Responsividade

```
Desktop (1920px): 
- Grid 4 salas por linha
- Painel de detalhes lado a lado

Tablet (768px):
- Grid 2 salas por linha
- Painel abaixo do grid

Mobile (375px):
- Grid 1 sala por linha
- Painel em modal fullscreen
```

---

## 🎯 Exemplos de Uso

### Cenário 1: Paciente Chegou no Horário

```
Sala 1 - José Carlos
Hora Prevista: 08:00

Registrar:
- Transporte Início: 07:55
- Transporte Fim: 08:00 ← Sistema não detecta atraso
- Status: OK
```

### Cenário 2: Paciente Atrasou

```
Sala 1 - José Carlos
Hora Prevista: 08:00

Registrar:
- Transporte Início: 07:55
- Transporte Fim: 08:30 ← Sistema detecta atraso de 30 min

Popup aparece: "Justificar Atraso"
Selecionar: "Atraso no transporte"
Status muda para: EM ATRASO (30 min)
```

### Cenário 3: Registos Parciais

```
Sala 1 - José Carlos

Registrar apenas:
- Transporte Início: 07:55
- Transporte Fim: 08:00

Demais campos não preenchidos:
- Cirurgia Início: 00:00
- Cirurgia Fim: 00:00
- Anestesia Início: 00:00
- etc...

Sistema permite: SIM
Aviso: "Campos não preenchidos assumem 00h00"
```

---

## 🔧 Tecnologia

### Backend
```
✅ Endpoints: GET /api/rooms, PATCH /api/rooms/:id
✅ Salva tempos no banco
✅ Valida horários
✅ Calcula atrasos
```

### Frontend
```
✅ SetupSala.tsx (400+ linhas)
✅ Cálculo de atrasos em tempo real
✅ Popup de justificativa
✅ Validação de campos
✅ Responsivo (mobile/tablet/desktop)
```

---

## 📊 Menu Atualizado

O menu agora inclui:

```
📊 Dashboard ........... Para ver visão geral
🏥 Salas Cirúrgicas .... Para listar salas (em dev)
⏱️  SETUP SALA ........... ⭐ NOVO - Para tempos e movimentos
📋 Cadastros .......... Para status (Admin)
👥 Usuários ........... Para usuários (Admin)
📈 Relatórios ......... Para relatórios (Admin)
```

**Nota:** Setup Sala aparece para Usuário e Admin

---

## ✨ Novidades nesta Sprint

| Feature | Status | Notas |
|---------|--------|-------|
| Setup Sala | ✅ NOVO | Tempos e movimentos completo |
| UsersCRUD | ✅ ATUALIZADO | Novos campos (COREN, Departamento) |
| Menu atualizado | ✅ NOVO | Inclui Setup Sala |
| Detecção de atrasos | ✅ NOVO | Automática em tempo real |
| Justificativa de atraso | ✅ NOVO | Popup com motivos predefinidos |
| Cálculo de tempos | ✅ NOVO | Validação e cálculo automático |

---

## 🎓 Checklist de Testes

- [ ] Cadastrar novo usuário com todos os campos
- [ ] Criar usuário com Departamento "Enfermagem"
- [ ] Testar Perfil "Usuário" (acesso restrito)
- [ ] Acessar Setup Sala
- [ ] Preencher tempos de uma sala
- [ ] Forçar atraso (tempo > hora prevista)
- [ ] Verificar popup de justificativa
- [ ] Salvar alterações
- [ ] Verificar status cor (verde/vermelho/azul)
- [ ] Testar responsividade (mobile/tablet/desktop)
- [ ] Verificar se dados são salvos

---

## 📞 Suporte

Dúvidas sobre:
- **Setup Sala:** Ver exemplos acima
- **Cadastro de Usuários:** Novo campo COREN é opcional
- **Perfis:** Usuário tem acesso restrito (apenas Dashboard + Setup)
- **Atrasos:** Automático se transportEnd > horaPrevista

---

**Status: 🟢 PRONTO PARA USAR**

Ambas as funcionalidades estão integradas e prontas para testes!

