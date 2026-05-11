# 🏥 SetupSO - Sistema de Gestão de Salas Cirúrgicas

## O Que É Este Sistema?

**SetupSO** é um aplicativo que ajuda a **organizar e acompanhar** tudo que acontece nas **salas cirúrgicas** de um hospital.

É como ter um **relógio digital inteligente** que registra:
- ⏱️ Que horas o paciente chega?
- ⏱️ Que horas começa a anestesia?
- ⏱️ Que horas começa a cirurgia?
- ⏱️ Quanto tempo de intervalo entre uma cirurgia e outra?

---

## Para Que Serve?

### Antes (Sem o Sistema) ❌
```
- Anotar tudo no papel
- Perder anotações
- Não saber quantas cirurgias fizeram hoje
- Não saber se estava atrasado ou adiantado
- Dificuldade para gerar relatórios
```

### Agora (Com o Sistema) ✅
```
- Todos os dados registrados automaticamente
- Saber em tempo real o status de cada sala
- Ver quantas cirurgias completadas
- Saber o tempo total gasto
- Gerar relatórios automáticos
- Acompanhar performance
```

---

## 🚀 Como Começar

### Passo 1: Acessar o Sistema

Abra seu navegador (Chrome, Firefox, Safari, Edge) e vá para:

```
http://localhost:3000
```

### Passo 2: Fazer Login

Na tela inicial, você verá um formulário assim:

```
┌──────────────────────────────┐
│     LOGIN - SetupSO          │
├──────────────────────────────┤
│                              │
│ 📧 Email:                    │
│ [______________________]     │
│                              │
│ 🔒 Senha:                    │
│ [______________________]     │
│                              │
│  [   ENTRAR   ]              │
│                              │
└──────────────────────────────┘
```

**Use as credenciais:**
- **Email:** admin@setupso.com
- **Senha:** admin123

---

## 📊 Tela Principal - Dashboard

Após fazer login, você verá a tela principal com:

### 1️⃣ Menu Lateral (Esquerda)

```
MENU PRINCIPAL
├── CADASTROS
├── USUÁRIOS
├── CRIAR UM CARD
├── CRIAR T_M
├── STATUS
├── DASHBOARD ⭐ (você está aqui)
├── RELATÓRIOS
└── SETUP SALA
```

---

### 2️⃣ KPIs (Números Grandes no Topo)

Você verá 4 números que mostram a saúde do seu centro cirúrgico:

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│    TOTAL     │  TEMPO MÉDIO │ TEMPO MÍNIMO │ TEMPO MÁXIMO │
│  CIRURGIAS   │    SALAS     │     SALA     │     SALA     │
│      03      │    23 min    │    17 min    │    28 min    │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**O que significa?**
- **TOTAL CIRURGIAS:** Quantas cirurgias fizemos hoje (ex: 3)
- **TEMPO MÉDIO:** Em média, quanto tempo demora cada cirurgia (ex: 23 minutos)
- **TEMPO MÍNIMO:** A mais rápida levou quanto tempo (ex: 17 minutos)
- **TEMPO MÁXIMO:** A mais lenta levou quanto tempo (ex: 28 minutos)

---

### 3️⃣ Cards de Salas

Abaixo dos números, você vê os cards de cada sala:

```
┌─────────────────────────────┐
│     SALA 1                  │
│     SO-01                   │
│ ──────────────────────────  │
│ Status: 🟢 LIBERADO         │
│                             │
│ Paciente: José Carlos       │
│ Procedimento: Prostatectomia│
│                             │
│ 👆 Clique para ver detalhes │
└─────────────────────────────┘
```

**Cores dos Status:**
- 🟢 **LIBERADO** = Sala vazia, pronta para próximo paciente
- 🟡 **EM PREPARO** = Equipamentos sendo preparados
- 🔵 **EM TRANSPORTE** = Paciente vindo para a sala
- 🔴 **EM ATRASO** = Algo atrasou
- 🟣 **EM CIRURGIA** = Cirurgia em andamento

---

## 🔍 Modo Expandido - Ver Detalhes de Uma Sala

### Clique em Qualquer Card

Quando você clica em um card de sala, a tela se expande e mostra:

```
┌─────────────────────────────────────────────────────────┐
│ [X] Dashboard - SALA 1 - JOSÉ CARLOS                    │
├─────────────────────────────────────────────────────────┤
│
│ LADO ESQUERDO          │  LADO DIREITO
│ (Dados da Sala)        │  (Todos os Tempos)
│
│ SALA 1 - SALA 1        │  SETUP DE SALA
│                        │  TEMPOS E MOVIMENTOS
│ CIRURGIÃO              │  ─────────────────────
│ Ronaldo                │
│                        │  15 campos de tempos:
│ PACIENTE               │  • Transporte início/fim
│ José Carlos            │  • Paciente entrada/saída
│                        │  • Anestesia início/fim
│ PROCEDIMENTO           │  • Posicionamento
│ Prostatectomia         │  • Time Out
│                        │  • Cirurgia início/fim
│ STATUS                 │  • CME entrada/saída
│ EM TRANSPORTE          │  • Limpeza entrada/saída
│                        │  • ... e mais 6
│ TEMPO TOTAL SALA       │
│ 03h45                  │
│                        │
│ MÉDIA TOTAL            │
│ 03h15                  │
│                        │
│ INTERVALO CIRURGIAS    │
│ 00h26                  │
└─────────────────────────────────────────────────────────┘
```

### Para Voltar ao Grid Normal
Clique no **[X]** no canto superior esquerdo

---

## ⏱️ Setup de Sala - Registrar Tempos

### Como Acessar

Clique no menu lateral → **SETUP SALA** (com ícone de relógio ⏱️)

### O Que Você Vê

Uma lista de salas e um formulário para registrar os tempos:

```
SALA 1 - JOSÉ CARLOS
├── TRANSPORTE
│   ├─ Paciente Saída: [__:__] (ex: 07:55)
│   └─ Paciente Retorno: [__:__] (ex: 08:05)
│
├── PACIENTE EM SO
│   ├─ Entrada: [__:__]
│   └─ Saída: [__:__]
│
├── ANESTESIA
│   ├─ Início: [__:__]
│   └─ Fim: [__:__]
│
├── CIRURGIA
│   ├─ Início: [__:__]
│   └─ Fim: [__:__]
│
└── E mais...
```

### Como Registrar

1. **Clique em uma sala** para selecioná-la
2. **Clique nos campos de hora** para preencher
3. **Digite a hora** (ex: 08:15)
4. **Sistema salva automaticamente**

### Se Houver Atraso

Se o paciente chegar atrasado, o sistema detecta e mostra:

```
┌──────────────────────────────┐
│  ⚠️ ATENÇÃO - ATRASO         │
│                              │
│ Cirurgia atrasou 30 minutos  │
│                              │
│ Por favor, justifique:       │
│                              │
│ ☐ Atraso no transporte       │
│ ☐ Atraso Equipe Médica       │
│ ☐ Atraso Anestesiologia      │
│ ☐ Atraso Enfermagem          │
│ ☐ Atraso Equipamento         │
│ ☐ Atraso Preparação Sala     │
│ ☐ Outro motivo               │
│                              │
│ [  Confirmar  ]              │
└──────────────────────────────┘
```

Selecione o motivo do atraso e clique **Confirmar**.

---

## 👥 Gerenciar Usuários (Para Admin)

### Como Acessar

Menu lateral → **USUÁRIOS**

### Criar Novo Usuário

1. Clique em **"Novo Usuário"** (botão verde)
2. Preencha os dados:

```
Nome Completo: ___________________
Crachá: [123456]
COREN: [123456789]
Departamento: [Enfermagem ▼]
Função: [Técnico ▼]
Email (Login): ___________________
Senha: ___________________
Perfil: [Usuário ▼]

[  Salvar  ]
```

3. Clique **Salvar**

### Campos Importantes

| Campo | O Que É | Exemplo |
|-------|---------|---------|
| **Nome Completo** | Nome da pessoa | Maria Silva Santos |
| **Crachá** | Número do cracha | 12345 |
| **COREN** | Registro de enfermeiro | 67890 |
| **Departamento** | Onde trabalha | Enfermagem |
| **Função** | O que faz | Técnico em Enfermagem |
| **Email** | Usado para login | maria@hospital.com |
| **Senha** | Senha de acesso | senha123 |
| **Perfil** | Permissões | Admin ou Usuário |

### Diferença Entre Perfis

**Usuário (Limitado)**
```
✅ Ver Dashboard
✅ Ver Salas
✅ Registrar tempos no Setup Sala
❌ Não pode criar usuários
❌ Não pode ver relatórios
❌ Não pode editar cadastros
```

**Admin (Total)**
```
✅ Ver tudo
✅ Criar usuários
✅ Editar tudo
✅ Ver relatórios
✅ Deletar dados
```

---

## 📋 Cadastros - Legenda de Status

### Como Acessar

Menu lateral → **CADASTROS**

### O Que É?

É onde você define os **status possíveis** das salas. Exemplo:

```
LIBERADO (verde) = Sala vazia
EM PREPARO (amarelo) = Preparando equipamento
EM CIRURGIA (roxo) = Cirurgia em andamento
```

### Como Criar

1. Clique **"Novo Status"** (botão verde)
2. Preencha:

```
Nome: LIBERADO
Cor: [Verde - picker de cor]
Descrição: Sala disponível para próximo caso

[  Salvar  ]
```

---

## 📊 Relatórios (Para Admin)

### Como Acessar

Menu lateral → **RELATÓRIOS**

### O Que Ver

Estatísticas do dia/semana/mês:

```
RELATÓRIO DO DIA
├── Total de Cirurgias: 12
├── Tempo Total: 24h35min
├── Tempo Médio: 2h03min
├── Sala Mais Rápida: 45 min
├── Sala Mais Lenta: 3h20min
└── Atrasos Detectados: 3
```

---

## 🎨 Cores e Ícones - Guia Rápido

### Status das Salas

| Cor | Nome | Significado |
|-----|------|------------|
| 🟢 | LIBERADO | Sala vazia, pronta |
| 🟡 | EM PREPARO | Equipamentos preparando |
| 🔵 | EM TRANSPORTE | Paciente vindo |
| 🔴 | EM ATRASO | Atrasado |
| 🟣 | ADIANTADO | Adiantado |
| 🟠 | INÍCIO ANESTESIA | Anestesia começou |
| 🟤 | TÉRMINO CIRURGIA | Cirurgia terminou |

### Menu Icons

| Ícone | Nome | O Que É |
|-------|------|---------|
| 📊 | Dashboard | Ver visão geral |
| 🏥 | Salas | Ver salas |
| ⏱️ | Setup Sala | Registrar tempos |
| 📋 | Cadastros | Gerenciar status |
| 👥 | Usuários | Gerenciar pessoas |
| 📈 | Relatórios | Ver estatísticas |

---

## ❓ Dúvidas Frequentes

### P: Esqueci a senha. Como resetar?
**R:** Peça ao administrador para criar um novo usuário ou resetar sua senha.

### P: Onde vejo os dados antigos?
**R:** No menu **RELATÓRIOS** você pode filtrar por data.

### P: Posso usar no celular?
**R:** Sim! O sistema funciona em tablets e celulares (responsivo).

### P: Os dados são salvos automaticamente?
**R:** Sim! Tudo é salvo assim que você preenche.

### P: Posso usar offline?
**R:** Sim! O sistema tem suporte para offline. Quando a internet voltar, sincroniza automaticamente.

### P: Como exportar um relatório?
**R:** Clique no botão **"Exportar PDF"** no relatório (funcionalidade em breve).

---

## 📞 Suporte e Ajuda

### Problemas Comuns

**"A página não carrega"**
- Verifique a internet
- Tente recarregar: F5 ou Ctrl+R
- Tente outro navegador

**"Não consigo fazer login"**
- Verifique se digitou corretamente
- Peça para o admin resetar sua senha
- Verifique se está na URL correta: http://localhost:3000

**"Os dados não salvam"**
- Verifique se tem internet
- Verifique se o servidor está rodando
- Tente fazer logout e login novamente

---

## 🎓 Fluxo Típico do Dia

### 08:00 - Início do Dia

1. Você faz **Login** com seu usuário
2. Vai para **Dashboard** para ver overview
3. Todas as salas começam como **LIBERADO** (verde)

### 08:30 - Preparo

1. Admin vai em **CADASTROS** e cria novo status
2. Salas mudam para **EM PREPARO** (amarelo)
3. Você acompanha cada sala

### 09:00 - Cirurgia

1. Você vai em **SETUP SALA**
2. Clica em SALA 1
3. Registra os tempos:
   - Paciente Saída: 09:00
   - Paciente Chegada: 09:15
   - Anestesia Início: 09:20
   - Cirurgia Início: 09:45
4. etc...

### 17:00 - Fim do Dia

1. Você vai em **RELATÓRIOS**
2. Vê estatísticas do dia
3. Exporta PDF para documentação

---

## 📱 Dicas e Truques

### Atalhos de Teclado

```
ESC - Fechar modal/expandido
Ctrl+S - Salvar (alguns navegadores)
F5 - Recarregar página
F12 - Abrir ferramentas (debug)
```

### Produtividade

```
✅ Use o Setup Sala como você faria anotações no papel
✅ Registre os tempos assim que acontecem (não deixe para depois)
✅ Revise os status regularmente
✅ Peça relatórios no final do mês para ajustes
```

---

## 🚀 Começar Agora

### Passo 1: Abra o Navegador
```
Chrome, Firefox, Safari ou Edge
```

### Passo 2: Vai para
```
http://localhost:3000
```

### Passo 3: Faça Login
```
Email: admin@setupso.com
Senha: admin123
```

### Passo 4: Explore!
```
Clique em Dashboard para começar
```

---

## ✅ Checklist - Primeiro Uso

- [ ] Conseguiu fazer login?
- [ ] Conseguiu ver o Dashboard?
- [ ] Clicou em um card de sala?
- [ ] Viu o modo expandido?
- [ ] Foi em Setup Sala?
- [ ] Tentou registrar um tempo?
- [ ] Foi em Usuários?
- [ ] Viu um relatório?

**Se marcou todas = Você já sabe usar! 🎉**

---

## 🎉 Parabéns!

Agora você entende o sistema SetupSO! 

Para dúvidas mais técnicas, peça ajuda ao administrador do hospital ou ao desenvolvedor do sistema.

**Bom trabalho! 💪**

---

## 📝 Informações Técnicas (Para Admin)

**Navegadores Suportados:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Requisitos:**
- Internet (mínimo 1 Mbps)
- Navegador moderno
- JavaScript habilitado

**Dados Salvos:**
- Todos os dados são salvos no servidor
- Backup automático a cada hora
- Acesso seguro com senha

---

**Versão:** 1.0  
**Última Atualização:** Maio 2026  
**Status:** ✅ Completo e Pronto para Usar

