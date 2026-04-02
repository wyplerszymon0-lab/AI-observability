const DEFAULT_PRICING: Record<string, number> = {
  "gpt-4o":             5.00,
  "gpt-4o-mini":        0.15,
  "gpt-4-turbo":        10.00,
  "gpt-3.5-turbo":      0.50,
  "claude-3-5-sonnet":  3.00,
  "claude-3-haiku":     0.25,
  "claude-3-opus":      15.00,
  "command-r":          0.50,
  "command-r-plus":     3.00,
}

export function estimateCost(
  model: string,
  totalTokens: number,
  customPricing?: Partial<Record<string, number>>,
): number {
  const pricing = { ...DEFAULT_PRICING, ...customPricing }
  const rate    = pricing[model] ?? pricing[Object.keys(pricing).find(k => model.includes(k)) ?? ""] ?? 1.00
  return (totalTokens / 1000) * rate
}

export function getDefaultPricing(): Record<string, number> {
  return { ...DEFAULT_PRICING }
}
