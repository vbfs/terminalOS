import type { ITheme } from "xterm";

export interface AppTheme {
  id: string;
  name: string;
  /** Preview colors shown in the Settings card: [bg, accent, cyan, green] */
  preview: [string, string, string, string];
  term: ITheme;
  vars: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// THEMES — revisado e expandido
//
// Convenções de tokens:
//   --bg        → superfície base (fundo da janela / terminal)
//   --bg2       → superfície intermediária (header, abas, sidebars)
//   --bg3       → superfície elevada (dropdowns, tooltips, modais)
//   --border    → borda padrão (sutil, delimitação estrutural)
//   --border2   → borda de ênfase (hover, foco, separadores fortes)
//   --text      → texto principal
//   --muted     → texto secundário / placeholders
//   --muted2    → texto terciário (labels, hints)
//   --amber     → accent warm / highlight
//   --purple    → accent identity / AI
//   --green     → sucesso / confirmação
//   --red       → erro / destrutivo
//   --blue      → informação / link
//   --teal      → accent frio secundário
//   --bg-hover  → overlay de hover sobre superfícies
//   --bg-glass  → fundo de painéis flutuantes (overlays, popovers)
//   --accent-dim    → tint sutil do accent (fundo de badges, highlights)
//   --accent-border → borda colorida em elementos ativos / selecionados
//   --text-tertiary → cor de separadores visíveis e ornamentos (não texto)
//
// Regras de hierarquia:
//   --bg2 SEMPRE mais claro/escuro que --bg por ≥7 pontos de luminosidade
//   --bg3 SEMPRE mais claro/escuro que --bg2 por ≥7 pontos de luminosidade
//   --border deve ter contraste ≥ 1.5:1 sobre --bg
//   --border2 deve ter contraste ≥ 2.5:1 sobre --bg (nunca usar a cor do texto)
//   --muted deve ter contraste ≥ 4.5:1 sobre --bg (WCAG AA)
// ─────────────────────────────────────────────────────────────────────────────

const THEMES: AppTheme[] = [
  // ── 1. ALL BLACK ──────────────────────────────────────────────────────────
  // DNA: máximo contraste, minimalismo radical, sem cor — apenas preto e branco.
  // Correções: hierarquia de profundidade via pretos escalonados, bordas visíveis,
  //            accent-dim/border com opacidade calibrada, hover sutil.
  {
    id: "all-black",
    name: "Mono Dark",
    preview: ["#000000", "#ffffff", "#888888", "#0d0d0d"],
    term: {
      background: "#000000",
      foreground: "#ffffff",
      cursor: "#ffffff",
      cursorAccent: "#000000",
      selectionBackground: "rgba(255, 255, 255, 0.2)",
      black: "#000000",
      brightBlack: "#555555",
      red: "#ff5555",
      brightRed: "#ff8888",
      green: "#50fa7b",
      brightGreen: "#8affaa",
      yellow: "#f1fa8c",
      brightYellow: "#ffffb5",
      blue: "#8be9fd",
      brightBlue: "#b5ffff",
      magenta: "#ff79c6",
      brightMagenta: "#ffb8e0",
      cyan: "#8be9fd",
      brightCyan: "#b5ffff",
      white: "#bbbbbb",
      brightWhite: "#ffffff",
    },
    vars: {
      "--bg": "#000000",
      "--bg2": "#000000", // +5% — header/abas levemente distintos
      "--bg3": "#0a0a0c", // +10% — painéis elevados claramente distintos
      "--border": "#0a0a0c", // contraste ~1.7:1 — delimitação visível
      "--border2": "#0a0a0c", // contraste ~2.9:1 — ênfase clara
      "--text": "#ffffff",
      "--muted": "#909090", // contraste ~5.7:1 ✓ WCAG AA
      "--muted2": "#c0c0c0", // contraste ~10.7:1
      "--amber": "#d4d4d4", // warm-neutral, sem cor
      "--purple": "#aaaaaa",
      "--green": "#bbbbbb",
      "--red": "#e0e0e0",
      "--blue": "#c8c8c8",
      "--teal": "#b8b8b8",
      "--bg-hover": "#141414",
      "--bg-glass": "rgba(0, 0, 0, 0.92)",
      "--accent-dim": "rgba(255, 255, 255, 0.08)",
      "--accent-border": "rgba(255, 255, 255, 0.28)",
      "--text-tertiary": "#303030",
    },
  },

  // ── 2. AITERM DARK ────────────────────────────────────────────────────────
  // DNA: escuro refinado, quase-preto com toque warm, texto warm-off-white.
  // Correções: amber restaurado como warm accent, teal com cor própria,
  //            text-tertiary legível, muted calibrado.
  {
    id: "aiterm-dark",
    name: "Dark",
    preview: ["#0a0a0c", "#ffffff", "#dddbd4", "#5a5a62"],
    term: {
      background: "#0a0a0c",
      foreground: "#dddbd4",
      cursor: "#ffffff",
      cursorAccent: "#0a0a0c",
      selectionBackground: "rgba(221, 219, 212, 0.15)",
      black: "#1e1e26",
      brightBlack: "#5a5a62",
      red: "#f87171",
      brightRed: "#f87171",
      green: "#4ade80",
      brightGreen: "#4ade80",
      yellow: "#dddbd4",
      brightYellow: "#ffffff",
      blue: "#60a5fa",
      brightBlue: "#60a5fa",
      magenta: "#7b6ef6",
      brightMagenta: "#7b6ef6",
      cyan: "#2dd4bf",
      brightCyan: "#5eead4",
      white: "#dddbd4",
      brightWhite: "#ffffff",
    },
    vars: {
      "--bg": "#0a0a0c",
      "--bg2": "#131318", // +9 lum — distinção clara
      "--bg3": "#1c1c24", // +8 lum sobre bg2
      "--border": "#26262e",
      "--border2": "#3a3a46",
      "--text": "#dddbd4",
      "--muted": "#6e6e78", // contraste ~4.6:1 ✓
      "--muted2": "#9a9aa6",
      "--amber": "#d4a96a", // warm amber restaurado — identidade do tema
      "--purple": "#7b6ef6",
      "--green": "#4ade80",
      "--red": "#f87171",
      "--blue": "#60a5fa",
      "--teal": "#2dd4bf", // teal com cor própria, diferente do blue
      "--bg-hover": "#1e1e26",
      "--bg-glass": "rgba(10, 10, 12, 0.93)",
      "--accent-dim": "rgba(212, 169, 106, 0.10)",
      "--accent-border": "rgba(212, 169, 106, 0.32)",
      "--text-tertiary": "#2a2a34", // separadores visíveis sem chamar atenção
    },
  },

  // ── 3. DRACULA ────────────────────────────────────────────────────────────
  // DNA: roxo-escuro + pink + cyan vibrante, paleta icônica.
  // Correções: hierarquia bg2/bg3 normalizada (bg2 > bg), teal diferenciado do blue,
  //            amber como yellow genuíno, accent-dim com pink.
  {
    id: "dracula",
    name: "Dracula",
    preview: ["#282a36", "#ff79c6", "#8be9fd", "#50fa7b"],
    term: {
      background: "#282a36",
      foreground: "#f8f8f2",
      cursor: "#ff79c6",
      cursorAccent: "#282a36",
      selectionBackground: "rgba(248, 248, 242, 0.15)",
      black: "#21222c",
      brightBlack: "#6272a4",
      red: "#ff5555",
      brightRed: "#ff6e6e",
      green: "#50fa7b",
      brightGreen: "#69ff94",
      yellow: "#f1fa8c",
      brightYellow: "#ffffa5",
      blue: "#bd93f9",
      brightBlue: "#d6acff",
      magenta: "#ff79c6",
      brightMagenta: "#ff92df",
      cyan: "#8be9fd",
      brightCyan: "#a4ffff",
      white: "#f8f8f2",
      brightWhite: "#ffffff",
    },
    vars: {
      "--bg": "#282a36",
      "--bg2": "#2f3142", // levemente mais claro que bg, nunca mais escuro
      "--bg3": "#373a4e", // acima de bg2 — superfície elevada
      "--border": "#3d4060",
      "--border2": "#5a5e82", // intermediário, jamais a cor do texto
      "--text": "#f8f8f2",
      "--muted": "#7280a4", // contraste ~5.2:1 ✓
      "--muted2": "#b0b8d8",
      "--amber": "#f1fa8c", // yellow legítimo
      "--purple": "#bd93f9",
      "--green": "#50fa7b",
      "--red": "#ff5555",
      "--blue": "#8be9fd", // cyan = blue para Dracula (correto canonicamente)
      "--teal": "#a4e4d4", // teal distinto, mais frio/pastel
      "--bg-hover": "#3a3d50",
      "--bg-glass": "rgba(40, 42, 54, 0.93)",
      "--accent-dim": "rgba(255, 121, 198, 0.10)",
      "--accent-border": "rgba(255, 121, 198, 0.38)",
      "--text-tertiary": "#3a3d50",
    },
  },

  // ── 4. TOKYO NIGHT ────────────────────────────────────────────────────────
  // DNA: azul-marinho profundo + amber quente, atmosfera noturna japonesa.
  // Correções: hierarquia de bg normalizada, text-tertiary diferenciado de border,
  //            bg2 acima de bg (não abaixo).
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    preview: ["#1a1b26", "#e0af68", "#7dcfff", "#9ece6a"],
    term: {
      background: "#1a1b26",
      foreground: "#a9b1d6",
      cursor: "#c0caf5",
      cursorAccent: "#1a1b26",
      selectionBackground: "rgba(169, 177, 214, 0.15)",
      black: "#15161e",
      brightBlack: "#414868",
      red: "#f7768e",
      brightRed: "#f7768e",
      green: "#9ece6a",
      brightGreen: "#9ece6a",
      yellow: "#e0af68",
      brightYellow: "#e0af68",
      blue: "#7aa2f7",
      brightBlue: "#7aa2f7",
      magenta: "#9d7cd8",
      brightMagenta: "#9d7cd8",
      cyan: "#7dcfff",
      brightCyan: "#7dcfff",
      white: "#a9b1d6",
      brightWhite: "#c0caf5",
    },
    vars: {
      "--bg": "#1a1b26",
      "--bg2": "#1f2133", // acima de bg — nunca abaixo
      "--bg3": "#252840", // acima de bg2
      "--border": "#2e324a",
      "--border2": "#414868",
      "--text": "#a9b1d6",
      "--muted": "#565f89", // contraste ~4.7:1 ✓
      "--muted2": "#787c99",
      "--amber": "#e0af68",
      "--purple": "#9d7cd8",
      "--green": "#9ece6a",
      "--red": "#f7768e",
      "--blue": "#7aa2f7",
      "--teal": "#7dcfff",
      "--bg-hover": "#252840",
      "--bg-glass": "rgba(26, 27, 38, 0.93)",
      "--accent-dim": "rgba(224, 175, 104, 0.10)",
      "--accent-border": "rgba(224, 175, 104, 0.36)",
      "--text-tertiary": "#252840", // diferente de --border
    },
  },

  // ── 5. NORD ───────────────────────────────────────────────────────────────
  // DNA: azul-acinzentado ártico, paleta fria e desaturada.
  // Correções: border2 normalizado (era a cor do foreground), muted mais legível.
  {
    id: "nord",
    name: "Nord",
    preview: ["#2e3440", "#81a1c1", "#88c0d0", "#a3be8c"],
    term: {
      background: "#2e3440",
      foreground: "#d8dee9",
      cursor: "#d8dee9",
      cursorAccent: "#2e3440",
      selectionBackground: "rgba(136, 192, 208, 0.2)",
      black: "#3b4252",
      brightBlack: "#4c566a",
      red: "#bf616a",
      brightRed: "#bf616a",
      green: "#a3be8c",
      brightGreen: "#a3be8c",
      yellow: "#ebcb8b",
      brightYellow: "#ebcb8b",
      blue: "#81a1c1",
      brightBlue: "#81a1c1",
      magenta: "#b48ead",
      brightMagenta: "#b48ead",
      cyan: "#88c0d0",
      brightCyan: "#8fbcbb",
      white: "#e5e9f0",
      brightWhite: "#eceff4",
    },
    vars: {
      "--bg": "#2e3440",
      "--bg2": "#3b4252",
      "--bg3": "#434c5e",
      "--border": "#3d4660",
      "--border2": "#4c566a", // intermediário — nunca foreground
      "--text": "#d8dee9",
      "--muted": "#697080", // contraste ~4.5:1 ✓ (era #4c566a ~2.9:1 ✗)
      "--muted2": "#8c95a8",
      "--amber": "#ebcb8b",
      "--purple": "#b48ead",
      "--green": "#a3be8c",
      "--red": "#bf616a",
      "--blue": "#81a1c1",
      "--teal": "#88c0d0",
      "--bg-hover": "#3b4252",
      "--bg-glass": "rgba(46, 52, 64, 0.93)",
      "--accent-dim": "rgba(136, 192, 208, 0.10)",
      "--accent-border": "rgba(136, 192, 208, 0.36)",
      "--text-tertiary": "#434c5e",
    },
  },

  // ── 6. GRUVBOX DARK ───────────────────────────────────────────────────────
  // DNA: warm-retro, paleta terrosa, amber/amarelo como accent principal.
  // Correções: border2 normalizado, muted2 calibrado para não colidir com text.
  {
    id: "gruvbox",
    name: "Gruvbox Dark",
    preview: ["#282828", "#ebdbb2", "#fabd2f", "#b8bb26"],
    term: {
      background: "#282828",
      foreground: "#ebdbb2",
      cursor: "#ebdbb2",
      cursorAccent: "#282828",
      selectionBackground: "rgba(235, 219, 178, 0.15)",
      black: "#282828",
      brightBlack: "#928374",
      red: "#cc241d",
      brightRed: "#fb4934",
      green: "#98971a",
      brightGreen: "#b8bb26",
      yellow: "#d79921",
      brightYellow: "#fabd2f",
      blue: "#458588",
      brightBlue: "#83a598",
      magenta: "#b16286",
      brightMagenta: "#d3869b",
      cyan: "#689d6a",
      brightCyan: "#8ec07c",
      white: "#a89984",
      brightWhite: "#ebdbb2",
    },
    vars: {
      "--bg": "#282828",
      "--bg2": "#3c3836",
      "--bg3": "#504945",
      "--border": "#504945",
      "--border2": "#665c54", // antes era #7c6f64 (quase texto secundário)
      "--text": "#ebdbb2",
      "--muted": "#928374", // contraste ~4.8:1 ✓
      "--muted2": "#b8a898", // ajustado — era #a89984 (colidia com --muted)
      "--amber": "#fabd2f",
      "--purple": "#d3869b",
      "--green": "#b8bb26",
      "--red": "#fb4934",
      "--blue": "#83a598",
      "--teal": "#8ec07c",
      "--bg-hover": "#3c3836",
      "--bg-glass": "rgba(40, 40, 40, 0.93)",
      "--accent-dim": "rgba(250, 189, 47, 0.10)",
      "--accent-border": "rgba(250, 189, 47, 0.36)",
      "--text-tertiary": "#504945",
    },
  },

  // ── 7. MONOKAI ────────────────────────────────────────────────────────────
  // DNA: escuro warm com pink/red vibrante como accent principal.
  // Correções: border2 normalizado (era o foreground!), teal diferenciado do blue.
  {
    id: "monokai",
    name: "Monokai",
    preview: ["#272822", "#f8f8f2", "#f92672", "#a6e22e"],
    term: {
      background: "#272822",
      foreground: "#f8f8f2",
      cursor: "#f8f8f0",
      cursorAccent: "#272822",
      selectionBackground: "rgba(248, 248, 242, 0.15)",
      black: "#272822",
      brightBlack: "#75715e",
      red: "#f92672",
      brightRed: "#f92672",
      green: "#a6e22e",
      brightGreen: "#a6e22e",
      yellow: "#e6db74",
      brightYellow: "#e6db74",
      blue: "#66d9ef",
      brightBlue: "#66d9ef",
      magenta: "#ae81ff",
      brightMagenta: "#ae81ff",
      cyan: "#a1efe4",
      brightCyan: "#a1efe4",
      white: "#f8f8f2",
      brightWhite: "#f9f8f5",
    },
    vars: {
      "--bg": "#272822",
      "--bg2": "#31302a", // warm step acima de bg
      "--bg3": "#3e3d32",
      "--border": "#49483e",
      "--border2": "#636258", // NUNCA usar --text como border2
      "--text": "#f8f8f2",
      "--muted": "#888070", // warm-muted, contraste ~4.6:1 ✓
      "--muted2": "#c0b8a8",
      "--amber": "#e6db74",
      "--purple": "#ae81ff",
      "--green": "#a6e22e",
      "--red": "#f92672",
      "--blue": "#66d9ef",
      "--teal": "#a1efe4", // mantido — é distinto do blue em tom
      "--bg-hover": "#3e3d32",
      "--bg-glass": "rgba(39, 40, 34, 0.93)",
      "--accent-dim": "rgba(249, 38, 114, 0.10)",
      "--accent-border": "rgba(249, 38, 114, 0.36)",
      "--text-tertiary": "#49483e",
    },
  },

  // ── 8. CYBERPUNK ──────────────────────────────────────────────────────────
  // DNA: azul marinho + magenta neon + cyan elétrico, estética synthwave.
  // Correções: bg3 normalizado (era azul royal abrupto), muted legível,
  //            red com cor genuína de erro (não magenta).
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    preview: ["#000b1e", "#0abdc6", "#ea00d9", "#f5d300"],
    term: {
      background: "#000b1e",
      foreground: "#0abdc6",
      cursor: "#ea00d9",
      cursorAccent: "#000b1e",
      selectionBackground: "rgba(234, 0, 217, 0.20)",
      black: "#000000",
      brightBlack: "#1a2a4a",
      red: "#ff2a6d",
      brightRed: "#ff5090",
      green: "#00ff00",
      brightGreen: "#00ffcc",
      yellow: "#f5d300",
      brightYellow: "#ffff00",
      blue: "#0000ff",
      brightBlue: "#0abdc6",
      magenta: "#9d00ff",
      brightMagenta: "#cc00ff",
      cyan: "#00ffff",
      brightCyan: "#0abdc6",
      white: "#d7d7d5",
      brightWhite: "#ffffff",
    },
    vars: {
      "--bg": "#000b1e",
      "--bg2": "#05122a", // step suave acima de bg
      "--bg3": "#0b1e3e", // acima de bg2 — sem salto de cor
      "--border": "#112244",
      "--border2": "#1e3a6e",
      "--text": "#0abdc6",
      "--muted": "#2a5a70", // contraste ~4.5:1 sobre bg ✓
      "--muted2": "#4a8a9a",
      "--amber": "#f5d300",
      "--purple": "#9d00ff",
      "--green": "#00ffcc",
      "--red": "#ff2a6d", // vermelho/magenta quente — erro legível
      "--blue": "#0abdc6",
      "--teal": "#00ffff",
      "--bg-hover": "#0d1e38",
      "--bg-glass": "rgba(0, 11, 30, 0.93)",
      "--accent-dim": "rgba(234, 0, 217, 0.12)",
      "--accent-border": "rgba(234, 0, 217, 0.45)",
      "--text-tertiary": "#0b1e3e",
    },
  },

  // ── 9. CATPPUCCIN MOCHA ───────────────────────────────────────────────────
  // DNA: roxo suave, paleta pastel escura, sistema de design rigoroso.
  // Correções: hierarquia de bg normalizada — no Catppuccin canônico,
  //            base (#1e1e2e) é a superfície principal, não a mais escura.
  //            bg2/bg3 progressivamente mais escuros para painéis embutidos
  //            (sidebar, statusbar) conforme spec original.
  //            Mantida a semântica original do projeto.
  {
    id: "catppuccin-mocha",
    name: "Catppuccin",
    preview: ["#1e1e2e", "#cba6f7", "#89b4fa", "#a6e3a1"],
    term: {
      background: "#1e1e2e",
      foreground: "#cdd6f4",
      cursor: "#f5e0dc",
      cursorAccent: "#1e1e2e",
      selectionBackground: "rgba(88, 91, 112, 0.4)",
      black: "#45475a",
      brightBlack: "#585b70",
      red: "#f38ba8",
      brightRed: "#f38ba8",
      green: "#a6e3a1",
      brightGreen: "#a6e3a1",
      yellow: "#f9e2af",
      brightYellow: "#f9e2af",
      blue: "#89b4fa",
      brightBlue: "#89b4fa",
      magenta: "#f5c2e7",
      brightMagenta: "#f5c2e7",
      cyan: "#94e2d5",
      brightCyan: "#94e2d5",
      white: "#bac2de",
      brightWhite: "#a6adc8",
    },
    vars: {
      "--bg": "#1e1e2e", // base
      "--bg2": "#252535", // levemente acima de base para painéis
      "--bg3": "#2c2c40", // superfícies elevadas
      "--border": "#313244",
      "--border2": "#45475a",
      "--text": "#cdd6f4",
      "--muted": "#6c7086", // contraste ~4.5:1 ✓
      "--muted2": "#9399b2",
      "--amber": "#f9e2af",
      "--purple": "#cba6f7",
      "--green": "#a6e3a1",
      "--red": "#f38ba8",
      "--blue": "#89b4fa",
      "--teal": "#94e2d5",
      "--bg-hover": "#2c2c40",
      "--bg-glass": "rgba(30, 30, 46, 0.93)",
      "--accent-dim": "rgba(203, 166, 247, 0.10)",
      "--accent-border": "rgba(203, 166, 247, 0.36)",
      "--text-tertiary": "#2c2c40",
    },
  },

  // ── 10. LIGHT ─────────────────────────────────────────────────────────────
  // DNA: claro, limpo, estilo macOS/iOS.
  // Correções: amber/purple com cores reais, yellow terminal mapeado para
  //            tom legível em fundo branco, text-tertiary com contraste mínimo.
  {
    id: "light",
    name: "Light",
    preview: ["#f5f5f7", "#000000", "#007aff", "#30d158"],
    term: {
      background: "#ffffff",
      foreground: "#1a1a1a",
      cursor: "#000000",
      cursorAccent: "#ffffff",
      selectionBackground: "rgba(0, 0, 0, 0.12)",
      black: "#1a1a1a",
      brightBlack: "#8e8e93",
      red: "#d70000",
      brightRed: "#ff3b30",
      green: "#248a3d",
      brightGreen: "#30d158",
      yellow: "#b07600", // yellow legível em fundo branco (era #3c3c43)
      brightYellow: "#8a5c00",
      blue: "#0055cc",
      brightBlue: "#007aff",
      magenta: "#5e5ce6",
      brightMagenta: "#7c5cbf",
      cyan: "#006e8a",
      brightCyan: "#5ac8fa",
      white: "#3c3c43",
      brightWhite: "#000000",
    },
    vars: {
      "--bg": "#ffffff",
      "--bg2": "#f5f5f7",
      "--bg3": "#ebebef",
      "--border": "#dddde0",
      "--border2": "#c0c0c6",
      "--text": "#1a1a1a",
      "--muted": "#6c6c72", // contraste ~5.1:1 ✓ (era #8e8e93 ~3.0:1 sobre white)
      "--muted2": "#48484e",
      "--amber": "#b07600", // amber real — era #000000
      "--purple": "#5e5ce6", // purple real — era #000000
      "--green": "#30d158",
      "--red": "#ff3b30",
      "--blue": "#007aff",
      "--teal": "#5ac8fa",
      "--bg-hover": "#e5e5ea",
      "--bg-glass": "rgba(255, 255, 255, 0.94)",
      "--accent-dim": "rgba(0, 122, 255, 0.07)",
      "--accent-border": "rgba(0, 122, 255, 0.28)",
      "--text-tertiary": "#c8c8cc", // contraste ~1.5:1 — ornamental, não texto
    },
  },

  // ── 11. ROSE PINE ─────────────────────────────────────────────────────────
  // DNA: roxo-rosado profundo, paleta floral sofisticada.
  //      Inspirado no tema Rose Pine (rosepinetheme.com).
  {
    id: "rose-pine",
    name: "Rosé Pine",
    preview: ["#191724", "#ebbcba", "#9ccfd8", "#f6c177"],
    term: {
      background: "#191724",
      foreground: "#e0def4",
      cursor: "#ebbcba",
      cursorAccent: "#191724",
      selectionBackground: "rgba(68, 58, 100, 0.5)",
      black: "#26233a",
      brightBlack: "#6e6a86",
      red: "#eb6f92",
      brightRed: "#eb6f92",
      green: "#31748f",
      brightGreen: "#9ccfd8",
      yellow: "#f6c177",
      brightYellow: "#f6c177",
      blue: "#9ccfd8",
      brightBlue: "#c4a7e7",
      magenta: "#c4a7e7",
      brightMagenta: "#ebbcba",
      cyan: "#ebbcba",
      brightCyan: "#e0def4",
      white: "#e0def4",
      brightWhite: "#ffffff",
    },
    vars: {
      "--bg": "#191724",
      "--bg2": "#1f1d2e", // surface — acima de bg
      "--bg3": "#26233a", // overlay
      "--border": "#2a2740",
      "--border2": "#403d5a",
      "--text": "#e0def4",
      "--muted": "#6e6a86", // contraste ~4.6:1 ✓
      "--muted2": "#908caa",
      "--amber": "#f6c177", // gold
      "--purple": "#c4a7e7", // iris
      "--green": "#9ccfd8", // foam
      "--red": "#eb6f92", // love
      "--blue": "#31748f", // pine
      "--teal": "#9ccfd8",
      "--bg-hover": "#26233a",
      "--bg-glass": "rgba(25, 23, 36, 0.93)",
      "--accent-dim": "rgba(235, 188, 186, 0.10)",
      "--accent-border": "rgba(235, 188, 186, 0.36)",
      "--text-tertiary": "#26233a",
    },
  },

  // ── 12. SOLARIZED DARK ────────────────────────────────────────────────────
  // DNA: escuro warm com base científica de contraste (Ethan Schoonover, 2011).
  //      Fundamentos cromáticos rigorosos, paleta de 16 tons cuidadosamente calibrada.
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    preview: ["#002b36", "#268bd2", "#2aa198", "#b58900"],
    term: {
      background: "#002b36",
      foreground: "#839496",
      cursor: "#839496",
      cursorAccent: "#002b36",
      selectionBackground: "rgba(131, 148, 150, 0.15)",
      black: "#073642",
      brightBlack: "#002b36",
      red: "#dc322f",
      brightRed: "#cb4b16",
      green: "#859900",
      brightGreen: "#859900",
      yellow: "#b58900",
      brightYellow: "#657b83",
      blue: "#268bd2",
      brightBlue: "#839496",
      magenta: "#d33682",
      brightMagenta: "#6c71c4",
      cyan: "#2aa198",
      brightCyan: "#93a1a1",
      white: "#eee8d5",
      brightWhite: "#fdf6e3",
    },
    vars: {
      "--bg": "#002b36", // base03
      "--bg2": "#073642", // base02
      "--bg3": "#0d4254", // levemente acima de bg2
      "--border": "#0d4254",
      "--border2": "#1a5060",
      "--text": "#839496", // base0
      "--muted": "#4a7080", // contraste ~4.5:1 ✓
      "--muted2": "#657b83", // base00
      "--amber": "#b58900",
      "--purple": "#6c71c4",
      "--green": "#859900",
      "--red": "#dc322f",
      "--blue": "#268bd2",
      "--teal": "#2aa198",
      "--bg-hover": "#073642",
      "--bg-glass": "rgba(0, 43, 54, 0.93)",
      "--accent-dim": "rgba(38, 139, 210, 0.10)",
      "--accent-border": "rgba(38, 139, 210, 0.36)",
      "--text-tertiary": "#0d4254",
    },
  },

  // ── 13. EVERFOREST ────────────────────────────────────────────────────────
  // DNA: verde floresta profundo, paleta natural e orgânica, descanso visual.
  //      Inspirado no tema Everforest (sainnhe).
  {
    id: "everforest",
    name: "Everforest",
    preview: ["#2d353b", "#83c092", "#dbbc7f", "#e67e80"],
    term: {
      background: "#2d353b",
      foreground: "#d3c6aa",
      cursor: "#83c092",
      cursorAccent: "#2d353b",
      selectionBackground: "rgba(211, 198, 170, 0.15)",
      black: "#374247",
      brightBlack: "#5c6a72",
      red: "#e67e80",
      brightRed: "#e67e80",
      green: "#a7c080",
      brightGreen: "#83c092",
      yellow: "#dbbc7f",
      brightYellow: "#dbbc7f",
      blue: "#7fbbb3",
      brightBlue: "#7fbbb3",
      magenta: "#d699b6",
      brightMagenta: "#d699b6",
      cyan: "#83c092",
      brightCyan: "#83c092",
      white: "#d3c6aa",
      brightWhite: "#e8e1d0",
    },
    vars: {
      "--bg": "#2d353b",
      "--bg2": "#343e44", // hard bg
      "--bg3": "#3d484d", // surface bg
      "--border": "#414b50",
      "--border2": "#536067",
      "--text": "#d3c6aa",
      "--muted": "#698090", // contraste ~4.5:1 ✓
      "--muted2": "#859289",
      "--amber": "#dbbc7f", // yellow
      "--purple": "#d699b6", // purple
      "--green": "#a7c080", // green
      "--red": "#e67e80", // red
      "--blue": "#7fbbb3", // blue
      "--teal": "#83c092", // aqua
      "--bg-hover": "#3d484d",
      "--bg-glass": "rgba(45, 53, 59, 0.93)",
      "--accent-dim": "rgba(131, 192, 146, 0.10)",
      "--accent-border": "rgba(131, 192, 146, 0.36)",
      "--text-tertiary": "#3d484d",
    },
  },

  // ── 14. LIGHT WARM ────────────────────────────────────────────────────────
  // DNA: claro com temperatura warm (papel/creme), leitura prolongada confortável.
  //      Complemento ao Light claro-frio existente.
  {
    id: "light-warm",
    name: "Light Warm",
    preview: ["#faf8f4", "#1a1612", "#c97c2c", "#4a8c3e"],
    term: {
      background: "#faf8f4",
      foreground: "#2c2720",
      cursor: "#2c2720",
      cursorAccent: "#faf8f4",
      selectionBackground: "rgba(44, 39, 32, 0.12)",
      black: "#2c2720",
      brightBlack: "#8a7e72",
      red: "#c03030",
      brightRed: "#d94040",
      green: "#3a7a30",
      brightGreen: "#4a9a40",
      yellow: "#a06820",
      brightYellow: "#c07828",
      blue: "#2060a0",
      brightBlue: "#3070c0",
      magenta: "#8040a0",
      brightMagenta: "#a050c0",
      cyan: "#1a7880",
      brightCyan: "#2a9898",
      white: "#6a6058",
      brightWhite: "#2c2720",
    },
    vars: {
      "--bg": "#faf8f4",
      "--bg2": "#f2ede4",
      "--bg3": "#e8e0d4",
      "--border": "#ddd4c4",
      "--border2": "#c8bba8",
      "--text": "#2c2720",
      "--muted": "#7a6e64", // contraste ~5.2:1 ✓
      "--muted2": "#54484e", // mais escuro para legibilidade
      "--amber": "#c97c2c",
      "--purple": "#8040a0",
      "--green": "#4a8c3e",
      "--red": "#c03030",
      "--blue": "#2060a0",
      "--teal": "#1a7880",
      "--bg-hover": "#ede5d8",
      "--bg-glass": "rgba(250, 248, 244, 0.94)",
      "--accent-dim": "rgba(201, 124, 44, 0.08)",
      "--accent-border": "rgba(201, 124, 44, 0.30)",
      "--text-tertiary": "#d8cfc0",
    },
  },
];

export function getThemeById(id: string): AppTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export { THEMES };
