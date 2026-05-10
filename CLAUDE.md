# social_post_creator

> Pipeline multi-agente para criar posts Instagram (carrossel "tech hacker") a partir de
> tema/notícia.

## Stack

- **Pipeline:** Claude Code subagents (Markdown) + slash command `/criar-post`
- **Renderer carrossel:** Node 20 + Puppeteer (HTML/CSS → PNG 1080×1350)
- **Renderer single:** Node 20 + OpenAI `gpt-image-1` (PNG 1024×1024 ou 1024×1536)
- **Validação:** Zod schema (`scripts/render.mjs`, `scripts/render-single.mjs`)
- **Design system carrossel:** skill `hacker-carousel` (`.claude/skills/hacker-carousel/`)

## Comandos essenciais

```bash
# Setup (uma vez)
npm install                    # puppeteer + zod (baixa Chromium ~150MB)

# .env (uma vez, fora do git)
echo 'OPENAI_API_KEY=sk-...' > .env

# Geração — dentro de uma sessão Claude Code
/criar-post <tema>                                    # default: carrossel
/criar-post <tema> --formato=carrossel                # idem
/criar-post <tema> --formato=single                   # imagem 1x1 (1024×1024)
/criar-post <tema> --formato=single --size=9x16       # imagem ~9:16 (1024×1536)

# Renderers standalone
node scripts/render.mjs images/carrossel/<slug>/v<N>
node --env-file=.env scripts/render-single.mjs images/single/<slug>/v<N>
```

## Convenções

- **Branches:** `feat/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Hashtags na legenda:** **MÁXIMO 5** (regra dura — render falha se ultrapassar)
- **Idioma do conteúdo:** PT-BR

## Estrutura

```
.claude/
  agents/                      # 4 subagents do pipeline
    news-scout.md              # WebSearch + WebFetch → research.json
    carousel-writer.md         # research.json → slides.json (formato=carrossel)
    image-prompt-writer.md     # research.json → image-prompt.json (formato=single)
    caption-writer.md          # → caption.txt (≤5 hashtags)
  commands/criar-post.md       # orquestrador (dispatch carrossel|single)
  skills/hacker-carousel/      # design system carrossel (tokens + 3 templates HTML)
public/claude-code-icon.png    # mascote (branding)
scripts/
  render.mjs                   # Puppeteer renderer carrossel (Zod-validated)
  render-single.mjs            # OpenAI gpt-image-1 renderer (Zod-validated)
  lib/slug.mjs                 # slug + version helpers (carrossel|single)
images/carrossel/<slug>/v<N>/  # outputs carrossel (gitignored)
  research.json
  slides.json
  caption.txt
  html/slide_NN.html           # debug-friendly
  slides/slide_NN.png          # output final 1080×1350
  meta.json
images/single/<slug>/v<N>/     # outputs single (gitignored)
  research.json
  image-prompt.json
  caption.txt
  post.png                     # output final 1024×1024 ou 1024×1536
  meta.json
```

## V2 — single-image post (gpt-image-1)

**Implementado.** `/criar-post <tema> --formato=single [--size=1x1|9x16]`.

- Reusa `news-scout`.
- `image-prompt-writer` destila a notícia em prompt visual (inglês, denso, hacker/cyberpunk)
  + headline curta PT-BR que `gpt-image-1` renderiza na imagem.
- `caption-writer` gera a legenda PT-BR (mesma regra de ≤5 hashtags).
- `render-single.mjs` chama OpenAI Images API com `OPENAI_API_KEY` lido de `.env`
  via `node --env-file=.env`.
- `gpt-image-1` suporta nativamente apenas `1024x1024`, `1024x1536`, `1536x1024`.
  Por isso `--size=9x16` mapeia pra `1024x1536` (2:3, não exato 9:16) e o IG faz
  o letterbox/crop no upload. Documentado, não bug.

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
