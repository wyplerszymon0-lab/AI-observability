import { LLMCall, Report, ModelStats } from "./types"

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

export function generateReport(calls: LLMCall[]): Report {
  if (calls.length === 0) {
    return {
      totalCalls: 0, successfulCalls: 0, failedCalls: 0,
      successRate: 0, totalCost: 0, totalTokens: 0,
      avgLatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0,
      byModel: {}, byProvider: {}, costByDay: {}, topTags: [],
    }
  }

  const successful = calls.filter(c => c.success)
  const latencies  = calls.map(c => c.latencyMs).sort((a, b) => a - b)

  const byModel:    Record<string, ModelStats> = {}
  const byProvider: Record<string, ModelStats> = {}
  const costByDay:  Record<string, number>     = {}
  const tagCount:   Record<string, number>     = {}

  for (const call of calls) {
    for (const group of [
      { key: call.model,    store: byModel },
      { key: call.provider, store: byProvider },
    ]) {
      if (!group.store[group.key]) {
        group.store[group.key] = { calls: 0, totalCost: 0, totalTokens: 0, avgLatency: 0, successRate: 0 }
      }
      const s = group.store[group.key]
      s.calls++
      s.totalCost   += call.cost
      s.totalTokens += call.totalTokens
      s.avgLatency   = (s.avgLatency * (s.calls - 1) + call.latencyMs) / s.calls
      s.successRate  = calls.filter(c =>
        (group.key === call.model ? c.model === group.key : c.provider === group.key) && c.success
      ).length / s.calls
    }

    const day = call.timestamp.toISOString().slice(0, 10)
    costByDay[day] = (costByDay[day] ?? 0) + call.cost

    for (const tag of call.tags) {
      tagCount[tag] = (tagCount[tag] ?? 0) + 1
    }
  }

  const topTags = Object.entries(tagCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))

  return {
    totalCalls:      calls.length,
    successfulCalls: successful.length,
    failedCalls:     calls.length - successful.length,
    successRate:     successful.length / calls.length,
    totalCost:       calls.reduce((s, c) => s + c.cost, 0),
    totalTokens:     calls.reduce((s, c) => s + c.totalTokens, 0),
    avgLatencyMs:    latencies.reduce((s, l) => s + l, 0) / latencies.length,
    p95LatencyMs:    percentile(latencies, 95),
    p99LatencyMs:    percentile(latencies, 99),
    byModel,
    byProvider,
    costByDay,
    topTags,
  }
}

export function formatReport(report: Report): string {
  const lines: string[] = []
  const sep = "=".repeat(55)
  const line = "-".repeat(55)

  lines.push(sep)
  lines.push("  AI OBSERVABILITY REPORT")
  lines.push(sep)
  lines.push(`Total calls:     ${report.totalCalls}`)
  lines.push(`Success rate:    ${(report.successRate * 100).toFixed(1)}%`)
  lines.push(`Total cost:      $${report.totalCost.toFixed(4)}`)
  lines.push(`Total tokens:    ${report.totalTokens.toLocaleString()}`)
  lines.push(`Avg latency:     ${report.avgLatencyMs.toFixed(0)}ms`)
  lines.push(`P95 latency:     ${report.p95LatencyMs.toFixed(0)}ms`)
  lines.push(`P99 latency:     ${report.p99LatencyMs.toFixed(0)}ms`)

  if (Object.keys(report.byModel).length > 0) {
    lines.push(line)
    lines.push("  BY MODEL")
    lines.push(line)
    for (const [model, stats] of Object.entries(report.byModel)) {
      lines.push(`  ${model}`)
      lines.push(`    calls=${stats.calls} cost=$${stats.totalCost.toFixed(4)} tokens=${stats.totalTokens} latency=${stats.avgLatency.toFixed(0)}ms`)
    }
  }

  if (report.topTags.length > 0) {
    lines.push(line)
    lines.push("  TOP TAGS")
    lines.push(line)
    for (const { tag, count } of report.topTags) {
      lines.push(`  ${tag}: ${count}`)
    }
  }

  lines.push(sep)
  return lines.join("\n")
}
