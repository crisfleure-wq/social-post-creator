# social_post_creator — Plugin Claude Code

> Plugin Fable 5 Code pessoal para criar posts Instagram (carrossel, estático, stories) multi-cliente.
> Roda de qualquer projeto/diretório via `/social-post-creator:carrossel`, `/social-post-creator:estatico`, etc.

## Stack

- **Plugin:** Claude Code com manifest `.claude-plugin/plugin.json`
- **Pipeline:** 4 subagents (news-scout, carousel-writer, image-prompt-writer, caption-writer)
- **Skills:** 7 orquestradores em `skills/`
- **Renderer carrossel:** Node 20 + Puppeteer (HTML/CSS → PNG 1080×1440)
- **Renderer single:** Node 20 + provider chain (PNG 1080×1440 feed ou 1080×1920 stories)
- **Validação:** Zod schema (`scripts/render.mjs`, `scripts/render-image.mjs`)
- **Instalação:** symlink em `~/.claude/skills/social-post-creator` ou `--plugin-dir`

## Como usar

### Instalação (uma única vez)

```bash
# Option 1: Symlink (recomendado — atualizações automáticas)
ln -s /c/Dev/social-post-creator ~/.claude/skills/social-post-creator
npm install  # na pasta do plugin

# Option 2: Durante desenvolvimento
claude --plugin-dir c:/Dev/social-post-creator
```

### Geração — de qualquer projeto

```bash
# Carrossel (5-10 slides)
/social-post-creator:carrossel <cliente> <tema> [N slides]

# Post estático (1080×1440)
/social-post-creator:estatico <cliente> <tema>

# Stories (1080×1920)
/social-post-creator:stories <cliente> <tema> [N slides]

# Capa de Reels (1080×1920)
/social-post-creator:reels-cover <cliente> <tema>

# Novo cliente
/social-post-creator:novo-cliente <slug> <nome> <@handle>

# Legado (sem cliente específico)
/social-post-creator:criar-post <tema> [--formato=carrossel|single] [--size=1x1|9x16]
```

### CLI helpers (usados internamente pelos skills)

```bash
spc-load-client <cliente> <formato>      # carrega config
spc-resolve-output <cliente> <tema> <formato>  # resolve slug + versão
spc render.mjs <dir> --client=<slug>        # renderiza carrossel
spc render-image.mjs <dir> --client=<slug>  # renderiza estático
```

## Convenções

- **Branches:** `feat/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Hashtags na legenda:** **MÁXIMO 5** (regra dura — render falha se ultrapassar)
- **Idioma do conteúdo:** PT-BR

## Estrutura

```
.claude-plugin/
  plugin.json                  # manifest do plugin
agents/                        # 4 subagents do pipeline
  news-scout.md                # WebSearch + WebFetch → research.json
  carousel-writer.md           # research.json → slides.json (carrossel/stories)
  image-prompt-writer.md       # research.json → image-prompt.json (estatico/reels-cover)
  caption-writer.md            # → caption.txt (≤5 hashtags)
skills/                        # 7 orquestradores (slash commands do plugin)
  carrossel/SKILL.md           # carrossel multi-cliente
  estatico/SKILL.md            # post estático multi-cliente
  stories/SKILL.md             # stories multi-cliente
  reels-cover/SKILL.md         # capa de reels
  novo-cliente/SKILL.md        # cadastro de novo cliente
  criar-post/SKILL.md          # legado (sem multi-cliente)
  hacker-carousel/             # design system carrossel (tokens + templates)
bin/                           # CLI wrappers (adicionados ao PATH pelo plugin)
  spc                          # router de scripts
  spc-load-client              # carrega config do cliente
  spc-resolve-output           # resolve slug + versão
clients/<slug>/                 # config + design system por cliente
  client.json                  # identidade, voz, research config, formatos
  design/                      # DESIGN.md, tokens.css, templates/
  briefing.md                  # tom e diretrizes
public/claude-code-icon.png    # mascote (branding)
scripts/
  render.mjs                   # Puppeteer renderer carrossel (Zod-validated)
  render-image.mjs             # Provider-chain renderer estático (Zod-validated)
  lib/slug.mjs                 # slug + version helpers
  lib/client-loader.mjs        # carrega config do cliente
  lib/image-providers.mjs      # provider chain (Pollinations → Together → Google AI → OpenAI)
images/<cliente>/carrossel/<slug>/v<N>/  # outputs carrossel (gitignored)
  research.json
  slides.json
  caption.txt
  html/slide_NN.html           # debug-friendly
  slides/slide_NN.png          # output final 1080×1440
  meta.json
images/<cliente>/estatico/<slug>/v<N>/   # outputs estático (gitignored)
  research.json
  image-prompt.json
  caption.txt
  post.png                     # output final 1080×1440
  meta.json
images/<cliente>/stories/<slug>/v<N>/    # outputs stories (gitignored)
  slides/slide_NN.png          # output final 1080×1920
```

## V2 — post estático (provider chain)

**Implementado.** Comandos: `/estatico <cliente> <tema>` e `/reels-cover <cliente> <tema>`.

- Reusa `news-scout`.
- `image-prompt-writer` destila a notícia em prompt visual (inglês, denso, baseado no
  design system do cliente) + headline curta PT-BR.
- `caption-writer` gera a legenda PT-BR (mesma regra de ≤5 hashtags).
- `render-image.mjs` tenta provider chain (Pollinations → Together → Google AI → OpenAI)
  com fallback automático. Se todos falharem, gera `prompt-ready.md`.
- Output final é **1080×1440** (feed 3:4) ou **1080×1920** (stories/reels 9:16).
  O renderer converte internamente de 1024×1024/1024×1536 para essas dimensões.

## Quando pedir ajuda

- Para revisão: invoque a skill `code-review-b2`.
- Para auditoria de segurança: invoque a skill `security-check`.
- Para conteúdo/design dos slides: a skill `hacker-carousel` define o sistema.
- No fim de uma task/sessão: a skill `update-docs` roda o checklist de atualização
  de doc. O hook `stop-docs-reminder.sh` aciona automaticamente quando há edits
  relevantes — não pule.

## O que NÃO fazer

- Não criar `.env*` — use env do shell ou secret manager.
- Não commitar PNGs de `images/carrossel/` (já no `.gitignore`).
- Não pular subagents do pipeline — cada um produz um artefato consumido pelo próximo.
- Mais de 5 hashtags na caption faz `render.mjs` falhar — propositalmente.
