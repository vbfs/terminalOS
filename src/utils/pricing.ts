// USD per 1M input tokens — used for cost estimation
const MODEL_PRICE: Record<string, number> = {
  'claude-opus-4':          15.0,
  'claude-opus-4-5':        15.0,
  'claude-sonnet-4-5':       3.0,
  'claude-sonnet-4-6':       3.0,
  'claude-3-7-sonnet':       3.0,
  'claude-3-5-sonnet':       3.0,
  'claude-3-5-haiku':        0.8,
  'claude-haiku-4-5':        0.8,
}

const DEFAULT_PRICE = 3.0 // Sonnet pricing as conservative fallback

/** Extracts a normalized model slug from noisy PTY output strings. */
export function normalizeModel(raw: string): string | null {
  const lower = raw.toLowerCase()
  // Longest match first to avoid partial matches
  for (const key of Object.keys(MODEL_PRICE).sort((a, b) => b.length - a.length)) {
    if (lower.includes(key)) return key
  }
  return null
}

/** Estimates cost in USD from token count and optional model name. */
export function estimateCost(tokens: number, model: string | null): number {
  const pricePerMillion = model ? (MODEL_PRICE[model] ?? DEFAULT_PRICE) : DEFAULT_PRICE
  return (tokens / 1_000_000) * pricePerMillion
}

/** Formats a USD cost as an approximate string with ~ prefix. */
export function formatCost(usd: number): string {
  if (usd < 0.005) return '~$0.00'
  if (usd < 1) return `~$${usd.toFixed(2)}`
  return `~$${usd.toFixed(1)}`
}
