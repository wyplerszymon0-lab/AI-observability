export type LogLevel = "debug" | "info" | "warn" | "error"

export type Provider = "openai" | "anthropic" | "cohere" | "custom"

export interface LLMCall {
  id:           string
  provider:     Provider
  model:        string
  prompt:       string
  response:     string
  promptTokens:     number
  completionTokens: number
  totalTokens:      number
  latencyMs:    number
  cost:         number
  success:      boolean
  error?:       string
  tags:         string[]
  timestamp:    Date
}

export interface CallFilter {
  provider?:  Provider
  model?:     string
  success?:   boolean
  tag?:       string
  fromDate?:  Date
  toDate?:    Date
  minCost?:   number
  maxLatency?: number
}

export interface Report {
  totalCalls:       number
  successfulCalls:  number
  failedCalls:      number
  successRate:      number
  totalCost:        number
  totalTokens:      number
  avgLatencyMs:     number
  p95LatencyMs:     number
  p99LatencyMs:     number
  byModel:          Record<string, ModelStats>
  byProvider:       Record<string, ModelStats>
  costByDay:        Record<string, number>
  topTags:          Array<{ tag: string; count: number }>
}

export interface ModelStats {
  calls:       number
  totalCost:   number
  totalTokens: number
  avgLatency:  number
  successRate: number
}

export interface ObservabilityOptions {
  maxEntries?:  number
  logLevel?:    LogLevel
  onCall?:      (call: LLMCall) => void
  onError?:     (call: LLMCall) => void
  costPer1kTokens?: Partial<Record<string, number>>
}
