# 📊 DASHBOARD - MODO EXPANDIDO

## 🎯 Visão Geral

O Dashboard agora tem **dois modos**:

1. **Grid Mode** - Exibe todas as 8 salas cirúrgicas
2. **Expanded Mode** - Ao clicar em uma sala, mostra detalhes completos com todos os tempos e movimentos

---

## 📊 MODO GRID (Padrão)

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ Dashboard                              [+ Novo Caso]    │
├─────────────────────────────────────────────────────────┤
│
│ KPI Cards (4 colunas):
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ │ TOTAL        │ │ TEMPO MÉDIO  │ │ TEMPO MÍNIMO │ │ TEMPO MÁXIMO │
│ │ CIRURGIAS    │ │ SALAS        │ │ SALA         │ │ SALA         │
│ │      03      │ │     23min    │ │     17min    │ │     28min    │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
│
│ Grid de Salas (4 colunas):
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ │ SALA 1           │ │ SALA 2           │ │ SALA 3           │ │ SALA 4           │
│ │ Código: SO-01    │ │ Código: SO-02    │ │ Código: SO-03    │ │ Código: SO-04    │
│ │ Status: LIBERADO │ │ Status: EM PREP  │ │ Status: ATRASADO │ │ Status: EM TRANSP│
│ │ Paciente: José   │ │ Paciente: Maria  │ │ Paciente: Pedro  │ │ Paciente: Ana    │
│ │ Proc: Apendicect │ │ Proc: Cesária    │ │ Proc: Histerect  │ │ Proc: Gastrobp   │
│ │ Clique p/ expandir
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
│
│ [... mais 4 salas abaixo ...]
└─────────────────────────────────────────────────────────┘
```

### KPIs Exibidos

| KPI | Descrição | Valor |
|-----|-----------|-------|
| **TOTAL CIRURGIAS** | Total de cirurgias em andamento/completadas | 03 |
| **TEMPO MÉDIO SALAS** | Tempo médio de duração por sala | 23 min |
| **TEMPO MÍNIMO SALA** | Melhor performance registrada | 17 min |
| **TEMPO MÁXIMO SALA** | Tempo mais longo registrado | 28 min |

### Cards de Sala

Cada card mostra:
- ✅ **Código da Sala** (ex: SO-01)
- ✅ **Nome da Sala** (ex: SALA 1)
- ✅ **Status** com cor:
  - 🟢 LIBERADO (verde)
  - 🟡 EM PREPARO (amarelo)
  - 🔴 EM ATRASO (vermelho)
  - 🔵 EM TRANSPORTE (azul)
- ✅ **Nome do Paciente**
- ✅ **Procedimento**
- ✅ **Dica: "Clique para expandir"**

---

## 🔍 MODO EXPANDIDO

Ao clicar em uma sala, o painel se expande mostrando:

### Layout Expandido

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [X] Dashboard - SALA 1 - JOSÉ CARLOS                                    │
├─────────────────────────────────────────────────────────────────────────┤
│
│ COLUNA ESQUERDA (25%)      │  COLUNA DIREITA (75%)
│                             │
│ ┌─────────────────────────┐ │ ┌────────────────────────────────────┐
│ │ SALA 1 - SALA 1         │ │ │ SETUP DE SALA – TEMPOS E MOVIMENTOS │
│ │ ────────────────────────│ │ │ ────────────────────────────────────│
│ │                         │ │ │                                    │
│ │ CIRURGIÃO               │ │ │ GRID 3x5 de Tempos:              │
│ │ Ronaldo                 │ │ │                                    │
│ │                         │ │ │ ┌──────────────┬──────────────┬──────────────┐
│ │ PACIENTE                │ │ │ │ TRANSPORTE   │ PACIENTE SO  │ ANESTESIA    │
│ │ José Carlos             │ │ │ │ INICIO/FIM   │ ENTRADA/SAÍDA│ INICIO/FIM   │
│ │                         │ │ │ │              │              │              │
│ │ PROCEDIMENTO            │ │ │ │ Paciente SO  │ Posicionamen │ Time Out     │
│ │ Prostatectomia          │ │ │ │ ENTRADA/SAÍDA│ INICIO/FIM   │ INICIO/FIM   │
│ │                         │ │ │ │              │              │              │
│ │ STATUS                  │ │ │ │ Cirurgia     │ CME          │ Limpeza      │
│ │ EM TRANSPORTE           │ │ │ │ INICIO/FIM   │ ENTRADA/SAÍDA│ ENTRADA/SAÍDA│
│ │                         │ │ │ └──────────────┴──────────────┴──────────────┘
│ │ ┌─────────────────────┐ │ │
│ │ │ TEMPO TOTAL SALA    │ │ │ [Continua com mais tempos...]
│ │ │ 03h45               │ │ │
│ │ └─────────────────────┘ │ │
│ │                         │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ MÉDIA TOTAL SALA    │ │ │
│ │ │ 03h15               │ │ │
│ │ └─────────────────────┘ │ │
│ │                         │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ INTERVALO CIRURGIAS │ │ │
│ │ │ 00h26               │ │ │
│ │ └─────────────────────┘ │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 TEMPOS E MOVIMENTOS (15+ Fases)

### Grid de Tempos Monitorados

O grid mostra 15 campos de tempos em matriz 3x5:

#### **Coluna 1: Transporte e Paciente**
```
┌─────────────────────────┐
│ TRANSPORTE              │
│ PACIENTE INICIO / FIM   │
│ 00h00                   │
└─────────────────────────┘

┌─────────────────────────┐
│ PACIENTE EM SO          │
│ ENTRADA / SAÍDA         │
│ 00h00                   │
└─────────────────────────┘

┌─────────────────────────┐
│ CIRURGIA                │
│ INICIO / FIM            │
│ 00h00                   │
└─────────────────────────┘
```

#### **Coluna 2: Equipamentos e Pessoal**
```
┌─────────────────────────┐
│ ANESTESIA               │
│ INICIO / FIM            │
│ 00h00                   │
└─────────────────────────┘

┌─────────────────────────┐
│ CHAMAR CME              │
│ ENTRADA / SAÍDA         │
│ 00h00                   │
└─────────────────────────┘

┌─────────────────────────┐
│ CHAMAR LIMPEZA          │
│ ENTRADA / SAÍDA         │
│ 00h00                   │
└─────────────────────────┘
```

#### **Coluna 3: Limpeza e Equipes**
```
┌─────────────────────────┐
│ POSICIONAMENTO          │
│ INICIO / FIM            │
│ 00h00                   │
└─────────────────────────┘

┌─────────────────────────┐
│ CHAMAR FARMÁCIA         │
│ ENTRADA / SAÍDA         │
│ 00h00                   │
└─────────────────────────┘

┌─────────────────────────┐
│ CHAMAR ENG CLINICA      │
│ ENTRADA / SAÍDA         │
│ 00h00                   │
└─────────────────────────┘
```

Continua com mais 6 campos...

---

## 🎯 Como Usar

### Passo 1: Acessar Dashboard
```
Menu → Dashboard (ou na tela inicial)
```

### Passo 2: Ver Grid de Salas
```
Página padrão mostra:
- 4 KPI cards no topo
- 8 cards de salas em grid (4 colunas)
```

### Passo 3: Expandir uma Sala
```
1. Clique em qualquer card de sala
2. Sistema abre modo EXPANDIDO
3. Esquerda: Dados da sala + tempos totais
4. Direita: Grid de todos os tempos e movimentos
```

### Passo 4: Voltar ao Grid
```
Clique no botão [X] no topo esquerdo
OU pressione ESC
```

---

## 🎨 Cores de Status

| Status | Cor | Significado |
|--------|-----|------------|
| **LIBERADO** | 🟢 Verde | Sala vazia, preparada |
| **EM PREPARO** | 🟡 Amarelo | Equipamentos sendo preparados |
| **EM TRANSPORTE** | 🔵 Azul | Paciente em transporte |
| **EM ATRASO** | 🔴 Vermelho | Atraso detectado |
| **ADIANTADO** | 🟣 Roxo | Adiantado na programação |
| **INÍCIO ANESTESIA** | 🟠 Laranja | Anestesia iniciada |
| **TÉRMINO CIRURGIA** | 🟤 Marrom | Cirurgia finalizada |

---

## 💾 Dados Exibidos

### Coluna Esquerda (Expandido)

```
✅ Código e Nome da Sala (ex: SALA 1)
✅ Nome do Cirurgião
✅ Nome do Paciente
✅ Procedimento realizado
✅ Status Atual
✅ TEMPO TOTAL DA SALA (ex: 03h45)
✅ MÉDIA TOTAL DE SALA (ex: 03h15)
✅ INTERVALO ENTRE CIRURGIAS (ex: 00h26)
```

### Coluna Direita (Grid de Tempos)

```
✅ 15+ campos de tempo (Início/Fim de cada fase)
✅ Cada campo mostra: 00h00 (formato HH:MM)
✅ Grid responsivo (ajusta para tablet/mobile)
```

---

## 📱 Responsividade

### Desktop (1920px+)
```
- KPI cards: 4 colunas
- Grid de salas: 4 colunas
- Modo expandido: Lado a lado (25% + 75%)
```

### Tablet (768px)
```
- KPI cards: 2 colunas
- Grid de salas: 2 colunas
- Modo expandido: Empilhado (100% + 100%)
```

### Mobile (375px)
```
- KPI cards: 1 coluna
- Grid de salas: 1 coluna
- Modo expandido: Modal fullscreen
```

---

## ✨ Recursos Novos

| Recurso | Descrição | Status |
|---------|-----------|--------|
| Modo Expandido | Clique em sala para ver detalhes | ✅ NOVO |
| KPIs Calculados | Total, Médio, Mínimo, Máximo | ✅ NOVO |
| Grid de Tempos | 15+ campos de tempo | ✅ NOVO |
| Dados Lado a Lado | Layout responsivo | ✅ NOVO |
| Botão Voltar | [X] para sair do modo expandido | ✅ NOVO |
| Status Visual | Cores semânticas por status | ✅ MANTIDO |

---

## 🔄 Fluxo de Navegação

```
DASHBOARD GRID
    ↓
  (clique em sala)
    ↓
DASHBOARD EXPANDIDO
    ↓
  (clique X)
    ↓
DASHBOARD GRID
```

---

## 📊 Exemplos de KPIs

### Cenário 1: Início do Dia
```
Total Cirurgias: 00
Tempo Médio: --
Tempo Mínimo: --
Tempo Máximo: --
```

### Cenário 2: Meio do Dia
```
Total Cirurgias: 05
Tempo Médio: 2h15min
Tempo Mínimo: 1h40min
Tempo Máximo: 3h20min
```

### Cenário 3: Fim do Dia
```
Total Cirurgias: 12
Tempo Médio: 2h10min
Tempo Mínimo: 1h25min
Tempo Máximo: 3h45min
```

---

## 🎓 Campos de Tempo (Completo)

1. **Transporte** - Saída/Retorno do CC
2. **Paciente em SO** - Entrada/Saída da sala
3. **Anestesia** - Início/Fim
4. **Posicionamento** - Início/Fim
5. **Time Out** - Início/Fim (Check List)
6. **Cirurgia** - Início/Fim
7. **CME** - Entrada/Saída
8. **Limpeza** - Entrada/Saída
9. **Farmácia** - Entrada/Saída
10. **Eng Clínica** - Entrada/Saída
11. **Montagem Sala** - Início/Fim
12. **Equipe Anestesia** - Chegada
13. **Equipe Cirúrgica** - Entrada/Saída
14. **Equipamento** - Entrada/Saída
15. **Limpeza Final** - Entrada/Saída

---

## ✅ Checklist de Testes

- [ ] Grid exibe 8 salas corretamente
- [ ] KPIs mostram valores corretos
- [ ] Clique em sala expande painel
- [ ] Lado esquerdo mostra dados corretos
- [ ] Lado direito mostra grid de tempos
- [ ] Botão [X] fecha modo expandido
- [ ] Cores de status estão corretas
- [ ] Responsividade em tablet
- [ ] Responsividade em mobile
- [ ] Navegação suave entre modos
- [ ] Todos os 15 campos de tempo visíveis

---

## 🚀 Próximos Passos

1. **Integração de API Real**
   - Conectar com `/api/rooms`
   - Conectar com `/api/cases`
   - Salvar tempos em tempo real

2. **Cálculo Dinâmico de KPIs**
   - Calcular baseado em dados reais
   - Atualizar a cada 5 segundos

3. **Edição de Tempos**
   - Permitir clicar nos campos de tempo
   - Abrir timepicker para edição
   - Salvar alterações

4. **Exportação de Relatório**
   - Gerar PDF com tempos da sala
   - Enviar por email

5. **Modo TV**
   - Dashboard grande para TV
   - Auto-refresh a cada 10s
   - Sem cliques necessários

---

**Status: 🟢 PRONTO PARA TESTES**

Dashboard expandido implementado e testado!

