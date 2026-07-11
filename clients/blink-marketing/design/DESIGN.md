# Blink Marketing — Design System (Social Posts)

## Estética

Clean, profissional e confiante. Navy dominante, yellow como acento cirúrgico, superfícies off-white. Sem gradientes, texturas, grain ou blobs. A marca é limpa — o impacto vem da tipografia pesada (Gotham Ultra) e do contraste navy/yellow.

## Paleta de cores

Referência: `design/tokens.css`

| Token | Hex | Uso |
|-------|-----|-----|
| `--brand-primary` | #0D3B66 | Navy — headings, superfícies dominantes (35-50%) |
| `--brand-accent` | #F4D35E | Yellow — CTAs, highlights, badges (5-15%) |
| `--brand-neutral` | #96989A | Gray — body muted, divisores |
| `--bg-canvas` | #F7F7F5 | Off-white — fundo padrão |
| `--bg-inverse` | #0D3B66 | Navy — seções âncora (CTA final) |
| `--fg-on-accent` | #0D3B66 | Navy sobre yellow |
| `--fg-on-primary` | #FFFFFF | Branco sobre navy |

## Tipografia

- **Display/Headings:** Gotham (400, 700, 900) — self-hosted em `design/fonts/`
- **Body:** Manrope (Google Fonts) — humanist sans
- **Mono:** system monospace — page labels, dados

## Formatos suportados

| Formato | Dimensão | Render mode |
|---------|----------|-------------|
| Carrossel | 1080×1440 (3:4) | Puppeteer (HTML templates) |
| Estático | 1080×1440 (3:4) | IA generativa (ChatGPT/Gemini) |
| Stories | 1080×1920 (9:16) | Puppeteer |
| Reels cover | 1080×1920 (9:16) | IA generativa (Gemini) |

## Tipos de slide (carrossel)

### Cover (slide 1)
- Eyebrow (uppercase, letter-spacing largo)
- Título impactante (Gotham Ultra, 68px)
- **Blink mark:** texto destacado com sublinhado amarelo gradiente (55%)
- Lead text opcional (22px Manrope)
- Badges: primeiro badge amarelo, demais navy
- Barra amarela vertical à esquerda
- Footer: handle + logo + page label

### Content (slides intermediários)
- Número circular amarelo (top-right)
- Eyebrow + título (50px)
- Body text OU lista numerada com step-num amarelo
- Callout box (fundo navy, texto branco, destaque amarelo)
- Footer: handle + page label

### CTA (último slide)
- Fundo invertido (navy total)
- Título branco + accent amarelo
- Botão pill amarelo com glow (`--shadow-yellow`)
- Linhas verticais amarelas translúcidas como moldura sutil
- Footer: handle em amarelo + logo branco + page label

## Limites editoriais

| Campo | Limite |
|-------|--------|
| Título | max 120 chars |
| Lead/body | max 200 chars |
| Steps | max 5 por slide |
| Badges | max 4 por slide |
| Hashtags (caption) | max 5 |
| Slides (carrossel) | 5-10, default 7 |

## Anti-padrões

- ❌ Yellow como fundo total de slide (só navy ou off-white)
- ❌ Gradientes, blurs, texturas de fundo
- ❌ Redesenhar o logo em CSS — sempre usar PNG de `assets/`
- ❌ Emoji no conteúdo visual (nunca)
- ❌ Fontes alternativas — sempre Gotham display + Manrope body
- ❌ Sombras pretas — sempre navy-tinted rgba(13, 59, 102, ...)
- ❌ Superlatives: "revolucionário", "incrível", "transformador"
- ❌ Mais de 1 exclamação por slide
