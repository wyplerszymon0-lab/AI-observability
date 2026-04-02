import crypto from "crypto"
import OpenAI from "openai"
import { LLMCall, ObservabilityOptions, CallFilter, Report, Provider } from "./types"
import { CallStore } from "./store"
import { generateReport, formatReport } from "./reporter"
import { estimateCost } from "./pricing"

export class LLMObserver {
  private store:   CallStore
  private options: Required<ObservabilityOptions>

  constructor(options: ObservabilityOptions = {}) {
    this.store   = new CallStore(options.maxEntries ?? 10000)
    this.options = {
      maxEntries:       options.maxEntries      ?? 10000,
      logLevel:         options.logLevel        ?? "info",
      onCall:           options.onCall          ?? (() => {}),
      onError:          options.onError         ?? (() => {}),
      costPer1kTokens:  options.costPer1kTokens ?? {},
    }
  }

  wrapOpenAI(client: OpenAI, tags: string[] = []): OpenAI {
    const observer = this
    const original = client.chat.completions.create.bind(client.chat.completions)

    client.chat.completions.create = async function(params: any, options?: any): Promise<any> {
      const start = Date.now()
      const id    = crypto.randomUUID()

      const promptText = params.messages
        ?.map((m: any) => `${m.role}: ${m.content}`)
        .join("\n") ?? ""

      try {
        const response    = await original(params, options)
        const latencyMs   = Date.now() - start
        const usage       = (response as any).usage ?? {}
        const promptTok   = usage.prompt_tokens     ?? 0
        const completeTok = usage.completion_tokens ?? 0
        const totalTok    = usage.total_tokens      ?? promptTok + completeTok
        const content     = (response as any).choices?.[0]?.message?.content ?? ""

        const call: LLMCall = {
          id,
          provider:         "openai",
          model:            params.model,
          prompt:           promptText,
          response:         content,
          promptTokens:     promptTok,
          completionTokens: completeTok,
          totalTokens:      totalTok,
          latencyMs,
          cost:             estimateCost(params.model, totalTok, observer.options.costPer1kTokens),
          success:          true,
          tags,
          timestamp:        new Date(),
        }

        observer.store.add(call)
        observer.options.onCall(call)
        return response

      } catch (err: any) {
        const latencyMs = Date.now() - start

        const call: LLMCall = {
          id,
          provider:         "openai",
          model:            params.model ?? "unknown",
          prompt:           promptText,
          response:         "",
          promptTokens:     0,
          completionTokens: 0,
          totalTokens:      0,
          latencyMs,
          cost:             0,
          success:          false,
          error:            err.message,
          tags,
          timestamp:        new Date(),
        }

        observer.store.add(call)
        observer.options.onError(call)
        throw err
      }
    } as any

    return client
  }

  track(call: Omit<LLMCall, "id" | "timestamp" | "cost">): LLMCall {
    const full: LLMCall = {
      ...call,
      id:        crypto.randomUUID(),
      timestamp: new Date(),
      cost:      estimateCost(call.model, call.totalTokens, this.options.costPer1kTokens),
    }
    this.store.add(full)
    if (full.success) this.options.onCall(full)
    else              this.options.onError(full)
    return full
  }

  getCalls(filter?: CallFilter): LLMCall[] {
    return this.store.filter(filter)
  }

  getCall(id: string): LLMCall | undefined {
    return this.store.getById(id)
  }

  report(filter?: CallFilter): Report {
    return generateReport(this.store.filter(filter))
  }

  printReport(filter?: CallFilter): void {
    console.log(formatReport(this.report(filter)))
  }

  clear(): void {
    this.store.clear()
  }

  get totalCalls(): number {
    return this.store.size
  }
}
