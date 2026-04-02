import { describe, it, expect, beforeEach } from "vitest"
import { LLMObserver } from "../src/observer"
import { LLMCall } from "../src/types"

function makeCall(overrides: Partial<LLMCall> = {}): Omit<LLMCall, "id" | "timestamp" | "cost"> {
  return {
    provider:         "openai",
    model:            "gpt-4o-mini",
    prompt:           "What is AI?",
    response:         "AI is artificial intelligence.",
    promptTokens:     10,
    completionTokens: 20,
    totalTokens:      30,
    latencyMs:        250,
    success:          true,
    tags:             ["test"],
    ...overrides,
  }
}

describe("LLMObserver — track", () => {
  let observer: LLMObserver

  beforeEach(() => { observer = new LLMObserver() })

  it("tracks a call and assigns id and timestamp", () => {
    const call = observer.track(makeCall())
    expect(call.id).toBeTruthy()
    expect(call.timestamp).toBeInstanceOf(Date)
  })

  it("calculates cost automatically", () => {
    const call = observer.track(makeCall({ model: "gpt-4o-mini", totalTokens: 1000 }))
    expect(call.cost).toBeGreaterThan(0)
  })

  it("increments totalCalls", () => {
    observer.track(makeCall())
    observer.track(makeCall())
    expect(observer.totalCalls).toBe(2)
  })

  it("calls onCall hook for successful calls", () => {
    const calls: LLMCall[] = []
    const obs = new LLMObserver({ onCall: c => calls.push(c) })
    obs.track(makeCall({ success: true }))
    expect(calls).toHaveLength(1)
  })

  it("calls onError hook for failed calls", () => {
    const errors: LLMCall[] = []
    const obs = new LLMObserver({ onError: c => errors.push(c) })
    obs.track(makeCall({ success: false, error: "API error" }))
    expect(errors).toHaveLength(1)
  })
})

describe("LLMObserver — getCalls filter", () => {
  let observer: LLMObserver

  beforeEach(() => {
    observer = new LLMObserver()
    observer.track(makeCall({ provider: "openai",    model: "gpt-4o-mini", tags: ["prod"] }))
    observer.track(makeCall({ provider: "anthropic", model: "claude-3-haiku", tags: ["dev"] }))
    observer.track(makeCall({ provider: "openai",    model: "gpt-4o",      success: false, tags: ["prod"] }))
  })

  it("filters by provider", () => {
    const calls = observer.getCalls({ provider: "anthropic" })
    expect(calls).toHaveLength(1)
    expect(calls[0].provider).toBe("anthropic")
  })

  it("filters by success", () => {
    const failed = observer.getCalls({ success: false })
    expect(failed).toHaveLength(1)
    expect(failed[0].success).toBe(false)
  })

  it("filters by tag", () => {
    const prod = observer.getCalls({ tag: "prod" })
    expect(prod).toHaveLength(2)
  })

  it("returns all when no filter", () => {
    expect(observer.getCalls()).toHaveLength(3)
  })
})

describe("LLMObserver — report", () => {
  let observer: LLMObserver

  beforeEach(() => {
    observer = new LLMObserver()
    observer.track(makeCall({ totalTokens: 100, latencyMs: 200, success: true  }))
    observer.track(makeCall({ totalTokens: 200, latencyMs: 400, success: true  }))
    observer.track(makeCall({ totalTokens: 50,  latencyMs: 100, success: false }))
  })

  it("counts total calls correctly", () => {
    expect(observer.report().totalCalls).toBe(3)
  })

  it("calculates success rate", () => {
    const rate = observer.report().successRate
    expect(rate).toBeCloseTo(2 / 3)
  })

  it("sums total tokens", () => {
    expect(observer.report().totalTokens).toBe(350)
  })

  it("calculates average latency", () => {
    const avg = observer.report().avgLatencyMs
    expect(avg).toBeCloseTo((200 + 400 + 100) / 3)
  })

  it("returns empty report for no calls", () => {
    const empty = new LLMObserver()
    const report = empty.report()
    expect(report.totalCalls).toBe(0)
    expect(report.totalCost).toBe(0)
  })

  it("groups by model", () => {
    expect(Object.keys(observer.report().byModel)).toContain("gpt-4o-mini")
  })
})

describe("LLMObserver — clear", () => {
  it("clears all tracked calls", () => {
    const observer = new LLMObserver()
    observer.track(makeCall())
    observer.track(makeCall())
    observer.clear()
    expect(observer.totalCalls).toBe(0)
  })
})

describe("LLMObserver — maxEntries", () => {
  it("evicts oldest when maxEntries exceeded", () => {
    const observer = new LLMObserver({ maxEntries: 3 })
    for (let i = 0; i < 5; i++) observer.track(makeCall())
    expect(observer.totalCalls).toBe(3)
  })
})

describe("estimateCost", () => {
  it("calculates cost based on tokens and model", async () => {
    const { estimateCost } = await import("../src/pricing")
    const cost = estimateCost("gpt-4o-mini", 1000)
    expect(cost).toBeCloseTo(0.00015)
  })

  it("uses custom pricing when provided", async () => {
    const { estimateCost } = await import("../src/pricing")
    const cost = estimateCost("my-model", 1000, { "my-model": 2.00 })
    expect(cost).toBeCloseTo(0.002)
  })
})
