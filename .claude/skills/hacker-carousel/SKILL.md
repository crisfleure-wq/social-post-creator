---
name: hacker-carousel
description: Diretrizes editoriais e de design para gerar carrosseis Instagram no tema "tech hacker" (terminal, dark, matrix). Use quando precisar montar `slides.json` ou ajustar estética dos slides 1080×1350 deste projeto. Define design tokens, tipos de slide, limites de texto e identidade visual.
allowed-tools: Read, Glob, Grep
---

# Hacker Carousel — Skill

Skill que define o **design system** e as **diretrizes editoriais** para os carrosseis gerados
pelo pipeline `/criar-post`. Os agentes `carousel-writer` e o renderer (`scripts/render.mjs`)
consomem essas regras; o resto do pipeline herda o resultado.

## Estética

Tema **dark hacker / terminal**. Inspiração: Matrix, mr. robot, terminal moderno (alacritty,
kitty), dashboards de pentest. Sempre com mascote do Claude Code (`public/claude-code-icon.png`)
no slide de capa e no slide final como branding.

## Design tokens (verdade canônica)

Ficam em `.claude/skills/hacker-carousel/tokens.css` (importados pelos templates).

| Token | Valor | Uso |
|---|---|---|
| `--bg-primary` | `#0D0208` | Fundo principal |
| `--bg-elevated` | `#141214` | Cards, terminal block |
| `--bg-card` | `#1C1A1E` | Cards levemente elevados |
| `--accent-primary` | `#00FF41` | Verde matrix — destaque principal, `titleAccent` |
| `--accent-secondary` | `#00B8FF` | Cyan — destaque secundário |
| `--accent-tertiary` | `#FF6B35` | Laranja — alerta/atenção |
| `--text-primary` | `#F0F0F0` | Texto principal |
| `--text-muted` | `#7A7A7A` | Labels, footers |
| `--font-display` | Space Grotesk 700 | Títulos |
| `--font-mono` | JetBrains Mono 500 | Terminal, labels, badges |
| `--font-body` | Inter 400/500 | Body |
| Canvas | 1080×1350 px | Aspect 4:5 |
| Padding | 80 px | Margem interna |

## Tipos de slide

Use **apenas estes 3 tipos** (compatível com `examples/content-dark-thinking-levels/carousel.json`):

### `cover`
Capa do carrossel. Sempre slide 1.
- `label` (string) — etiqueta no topo, MAIÚSCULAS, ≤ 60 chars (ex: `"EXTENDED THINKING · ADAPTIVE REASONING"`)
- `title` (string, multi-line via `\n`) — título grande, ≤ 60 chars total
- `titleAccent` (string) — substring do `title` para colorir com `--accent-primary`
- `titleSize` (number, opcional, default 144) — px
- `terminalPreview` (string, opcional) — uma linha de terminal abaixo do título
- `badges` (array, opcional) — ver §Badges abaixo

### `content`
Slide de conteúdo principal. Pode ter `body`, `terminal`, `steps`, ou combinação.
- `label` (string) — `"STEP 1 — TÍTULO DO PASSO"` ou similar
- `title` (string, multi-line) — ≤ 80 chars total
- `titleAccent` (string)
- `bodySize` (number, opcional, default 38)
- `body` (string, opcional) — parágrafo, ≤ 220 chars
- `terminal` (array, opcional) — linhas de terminal: `[{ text, type: "comment"|"command"|"arrow" }]`
  - `comment` → cinza (`--text-muted`)
  - `command` → branco (`--text-primary`)
  - `arrow` → renderiza com prefixo `→` em verde (`--accent-primary`)
- `steps` (array de strings, opcional) — bullets numerados
- `badges` (array, opcional)

### `stack`
Slide final (TL;DR + CTA). Sempre último slide.
- `label` (string) — geralmente `"TL;DR"`
- `title` (string)
- `titleAccent` (string)
- `bodySize` (number, opcional, default 36)
- `items` (array, opcional) — `[{ name, description }]`
- `terminal` (array, opcional) — uma linha de "regra de ouro"
- `badges` (array, opcional) — sempre incluir `@brunobracaioli`

## Badges

Array de até 4 badges no rodapé do slide:
```json
[
  { "text": "Opus 4.6", "color": "primary" },
  { "text": "Sonnet 4.6", "color": "secondary" },
  { "text": "@brunobracaioli", "color": "tertiary" }
]
```
- `color`: `"primary"` (verde) | `"secondary"` (cyan) | `"tertiary"` (laranja)
- `text`: ≤ 24 chars cada
- `badgeScale` no slide: opcional, multiplicador de tamanho (0.7–1.0)

## Limites editoriais (respeitar para não estourar canvas)

| Campo | Limite | Razão |
|---|---|---|
| `cover.title` | 60 chars | titleSize 144px estoura padding |
| `content.title` | 80 chars | bodySize ~38 |
| `content.body` | 220 chars | mais que isso ofusca title |
| `terminal[]` | 8 linhas | acima vira muro de texto |
| `steps[]` | 5 itens | mais que isso quebra leitura |
| `items[]` (stack) | 4 itens | mantém densidade |
| `badges[]` | 4 badges | rodapé limitado |

## Diretrizes editoriais

- **Densidade variável**: total de 5–10 slides. Decidir pela quantidade real de conceitos —
  não inflar para chegar a 10 nem comprimir para caber em 5.
- **Estrutura recomendada**: cover → 3–8 content → stack.
- **`titleAccent`** sempre presente: dá ritmo visual e ancora o olho.
- **Terminal blocks** quando o assunto for técnico (comandos, configs, código).
  Não use terminal em slides puramente conceituais.
- **PT-BR coloquial técnico**: tom dos exemplos em `examples/content-dark*/`.
  Evite jargão excessivo, mas não simplifique demais.
- **CTA no slide final**: sempre incluir badge `salve esse post` ou `compartilhe` + handle.

## Anti-padrões

- ❌ Mais de 4 badges em um slide
- ❌ `titleAccent` que não é substring exata do `title`
- ❌ Terminal com comando que não roda (deve ser real ou claramente comentário)
- ❌ Slide de conteúdo sem `titleAccent`
- ❌ Cover sem `terminalPreview` (perde a vibe hacker)
- ❌ Linguagem corporativa/genérica ("soluções inovadoras", "tecnologia de ponta")

## Templates

Cada tipo tem template HTML em `.claude/skills/hacker-carousel/templates/`:
- `cover.html`
- `content.html`
- `stack.html`

Os templates são auto-contidos (CSS inline, imagens como data URI). O renderer
substitui `{{SLIDE_JSON}}`, `{{TOKENS_CSS}}` e `{{MASCOT_DATA_URI}}` por valores reais.
Para preview standalone, gerar via `node scripts/render.mjs <dir>` e abrir
`html/slide_NN.html` no browser.
