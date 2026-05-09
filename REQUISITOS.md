# 📋 SetupSO - Requisitos Funcionais & Não-Funcionais

## 🎯 Objetivo Geral

SetupSO é um software de gestão e mapeamento de **Tempos e Movimentos** de entrada e saída de pacientes cirúrgicos. O objetivo é mapear e analisar o fluxo de entrada, transoperatório e saída do paciente cirúrgico, bem como toda a movimentação das equipes multidisciplinares.

**Propósito**: Otimizar o tempo de entrada e saída do paciente cirúrgico para **aumentar o volume de cirurgias** e consequentemente o **faturamento do bloco cirúrgico**.

---

## ✅ Funcionalidades Atuais (MVP 1 - Frontend Estático)

### 1. Painel de Salas
- Visualização de salas cirúrgicas
- Status da sala (liberada, em preparo, em uso, etc)
- Case ativo por sala
- KPIs de tempo (tempo de SO, total de transporte→RPA)
- Cartão de informações do paciente

### 2. Rastreamento de Eventos
- Entrada/Saída de equipes (anestesia, cirúrgica)
- Eventos de cirurgia (transporte, posicionamento, cirurgia, limpeza)
- Registro manual com timestamp automático
- Validações de sequência (não sair sem entrar)
- Fechamento automático de eventos (auto-closures)

### 3. Dashboard TV (Tempo Real)
- Visualização de múltiplas salas simultaneamente
- KPIs agregados (média de tempos, contagem de cases)
- Tabela ao vivo com duração em tempo real
- Filtro de casos por sala
- Atualização automática

### 4. Relatórios
- Histórico de casos (ativos e finalizados)
- Detalhes completos por case
- Duração de etapas (SO, cirurgia, anestesia, RPA)
- Identificação de atrasos
- Exportação de dados

### 5. Gerenciamento de Dados de Paciente
- Nome completo, data de nascimento, peso, altura
- Aviso cirúrgico, atendimento
- Alergias
- Procedimento cirúrgico
- Cirurgião responsável
- Horário previsto de cirurgia

---

## 🔜 Funcionalidades Planejadas (v2+)

### 📋 Módulo de Checklists Inteligentes
- Checklist cirúrgico integrado com bloqueio de progresso
- Personalização de checklists por tipo de cirurgia
- Registro simplificado por toque ou voz
- Validação cruzada com Checklist Cirurgia Segura

### 🔔 Alertas Inteligentes e Proativos
- Atraso na chegada da equipe
- Início de cirurgia sem checklist
- Tempo excessivo entre etapas
- Notificações push configuráveis por perfil
- Alertas críticos em real-time

### 📊 Análises Preditivas e KPIs Estratégicos
- Predição de tempo médio de giro (baseado em história)
- Relatórios automáticos de desempenho (diário, por especialidade)
- Identificação de gargalos (montagem, posicionamento, limpeza, entrega CME)
- Análise de produtividade por cirurgião/equipe/turno

### 📱 Versão Mobile & IoT-Ready
- Aplicação para tablet e celular (React Native)
- Pronto para integração com sensores de presença
- Suporte para RFID e QR Code
- Notificações push para eventos críticos
- Modo offline com sincronização automática

### 🔐 Auditoria e Compliance
- Registro de não conformidades com fotos/voz
- Assinatura digital de responsabilidade por etapa
- Log detalhado de operações por usuário
- Exportação de logs com assinatura
- Integração com protocolos de qualidade hospitalar

### 🤝 Integração com Sistemas Externos
- **SoftwareCME**: Rastreabilidade automática de instrumentais
- **PEP (HIS)**: Captura de dados de paciente e equipes
- **Farmácia**: Validação de disponibilidade de medicamentos
- **Engenharia Clínica**: Disponibilidade de equipamentos

### 🌱 Painel de Sustentabilidade
- Monitoramento de insumos (reutilizáveis vs descartáveis)
- Controle de tempo de uso de equipamentos
- Sugestões de otimização Lean

### 👥 Sistema de Usuários e Controle de Acesso
- Cadastro de usuários (apenas enfermagem)
- Roles: Admin (acesso total), User (acesso restrito)
- Funções: Auxiliar, Técnico, Enfermeiro
- Login/senha com autenticação segura
- Integração com dados de equipes multidisciplinares (via PEP)

### ⚙️ Módulo de Configuração
- **Legendas de Status**: Customizável com cores
- **Cards do Painel**: Escolha de campos visíveis, ordem customizável
- **Perfis de Notificação**: Por função/departamento
- **Horários de Funcionamento**: Ajuste de turnos

---

## 🏗️ Requisitos Não-Funcionais

### Performance
- Dashboard TV atualiza em tempo real (< 1s de latência)
- Suporte para múltiplas salas (N salas)
- Capacidade de 500+ events por dia
- Carregamento de página em < 2s

### Segurança
- Autenticação JWT para API
- Validação de input em frontend e backend
- Criptografia de senhas (bcrypt)
- Logs de auditoria para ações críticas
- HTTPS em produção

### Confiabilidade
- Backup automático de dados
- Modo offline para frontend
- Sincronização de dados quando reconectar
- Validações de integridade

### Usabilidade
- Interface intuitiva (enfermagem como público-alvo)
- Atalhos de teclado para ações rápidas
- Modo voz (future)
- Suporte para múltiplos idiomas (português)

### Escalabilidade
- Arquitetura em containers (Docker)
- Preparado para Kubernetes
- Database com suporte a replicação
- Cache em Redis (futuro)

---

## 📊 Campos de um Card no Painel

### Obrigatórios
1. **Número da Sala**
2. **Nome do Paciente**
3. **Status** (legenda colorida)
4. **Procedimento**
5. **Cirurgião**

### Opcionais (Configuráveis)
6. Circulante
7. Anestesiologista
8. Hora de início da cirurgia
9. Previsão de término
10. Aviso cirúrgico
11. Data de nascimento
12. Insumos em uso (CME, Farmácia, Eng. Clínica)

---

## 📊 Legendas de Status (Customizáveis)

| Status | Cor | Descrição |
|--------|-----|-----------|
| LIBERADO | Verde | Sala liberada, pronta |
| EM_PREPARO | Amarelo | Preparando para cirurgia |
| EM_TRANSPORTE | Azul | Paciente em transporte |
| EM_ATRASO | Vermelho | Atraso detectado |
| TÉRMINO_CIRURGIA | Roxo | Cirurgia finalizada |
| PACIENTE_RPA | Ciano | Paciente em RPA |
| ADIANTADO | Verde-escuro | Adiantado da programação |
| INÍCIO_CIRURGIA | Laranja | Cirurgia iniciada |
| TÉRMINO_ANESTESIA | Indigo | Anestesia finalizada |
| INÍCIO_ANESTESIA | Roxo-claro | Anestesia iniciada |

---

## 📋 Eventos Rastreados

### Equipes
1. **Equipe de Anestesia** - Entrada/Saída
2. **Equipe Cirúrgica** - Entrada/Saída

### Paciente
3. **Transporte do Paciente** - Início/Fim
4. **Admissão no CC** - Entrada/Saída
5. **Paciente em SO** - Entrada/Saída

### Procedimentos
6. **Anestesia** - Início/Fim
7. **Posicionamento** - Início/Fim
8. **Time Out** - Início/Fim
9. **Cirurgia** - Início/Fim

### Suporte
10. **CME** - Entrada/Saída
11. **Limpeza** - Entrada/Saída
12. **Farmácia** - Entrada/Saída
13. **Eng. Clínica** - Entrada/Saída
14. **RPA** - Entrada/Saída
15. **Montagem da Sala** - Início/Fim

---

## 🔄 Automações (Auto-Closures)

- Admission CC entrada → fecha transporte
- Paciente em SO entrada → fecha transporte + admission
- Time Out início → fecha posicionamento
- Cirurgia início → fecha time out
- Limpeza entrada → fecha cirurgia + anestesia + paciente em SO
- RPA entrada → fecha TODOS os eventos abertos
- Montagem sala início → fecha TODOS os eventos (exceto montagem)

---

## 🎯 Métricas Calculadas

- **Tempo de SO**: paciente_in_or.in → paciente_in_or.out
- **Tempo de Cirurgia**: surgery.start → surgery.end
- **Tempo de Anestesia**: anesthesia.start → anesthesia.end
- **Tempo de RPA**: rpa.in → rpa.out
- **Total (Transp→RPA.in)**: transport_patient.start → rpa.in
- **Total CC (Transp→RPA.out)**: transport_patient.start → rpa.out
- **Atrasos**: Comparação com horário previsto

---

## 🗂️ Estrutura de Dados (Prisma)

Vide [schema.prisma](../backend/prisma/schema.prisma)

---

## 🛠️ Roadmap

### Sprint 1 (Atual)
- ✅ Estrutura base (React + Express + MySQL + Prisma)
- ✅ API endpoints principais
- ✅ Docker setup
- [ ] Frontend inicial com lista de salas

### Sprint 2
- [ ] Autenticação JWT
- [ ] Módulo de usuários completo
- [ ] Interface de detalhes de sala
- [ ] Registrar eventos manualmente

### Sprint 3
- [ ] Dashboard TV avançado
- [ ] Relatórios PDF/Excel
- [ ] Checklists básicos
- [ ] Alertas em tempo real

### Sprint 4+
- [ ] Mobile (React Native)
- [ ] Integração PEP/CME
- [ ] Análises preditivas
- [ ] WebSockets para broadcast

---

**Versão**: 1.0  
**Data de Atualização**: 2026-05-09  
**Status**: Em Desenvolvimento
