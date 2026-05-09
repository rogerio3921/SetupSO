# 🏥 SetupSO - Sistema de Gestão de Salas Cirúrgicas

> 💡 **Para Pessoas Normais Entenderem** | Um guia visual e fácil do sistema

---

## 🎯 O Que É Este Sistema?

**SetupSO** = **Um super relógio digital inteligente para salas cirúrgicas**

🏥 Que registra TUDO que acontece numa cirurgia:
- ⏱️ Que hora o paciente chega?
- 💉 Que hora começa a anestesia?
- 🔪 Que hora começa a cirurgia?
- ⏰ Quanto tempo de intervalo entre uma e outra?
- 📊 Quanto tempo demora tudo?

---

## 📈 Antes vs Depois

### ❌ ANTES (Sem Sistema)
```
📝 Anotar tudo no papel
📝 Perder anotações
❌ Não saber quantas cirurgias fizeram
❌ Não saber tempos
❌ Difícil fazer relatórios
😫 Estresse do dia a dia
```

### ✅ AGORA (Com SetupSO)
```
💾 Dados salvos automaticamente
✅ Nada se perde
✅ Ver em tempo real quantas cirurgias
⏱️ Tempos calculados automaticamente
📊 Relatórios gerados automáticamente
😊 Dia a dia mais tranquilo
```

---

## 🚀 INÍCIO RÁPIDO - 4 CLIQUES

### 1️⃣ Abrir Navegador
```
Chrome 🌐 ou Firefox 🦊 ou Safari 🧭
```

### 2️⃣ Digitar URL
```
http://localhost:3000
```

### 3️⃣ Fazer Login
```
📧 Email: admin@setupso.com
🔒 Senha: admin123
```

### 4️⃣ Clicar "ENTRAR" ✅
```
🎉 PRONTO! Você está dentro!
```

---

## 📊 TELA PRINCIPAL - DASHBOARD

### O Que Você Vê Quando Entra?

```
╔════════════════════════════════════════════════════════════╗
║                   🏥 DASHBOARD                            ║
║════════════════════════════════════════════════════════════║
║                                                            ║
║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ ║
║  │ TOTAL    │  │ TEMPO    │  │ TEMPO    │  │ TEMPO    │ ║
║  │ CIRURGIAS│  │ MÉDIO    │  │ MÍNIMO   │  │ MÁXIMO   │ ║
║  │    03    │  │ 23 min   │  │ 17 min   │  │ 28 min   │ ║
║  └──────────┘  └──────────┘  └──────────┘  └──────────┘ ║
║                                                            ║
║  ╔════════════════════════════════════════════════════╗  ║
║  ║           🏥 SALAS CIRÚRGICAS                      ║  ║
║  ║════════════════════════════════════════════════════║  ║
║  ║                                                    ║  ║
║  ║  ┌─────────────────┐  ┌─────────────────┐        ║  ║
║  ║  │  SALA 1 - SO-01 │  │  SALA 2 - SO-02 │  ...   ║  ║
║  ║  │ Status: 🟢 OK   │  │ Status: 🟡 PREP │        ║  ║
║  ║  │ Paciente: José  │  │ Paciente: Maria │        ║  ║
║  ║  │ Prostatectomia  │  │ Cesária         │        ║  ║
║  ║  │ 👆 Clique aqui! │  │ 👆 Clique aqui! │        ║  ║
║  ║  └─────────────────┘  └─────────────────┘        ║  ║
║  ║                                                    ║  ║
║  ║  [Continue vendo mais 6 salas...]                 ║  ║
║  ╚════════════════════════════════════════════════════╝  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 🎨 CORES QUE VOCÊ VAI VER

### O Status de Cada Sala

```
🟢 LIBERADO      = Sala vazia, pronta para próximo paciente ✅
🟡 EM PREPARO    = Equipamentos sendo preparados ⚙️
🔵 EM TRANSPORTE = Paciente vindo para a sala 🚑
🔴 EM ATRASO     = Algo atrasou ⚠️
🟣 EM CIRURGIA   = Cirurgia em andamento 🔪
🟠 ANESTESIA     = Anestesia começou 💉
🟤 TERMINADO     = Cirurgia terminou ✨
```

---

## 🔍 MODO EXPANDIDO - Ver Tudo de Uma Sala

### Passo 1: Clique em um Card
```
Clique em qualquer sala para expandir
```

### Passo 2: Você Verá Isto
```
╔════════════════════════════════════════════════════════════╗
║ [X] SALA 1 - JOSÉ CARLOS                                  ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  LADO ESQUERDO (Dados)   │  LADO DIREITO (Tempos)        ║
║  ───────────────────────────────────────────────────────  ║
║                          │                                ║
║  🏥 SALA 1               │  ⏱️  SETUP DE SALA             ║
║  ───────────────────────────────────────────────────────  ║
║                          │                                ║
║  🔪 CIRURGIÃO            │  🕐 TRANSPORTE                ║
║    Ronaldo               │    Início/Fim: [__:__] 🕐     ║
║                          │                                ║
║  👤 PACIENTE             │  👤 PACIENTE EM SO            ║
║    José Carlos           │    Entrada/Saída: [__:__]     ║
║                          │                                ║
║  📋 PROCEDIMENTO         │  💉 ANESTESIA                 ║
║    Prostatectomia        │    Início/Fim: [__:__]        ║
║                          │                                ║
║  🎯 STATUS               │  🔪 CIRURGIA                  ║
║    EM TRANSPORTE ✅      │    Início/Fim: [__:__]        ║
║                          │                                ║
║  ⏰ TEMPO TOTAL SALA      │  E mais 11 campos de tempo... ║
║     03h45                │                                ║
║                          │                                ║
║  📊 MÉDIA TOTAL          │                                ║
║     03h15                │                                ║
║                          │                                ║
║  ⏳ INTERVALO            │                                ║
║     00h26                │                                ║
║                          │                                ║
╚════════════════════════════════════════════════════════════╝
```

### Passo 3: Voltar ao Grid
```
Clique no [X] no canto superior esquerdo
```

---

## ⏱️ SETUP DE SALA - Registrar Tempos

### Como Acessar
```
Menu Lateral → ⏱️ SETUP SALA
```

### O Que Você Faz

#### Passo 1️⃣: Selecione uma Sala
```
Clique em SALA 1, SALA 2, etc
```

#### Passo 2️⃣: Preencha os Tempos
```
🕐 TRANSPORTE
  Saída da Unidade: [07:55]  ← Digite a hora
  Retorno ao CC: [08:05]     ← Digite a hora

👤 PACIENTE EM SO
  Entrada em Sala: [08:10]
  Saída de Sala: [12:30]

💉 ANESTESIA
  Início: [08:15]
  Fim: [12:25]

🔪 CIRURGIA
  Início: [08:45]
  Fim: [12:20]

E mais... (15 campos no total!)
```

#### Passo 3️⃣: Sistema Salva Automaticamente
```
✅ Tudo é salvo automáticamente
✅ Não precisa clicar em "Salvar"
✅ Dados aparecem no Dashboard em tempo real
```

---

## ⚠️ E SE HOUVER ATRASO?

### O Sistema Detecta Automáticamente

Se o paciente chegar atrasado:

```
╔═══════════════════════════════════╗
║  ⚠️  ATENÇÃO - ATRASO DETECTADO  ║
╠═══════════════════════════════════╣
║                                   ║
║  Cirurgia atrasou 30 MINUTOS ⏰   ║
║                                   ║
║  Por favor, justifique o atraso:  ║
║                                   ║
║  ☐ Atraso no transporte 🚑        ║
║  ☐ Atraso Equipe Médica 👨‍⚕️       ║
║  ☐ Atraso Anestesiologia 💉       ║
║  ☐ Atraso Enfermagem 👩‍⚕️          ║
║  ☐ Atraso Equipamento ⚙️           ║
║  ☐ Atraso Preparação 🛠️            ║
║  ☐ Outro motivo ❓                ║
║                                   ║
║     [  Confirmar  ]               ║
║                                   ║
╚═══════════════════════════════════╝

Selecione o motivo e clique Confirmar!
```

---

## 👥 GERENCIAR USUÁRIOS (Para Admin)

### Como Acessar
```
Menu Lateral → 👥 USUÁRIOS
```

### Criar Novo Usuário

#### Passo 1️⃣: Clique em "Novo Usuário" 
```
Botão verde: [+ Novo Usuário]
```

#### Passo 2️⃣: Preencha o Formulário
```
📝 Nome Completo:       [Maria Silva Santos]
🏷️  Crachá:             [12345]
🔐 COREN:               [123456789]
🏥 Departamento:        [Enfermagem ▼]
👔 Função:              [Técnico ▼]
📧 Email (Login):       [maria@hospital.com]
🔒 Senha:               [maria123]
👤 Perfil:              [Usuário ▼]

[  SALVAR  ]
```

#### Passo 3️⃣: Clique Salvar ✅
```
Pronto! Novo usuário criado!
```

---

## 🔐 PERFIS - Quem Pode Fazer O Quê?

### Usuário (Limitado) 👤
```
✅ Ver Dashboard
✅ Ver Salas
✅ Registrar tempos no Setup Sala ⏱️
❌ Criar novos usuários
❌ Ver relatórios avançados
❌ Editar cadastros
```

### Admin (Tudo) 👨‍💼
```
✅ Ver Dashboard
✅ Ver Salas
✅ Registrar tempos
✅ Criar usuários 👥
✅ Editar tudo
✅ Ver relatórios 📊
✅ Deletar dados 🗑️
```

---

## 📋 CADASTROS - Criar Legenda de Status

### Como Acessar
```
Menu Lateral → 📋 CADASTROS
```

### O Que É?
```
É onde você define os STATUS possíveis
Exemplo: LIBERADO, EM PREPARO, EM CIRURGIA, etc
```

### Criar Novo Status

#### Passo 1️⃣: Clique "Novo Status"
```
Botão verde: [+ Novo Status]
```

#### Passo 2️⃣: Preencha
```
Nome:        [LIBERADO]
Cor:         [🟢 Verde]    ← Clique para escolher cor
Descrição:   [Sala disponível para próximo caso]

[  SALVAR  ]
```

#### Passo 3️⃣: Pronto!
```
✅ Status criado e disponível para usar
```

---

## 📊 RELATÓRIOS - Ver Estatísticas

### Como Acessar
```
Menu Lateral → 📈 RELATÓRIOS
```

### O Que Ver?
```
📊 RELATÓRIO DO DIA
───────────────────────────────
✅ Total de Cirurgias: 12
✅ Tempo Total: 24h35min
✅ Tempo Médio: 2h03min
✅ Sala Mais Rápida: 45 minutos ⚡
✅ Sala Mais Lenta: 3h20min 🐢
✅ Atrasos Detectados: 3 ⚠️
✅ Taxa de Eficiência: 85% 📈
```

---

## 🎮 MENU LATERAL - O Que Cada Botão Faz?

```
┌─────────────────────────────┐
│   🏥 MENU PRINCIPAL          │
├─────────────────────────────┤
│                             │
│ 📊 Dashboard          ← Ver visão geral
│    Clique para ver KPIs e todas as salas
│                             │
│ 🏥 Salas Cirúrgicas   ← Listar salas
│    Ver detalhes de cada sala
│                             │
│ ⏱️  Setup Sala         ← Registrar tempos ⭐
│    Preencher tempos e movimentos
│                             │
│ 📋 Cadastros          ← (Apenas Admin)
│    Criar status, cores, legendas
│                             │
│ 👥 Usuários           ← (Apenas Admin)
│    Criar novos usuários
│                             │
│ 📈 Relatórios         ← Ver estatísticas
│    Gráficos e resumos do dia
│                             │
└─────────────────────────────┘
```

---

## 💡 DICAS E TRUQUES

### 🏃 Produtividade Máxima
```
✅ Registre tempos ASSIM QUE acontecerem
✅ Não deixe para depois
✅ Use o Setup Sala como você usaria papel
✅ Revise os status a cada 30 minutos
✅ No final do dia, gere um relatório
```

### ⌨️ Atalhos de Teclado
```
ESC     → Fechar modal/expandido
F5      → Recarregar página
F12     → Abrir ferramentas (debug)
Ctrl+S  → Salvar (em alguns navegadores)
```

### 📱 Mobile & Tablet
```
✅ O sistema funciona em celular
✅ Interface se adapta automaticamente
✅ Todos os recursos funcionam
✅ Toque normalmente como num desktop
```

---

## ❓ DÚVIDAS FREQUENTES - Q&A

### P: Esqueci a Senha. O Que Faço?
**R:** 📞 Peça para um Admin resetar sua senha.

### P: Posso Usar no Celular?
**R:** ✅ Sim! Funciona em celular, tablet e desktop.

### P: Os Dados Salvam Automaticamente?
**R:** ✅ Sim! Tudo é salvo assim que você preenche.

### P: E Se Cair a Internet?
**R:** ✅ Tem suporte offline! Quando voltar internet, sincroniza.

### P: Como Exportar Relatório?
**R:** 📊 Clique em "Exportar PDF" (funcionalidade em breve).

### P: Posso Deletar um Usuário?
**R:** 🔐 Apenas Admin pode. Menu Usuários → clique no usuário → Deletar.

### P: A Página Não Carrega. O Que Faço?
**R:** 🔄 Tente:
- Recarregar: F5 ou Ctrl+R
- Outro navegador
- Verificar internet

### P: Onde Vejo Dados Antigos?
**R:** 📋 Menu Relatórios → Filtrar por data.

---

## 📅 FLUXO TÍPICO DO SEU DIA

### 🌅 08:00 - INÍCIO DO DIA

```
1. ✅ Abra navegador
2. ✅ Faça login
3. ✅ Vá para Dashboard
4. ✅ Todas as salas começam LIBERADO 🟢
```

### ☀️ 09:00 - PREPARO

```
1. ✅ Admin cria novo status (se necessário)
2. ✅ Salas mudam para EM PREPARO 🟡
3. ✅ Você acompanha cada sala
4. ✅ Equipamentos sendo preparados
```

### 🔪 10:00 - CIRURGIAS COMEÇAM

```
1. ✅ Vá para SETUP SALA ⏱️
2. ✅ Selecione SALA 1
3. ✅ Registre:
   - Transporte Saída: 10:00
   - Transporte Chegada: 10:15
   - Anestesia Início: 10:20
   - Cirurgia Início: 10:45
4. ✅ Continue registrando...
5. ✅ Dashboard atualiza em tempo real 📊
```

### 🌤️  14:00 - ACOMPANHAMENTO

```
1. ✅ Verifique Dashboard regularmente
2. ✅ Se houver atraso, justifique
3. ✅ Continue registrando tempos
4. ✅ Revise status das salas
```

### 🌅 17:00 - FIM DO DIA

```
1. ✅ Vá para RELATÓRIOS 📈
2. ✅ Veja estatísticas do dia
3. ✅ Total de cirurgias completadas
4. ✅ Tempos e eficiência
5. ✅ Exporte PDF (opcional)
```

---

## ✅ CHECKLIST - Primeiro Uso

```
Teste cada funcionalidade:

[ ] Conseguiu fazer login? ✅
[ ] Viu o Dashboard? ✅
[ ] Clicou em um card de sala? ✅
[ ] Viu o modo expandido? ✅
[ ] Foi em Setup Sala? ✅
[ ] Registrou um tempo? ✅
[ ] Foi em Usuários? ✅
[ ] Criou um novo usuário? ✅
[ ] Viu um relatório? ✅
[ ] Testou em celular? ✅

SE MARCOU TUDO = PARABÉNS! 🎉
Você já sabe usar SetupSO!
```

---

## 🚨 PROBLEMAS COMUNS - Soluções Rápidas

### ❌ "A página não carrega"
```
🔧 Solução:
1. Verifique internet
2. Recarregue: F5 ou Ctrl+R
3. Tente outro navegador
4. Avise ao Admin
```

### ❌ "Não consigo fazer login"
```
🔧 Solução:
1. Verifique email (admin@setupso.com)
2. Verifique senha (admin123)
3. Peça para Admin resetar
4. Verifique URL: http://localhost:3000
```

### ❌ "Os dados não salvam"
```
🔧 Solução:
1. Verifique internet
2. Peça ao Admin para reiniciar servidor
3. Faça logout e login novamente
4. Tente outro navegador
```

### ❌ "Vejo uma mensagem de erro"
```
🔧 Solução:
1. Anote a mensagem exata
2. Recarregue a página
3. Se continuar, avise ao Admin
4. Mande screenshot do erro
```

---

## 📱 DISPOSITIVOS SUPORTADOS

### Navegadores ✅
```
✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
✅ Opera
```

### Dispositivos ✅
```
✅ Computador Desktop
✅ Notebook/Laptop
✅ Tablet (iPad, Android)
✅ Celular (iPhone, Android)
✅ Smart TV (com navegador)
```

---

## 🔒 SEGURANÇA - Seus Dados

```
🔐 Protegido com senha
🔐 Criptografia de dados
🔐 Backup automático por hora
🔐 Apenas pessoas autorizadas acessam
🔐 Dados salvos no servidor seguro
```

---

## 🎓 APRENDA MAIS

### Documentação Técnica
```
📚 README_TECNICO.md - Para desenvolvedores
📚 DASHBOARD_EXPANDIDO.md - Dashboard detalhado
📚 NOVAS_FUNCIONALIDADES.md - Features novo
```

### Suporte
```
📞 Fale com o Admin do Hospital
📞 Contacte o Desenvolvedor
📞 Email: suporte@setupso.com (em breve)
```

---

## 🎉 PARABÉNS!

Agora você entende completamente o **SetupSO**!

```
╔════════════════════════════════════════════╗
║                                            ║
║  Você está pronto para usar o sistema! 🚀 ║
║                                            ║
║        Bom trabalho e boa sorte! 💪       ║
║                                            ║
║  SetupSO versão 1.0 - Maio 2026 ✨       ║
║                                            ║
╚════════════════════════════════════════════╝
```

---

**Made with ❤️ para o melhor Centro Cirúrgico possível**

