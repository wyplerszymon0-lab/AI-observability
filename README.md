# ai-observability

Production-grade observability layer for LLM API calls. Tracks cost,
latency, token usage and errors — wraps OpenAI client transparently.

## Features

- Transparent OpenAI client wrapper — zero code changes needed
- Cost estimation for 9 models out of the box
- Latency tracking with P95 and P99 percentiles
- Filter calls by provider, model, tag, date, cost
- Per-model and per-provider breakdown
- Daily cost aggregation
- Tag-based call grouping
- onCall / onError hooks for real-time alerting

## Usage
```typescript
import OpenAI from "openai"
import { LLMObserver } from "./src"

const observer = new LLMObserver({
  onCall:  call => console.log(`$${call.cost.toFixed(4)} — ${call.latencyMs}ms`),
  onError: call => console.error(`Failed: ${call.error}`),
})

const client = observer.wrapOpenAI(new OpenAI({ apiKey: "..." }), ["production"])

const response = await client.chat.completions.create({
  model:    "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
})

observer.printReport()
```

## Report Output
```
=======================================================
  AI OBSERVABILITY REPORT
=======================================================
Total calls:     42
Success rate:    97.6%
Total cost:      $0.0312
Total tokens:    24,830
Avg latency:     387ms
P95 latency:     891ms
P99 latency:     1243ms
```

## Test
```bash
npm install
npm test
```

## Project Structure
```
ai-observability/
├── src/
│   ├── index.ts      # Public exports
│   ├── observer.ts   # LLMObserver — main class
│   ├── store.ts      # CallStore — in-memory storage
│   ├── reporter.ts   # Report generation and formatting
│   ├── pricing.ts    # Cost estimation per model
│   └── types.ts      # Interfaces and types
├── tests/
│   └── observer.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Author

**Szymon Wypler** 
