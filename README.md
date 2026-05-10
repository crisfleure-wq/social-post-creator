# social_post_creator

Pipeline multi-agente para criar posts Instagram **a partir de um tema/notícia**, com
estética **tech / hacker / matrix**. Dois formatos:

- **Carrossel** (default): 5–10 slides 1080×1350 renderizados via Puppeteer (HTML/CSS → PNG).
- **Single**: 1 imagem 1024×1024 ou 1024×1536 gerada via OpenAI `gpt-image-1`.

Tudo orquestrado por `/criar-post`, um slash command que invoca subagents do Claude Code
em sequência: pesquisa de notícia → estrutura do conteúdo → legenda → render.

---

## Arquitetura

```
/criar-post <tema> [--formato=carrossel|single] [--size=1x1|9x16]
   │
   ├─▶ news-scout            (WebSearch + WebFetch → research.json)
   │
   ├─▶ carousel-writer       (research.json → slides.json)        [se carrossel]
   │   ou
   │   image-prompt-writer   (research.json → image-prompt.json)  [se single]
   │
   ├─▶ caption-writer        (→ caption.txt, ≤5 hashtags PT-BR)
   │
   └─▶ renderer
       ├─ scripts/render.mjs           (Puppeteer 1080×1350)        [carrossel]
       └─ scripts/render-single.mjs    (OpenAI gpt-image-1)         [single]
```

**Output:** `images/<formato>/<slug>/v<N>/` (auto-versionado, gitignored).

---

## Pré-requisitos

- **Node 20.6+** (precisa de `--env-file` nativo) ou Node 22+
- **Claude Code CLI** instalado e autenticado
- **Conexão**: WebSearch e WebFetch (carrossel + single) e OpenAI Images API (só single)
- **WSL2 / Linux / macOS** (Puppeteer baixa Chromium próprio, ~150MB)

---

## Setup

```bash
# Instala deps (puppeteer + zod + Chromium)
npm install

# Cria .env com a chave da OpenAI (apenas se for usar formato=single)
echo 'OPENAI_API_KEY=sk-...' > .env
```

`.env` está no `.gitignore`. Não commite.

---

## Uso

Dentro de uma sessão Claude Code, na raiz do projeto:

```bash
# Carrossel (default)
/criar-post vazamento de código fonte da Anthropic
/criar-post ataque ransomware MGM 2025 --formato=carrossel

# Imagem única (1:1, 1024×1024)
/criar-post bug do Cursor que apagou repositórios --formato=single

# Imagem única ~9:16 (1024×1536, IG faz crop/letterbox no upload)
/criar-post Claude 4.7 lançamento --formato=single --size=9x16
```

O orquestrador comunica em cada etapa:

```
Slug: bug-do-cursor-que-apagou-repositorios · Versão: v1 · Formato: single
Notícia: "Cursor users report repos vanishing after agent run" (score 8.7)
Image prompt: "REPOSITÓRIOS DESAPARECERAM" (size 1024x1024, quality high)
Legenda: 4 hashtag(s)
✓ /criar-post pronto (single)
  Imagem    : images/single/bug-do-cursor-que-apagou-repositorios/v1/post.png
  Headline  : REPOSITÓRIOS DESAPARECERAM
  Legenda   : images/single/bug-do-cursor-que-apagou-repositorios/v1/caption.txt (4 hashtags)
  Fonte     : https://...
```

**Idempotência:** rodar `/criar-post` com o mesmo tema duas vezes cria `v1/`, depois `v2/`,
sem sobrescrever.

---

## Renderers standalone

Útil pra regenerar PNG sem refazer pesquisa/escrita, ou pra smoke test:

```bash
# Carrossel — re-renderiza com base em slides.json existente
node scripts/render.mjs images/carrossel/<slug>/v<N>

# Single — rechama OpenAI com base em image-prompt.json existente
node --env-file=.env scripts/render-single.mjs images/single/<slug>/v<N>
```

Ambos validam os JSONs com Zod e abortam early se algo estiver inválido (incluindo
**>5 hashtags** na `caption.txt` — regra dura).

---

## Convenções

- **Idioma do conteúdo:** PT-BR (legendas, slides). Prompts pra `gpt-image-1` em inglês
  (modelo performa melhor) com headline em PT-BR ALL CAPS rendered na imagem.
- **Hashtags:** **MÁXIMO 5** por legenda. Render falha se ultrapassar.
- **Branches:** `feat/<slug>`, `fix/<slug>`, `chore/<slug>` (ver `~/.claude/rules/git-workflow.md`).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
- **Handle:** `@brunobracaioli` aparece em toda legenda.

---

## Estrutura do repositório

```
.claude/
  agents/                              # subagents do pipeline
    news-scout.md                      # WebSearch + WebFetch → research.json
    carousel-writer.md                 # research.json → slides.json (carrossel)
    image-prompt-writer.md             # research.json → image-prompt.json (single)
    caption-writer.md                  # → caption.txt (≤5 hashtags)
  commands/
    criar-post.md                      # orquestrador (dispatcha carrossel|single)
  skills/
    hacker-carousel/                   # design system carrossel
      SKILL.md                         # tokens, tipos de slide, limites editoriais
      tokens.css                       # design tokens CSS
      templates/
        cover.html                     # slide de capa
        content.html                   # slide intermediário
        stack.html                     # slide de fechamento (TL;DR + CTA)
    code-review-b2/                    # skill de review
    security-check/                    # skill de auditoria
    update-docs/                       # checklist de atualização de docs (acionada pelo Stop hook)
  hooks/                               # pre-bash-guard, pre-commit-secrets, post-edit-format, stop-docs-reminder
  settings.json                        # permissões + hooks
public/
  claude-code-icon.png                 # mascote (branding fixo dos slides)
scripts/
  render.mjs                           # Puppeteer renderer carrossel (Zod-validated)
  render-single.mjs                    # OpenAI gpt-image-1 renderer (Zod-validated)
  lib/
    slug.mjs                           # slug + version helpers
examples/                              # 3 carrosseis de referência (renderizados à mão)
images/                                # outputs (gitignored)
  carrossel/<slug>/v<N>/
    research.json
    slides.json
    caption.txt
    html/slide_NN.html                 # HTML intermediário (debug)
    slides/slide_NN.png                # output final 1080×1350
    meta.json
  single/<slug>/v<N>/
    research.json
    image-prompt.json
    caption.txt
    post.png                           # output final 1024×1024 ou 1024×1536
    meta.json
.env                                   # OPENAI_API_KEY (gitignored)
.gitignore
CLAUDE.md                              # contexto do projeto pro Claude Code
package.json
```

---

## Schemas dos artefatos intermediários

### `research.json` (news-scout)

```json
{
  "tema": "...",
  "queries": ["..."],
  "candidates": [{ "title", "source", "url", "publishedAt", "summary",
                   "keyPoints", "viralScore", "scoreBreakdown" }],
  "chosen": { "title", "source", "url", "publishedAt", "summary", "keyPoints",
              "angle", "whyChosen", "viralScore" },
  "sources": ["url1", "url2", "url3"]
}
```

### `slides.json` (carousel-writer)

```json
{
  "theme": "...",
  "title": "...",
  "slides": [
    { "type": "cover",   "label", "title", "titleAccent", "titleSize",
                         "terminalPreview", "badges", "badgeScale" },
    { "type": "content", "label", "title", "titleAccent", "titleSize",
                         "body", "bodySize", "terminal", "items", "badges" },
    { "type": "stack",   "label", "title", "titleAccent", "items",
                         "terminal", "badges" }
  ]
}
```

5–10 slides. Validado por Zod em `scripts/render.mjs`. Ver
`.claude/skills/hacker-carousel/SKILL.md` pros limites editoriais (cover ≤60 chars,
content body ≤220 chars, terminal ≤8 linhas, etc.).

### `image-prompt.json` (image-prompt-writer)

```json
{
  "model": "gpt-image-1",
  "size": "1024x1024" | "1024x1536" | "1536x1024",
  "quality": "high",
  "headline": "VAZAMENTO EXPÕE 80GB",
  "prompt": "<prompt em inglês, denso, 150-250 palavras>",
  "scene_summary_pt": "<1 frase pra debug humano>",
  "source": { "title", "url", "publishedAt" }
}
```

### `caption.txt` (caption-writer)

Texto puro PT-BR, hook + contexto + aprofundamento + CTA + `@brunobracaioli` +
separador `.\n.\n.\n.\n.` + hashtags (≤5, lowercase, sem acento).

---

## Permissões e hooks

`.claude/settings.json` define:

- **Allow:** Read/Glob/Grep amplo, Bash restrito a comandos do pipeline (`node scripts/...`,
  `npm install`, `mkdir -p`, etc.), `WebSearch`.
- **Ask:** `WebFetch`, `git push`, `git commit`, `npm publish`.
- **Deny:** leitura/escrita de `.env*`, secrets, `*.pem`, `sudo`, `rm -rf /`.
- **Hooks:**
  - `pre-bash-guard.sh` — bloqueia comandos perigosos antes do bash rodar
  - `pre-commit-secrets.sh` — scan de segredos antes de commits
  - `post-edit-format.sh` — formata após Write/Edit (skip silencioso se eslint/prettier
    não estiverem instalados)
  - `stop-docs-reminder.sh` — no fim do turno, se houve edits relevantes, bloqueia o
    stop **uma vez por sessão** lembrando de invocar a skill `update-docs`. Silencioso
    em sessões só-leitura ou que só geraram outputs em `images/`.

---

## Limitações conhecidas

- **9:16 não é nativo no `gpt-image-1`.** A API só serve `1024x1024`, `1024x1536`,
  `1536x1024`. `--size=9x16` mapeia pra `1024x1536` (ratio 2:3). Instagram crop/letterbox
  no upload — funciona, mas não é pixel-perfect 1080×1920.
- **Puppeteer em WSL2** pode precisar de libs do sistema. Se falhar:
  `sudo apt install libnss3 libatk-bridge2.0-0 libgtk-3-0 libgbm-dev libxshmfence-dev`.
- **`gpt-image-1` custa por imagem.** `quality=high` em `1024x1024` ≈ ~$0.17/imagem
  (consulte preços atuais da OpenAI). O renderer não retry — se a API falhar, aborta
  e você decide se roda de novo.
- **News-scout depende de WebFetch.** Em sessões offline ou com `WebFetch` negado, ele
  trava. Use `--add-dir` ou rode em ambiente com rede.

---

## Troubleshooting

| Sintoma | Causa provável | Fix |
|---|---|---|
| `OPENAI_API_KEY ausente` | `.env` faltando ou flag `--env-file` não passou | Crie `.env`; rode com `node --env-file=.env scripts/render-single.mjs <dir>` |
| `caption.txt tem 6 hashtags (máx 5)` | `caption-writer` driftou | Reabra a caption manualmente ou re-invoque `caption-writer` |
| `image-prompt.json inválido` (Zod) | Subagent gerou campo fora do schema | Re-invoque `image-prompt-writer` com o erro Zod como contexto |
| Puppeteer trava no `npm install` | Falta lib do sistema (WSL/Linux) | `sudo apt install libnss3 libatk-bridge2.0-0 libgtk-3-0 libgbm-dev` |
| Slides com texto cortado | Estourou limite editorial da skill | Edite `slides.json` reduzindo o texto e rode `node scripts/render.mjs <dir>` |
| `WebSearch` ou `WebFetch` negado | Falta permission ou usuário negou no prompt | Cheque `.claude/settings.json` (`WebSearch` deve estar em `allow`, `WebFetch` em `ask` ou `allow`) |

---

## Roadmap

- [x] V1 — carrossel via Puppeteer
- [x] V2 — single-image via `gpt-image-1`
- [ ] V3 — vídeo curto (Reels) via modelo de geração de vídeo (a decidir)
- [ ] Cache de notícias (evitar refazer WebSearch pra temas idênticos no mesmo dia)
- [ ] CLI standalone (sem precisar de sessão Claude Code) — orquestração via Anthropic SDK

---

## Licença

Projeto pessoal, sem licença pública. Uso interno de `@brunobracaioli`.
