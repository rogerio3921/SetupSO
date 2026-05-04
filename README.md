# SetupSO — MVP 2

Painel offline para controle operacional do Centro Cirúrgico.  
Registra manualmente os horários e etapas do fluxo do paciente em tempo real, calcula KPIs de tempo (Tempo de SO, Transp→RPA) e mantém histórico local no navegador.

**Tecnologias:** HTML + JavaScript puro (Vanilla JS) + TailwindCSS via CDN.  
**Persistência:** `localStorage` (sem back-end, sem banco externo, 100% offline).

---

## Como rodar

### Opção 1 — VS Code Live Server (recomendado para desenvolvimento)

1. Instale a extensão **Live Server** no VS Code (`ritwickdey.LiveServer`).
2. Abra a **pasta do projeto** no VS Code (`Arquivo → Abrir Pasta...`), não apenas um arquivo.
3. Clique com o botão direito em **`index.html`** → **"Open with Live Server"**.
4. O navegador abrirá `http://127.0.0.1:5500/index.html` automaticamente.

> ⚠️ **Importante:** abra sempre a pasta do projeto, não o arquivo isolado. O Live Server precisa enxergar `index.html` e `app.js` na mesma pasta para que `<script src="./app.js"></script>` funcione.

### Opção 2 — Python (sem instalar nada extra)

```bash
# Entre na pasta do projeto
cd caminho/para/SetupSO

# Python 3
python -m http.server 8080

# Python 2 (legado)
python -m SimpleHTTPServer 8080
```

Abra `http://localhost:8080` no navegador.

### Opção 3 — npx serve (Node.js)

```bash
# Entre na pasta do projeto
cd caminho/para/SetupSO

npx serve .
```

Abra o endereço exibido no terminal (ex.: `http://localhost:3000`).

### Opção 4 — npm run serve (via package.json deste repo)

```bash
# Instale as dependências uma vez
npm install

# Inicie o servidor
npm run serve
```

Abra `http://localhost:3000` no navegador.

---

## Estrutura dos arquivos

```
SetupSO/
├── index.html      ← Entrada principal (UI completa)
├── app.js          ← Toda a lógica, regras e renderização
├── package.json    ← Scripts npm (serve)
└── README.md       ← Este arquivo
```

> O arquivo `index8.html` é uma versão anterior mantida apenas para referência histórica.

---

## Troubleshooting

### O app abre em branco ou não carrega

- Verifique o console do navegador (`F12 → Console`) por erros em vermelho.
- Confirme que `index.html` e `app.js` estão **na mesma pasta**.
- Nunca abra `index.html` diretamente com `Arquivo → Abrir` no navegador (protocolo `file://`). Use sempre um servidor local (opções acima) para evitar restrições de segurança do browser.

### Erro 404 em `app.js`

- Confirme que o servidor está servindo a **pasta do projeto**, não uma subpasta.
- No VS Code, feche e reabra a pasta correta antes de iniciar o Live Server.

### TailwindCSS não carrega (visual quebrado)

- O layout usa Tailwind via CDN (`https://cdn.tailwindcss.com`). É necessária **conexão com a internet** para carregar os estilos.
- Se estiver offline, o app funciona mas sem os estilos visuais.
- Para uso totalmente offline, baixe o arquivo CSS do Tailwind e substitua o `<script src="https://cdn.tailwindcss.com">` por um `<link>` local.

### Dados antigos / cache

- Clique em **Limpar** no canto superior direito para apagar todos os dados do `localStorage` e reiniciar.
- Ou abra o DevTools (`F12`), vá em `Application → Local Storage`, selecione a origem e delete a chave `setupso_mvp2_state_ultra_robust_20260502_1105`.

### Live Server servindo outra pasta

- Feche todas as abas do Live Server.
- No VS Code, clique em **"Stop"** na barra de status (canto inferior direito).
- Reabra clicando com o botão direito em `index.html` → **"Open with Live Server"**.

---

## Funcionalidades principais

| Aba | O que faz |
|-----|-----------|
| **Salas** | Lista as salas e permite abrir o detalhe de uma sala com os cards de etapas |
| **Dashboard (TV)** | Visão ao vivo de todas as salas com KPIs em tempo real |
| **Relatórios** | Histórico de todos os cases (ativos e finalizados) |

### KPIs calculados
- **Tempo de SO** — de "Paciente em SO (entrada)" até "Paciente em SO (saída)" (ou até agora se ainda aberto).
- **Total (Transp→RPA.in)** — de "Transporte (início)" até "RPA (entrada)" (ou até agora).

### Regras automáticas (autofechamento)
- **Admissão in** → fecha Transporte (end)
- **Paciente em SO in** → fecha Transporte (end) e Admissão (out)
- **Time out start** → fecha Posicionamento (end)
- **Cirurgia start** → fecha Time out (end)
- **Limpeza in** → pode fechar Cirurgia, Anestesia e Paciente em SO (com confirmação)
- **RPA in** → fecha todas as etapas abertas (com confirmação se houver algo aberto)
- **Montagem sala start** → fecha todas as outras etapas abertas

---

## Limitações do MVP 2

- Não há exportação de dados (CSV/PDF).
- Não há edição/correção de eventos passados.
- Não há suporte a múltiplas salas via CRUD (a sala vem pré-configurada no código).
- Sem login, autenticação ou sincronização entre dispositivos.
- Os dados ficam apenas no navegador/computador local. Limpar o cache ou trocar de dispositivo apaga tudo.
