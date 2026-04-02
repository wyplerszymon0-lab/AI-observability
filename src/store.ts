import { LLMCall, CallFilter } from "./types"

export class CallStore {
  private calls:      LLMCall[] = []
  private maxEntries: number

  constructor(maxEntries = 10000) {
    this.maxEntries = maxEntries
  }

  add(call: LLMCall): void {
    this.calls.push(call)
    if (this.calls.length > this.maxEntries) {
      this.calls.shift()
    }
  }

  filter(f: CallFilter = {}): LLMCall[] {
    return this.calls.filter(c => {
      if (f.provider   && c.provider !== f.provider)           return false
      if (f.model      && !c.model.includes(f.model))          return false
      if (f.success    !== undefined && c.success !== f.success) return false
      if (f.tag        && !c.tags.includes(f.tag))              return false
      if (f.fromDate   && c.timestamp < f.fromDate)             return false
      if (f.toDate     && c.timestamp > f.toDate)               return false
      if (f.minCost    && c.cost < f.minCost)                   return false
      if (f.maxLatency && c.latencyMs > f.maxLatency)           return false
      return true
    })
  }

  getAll(): LLMCall[] {
    return [...this.calls]
  }

  getById(id: string): LLMCall | undefined {
    return this.calls.find(c => c.id === id)
  }

  clear(): void {
    this.calls = []
  }

  get size(): number {
    return this.calls.length
  }
}
