# ultralab-scanners

Zero-dependency TypeScript scanners for AI security, SEO, and AEO analysis. No API calls, no LLM costs, pure HTML/text parsing.

Built by [Ultra Lab](https://ultralab.tw) — the same scanners powering [UltraProbe](https://ultralab.tw/probe).

## What's included

### 1. Prompt Defense Scanner
Analyzes AI system prompts for missing security defenses across 12 attack vectors.

- Role boundary enforcement
- Instruction override protection
- Data leakage prevention
- Unicode attack detection
- Social engineering defense
- And 7 more...

```typescript
import { runDeterministicScan } from 'ultralab-scanners'

const result = runDeterministicScan('You are a helpful assistant...')
console.log(result.score)     // 0-100
console.log(result.coverage)  // "4/12"
console.log(result.checks)    // detailed per-vector results
```

### 2. SEO Scanner
Pure HTML analysis for 8 SEO categories — no Lighthouse, no headless browser needed.

- Meta tags (title, description, canonical, viewport)
- Heading hierarchy
- Image alt attributes & lazy loading
- Internal/external link analysis
- Open Graph & Twitter Card
- Structured data (JSON-LD validation)
- Performance hints

```typescript
import { runSeoScan } from 'ultralab-scanners'

const html = await fetch('https://example.com').then(r => r.text())
const result = runSeoScan(html, 'https://example.com')
console.log(result.grade)  // 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
console.log(result.score)  // 0-100
```

### 3. AEO Scanner
Answer Engine Optimization — checks if AI search engines (Perplexity, ChatGPT Search, Google AI Overview) can understand and cite your content.

- FAQ schema detection
- Answer-ready content patterns
- Structured data richness
- Content clarity scoring
- Citation-friendliness (author, dates, E-E-A-T)
- AI crawler access
- llms.txt compliance
- Entity clarity

```typescript
import { runAeoScan } from 'ultralab-scanners'

const html = await fetch('https://example.com').then(r => r.text())
const result = runAeoScan(html, 'https://example.com')
console.log(result.grade)       // 'A'
console.log(result.categories)  // 8 category breakdowns
```

## Key features

- **Zero dependencies** — pure TypeScript, nothing to install
- **Zero cost** — no API calls, no LLM, runs locally
- **Fast** — prompt scanner < 5ms, SEO/AEO scanners < 50ms
- **Bilingual** — prompt defense patterns support English + Traditional Chinese
- **Production-tested** — powers [UltraProbe](https://ultralab.tw/probe) with 1,600+ monthly users

## Install

```bash
npm install ultralab-scanners
```

## Use cases

- **CI/CD pipeline** — scan prompts and pages on every deploy
- **Content audit** — bulk-check SEO/AEO across your site
- **Security review** — audit LLM system prompts before production
- **Monitoring** — track SEO/AEO scores over time

## License

MIT

## Links

- [UltraProbe](https://ultralab.tw/probe) — free online scanner powered by this library
- [Blog](https://ultralab.tw/blog) — technical writing on AI security and SEO
- [Discord](https://discord.gg/ewS4rWXvWk) — Solo Lab developer community
