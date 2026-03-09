/**
 * Deterministic AEO (Answer Engine Optimization) Scanner — pure HTML parsing, $0 cost.
 * Analyzes how well a page is optimized for AI search engines
 * (Perplexity, ChatGPT Search, Google AI Overview, Grok).
 */

type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
type CheckStatus = 'pass' | 'fail' | 'warn' | 'info'

interface SeoCheck {
  id: string
  name: string
  status: CheckStatus
  value?: string
  recommendation?: string
  weight: number
}

interface SeoCategory {
  id: string
  name: string
  checks: SeoCheck[]
  score: number
}

export interface AeoScanOutput {
  grade: Grade
  score: number
  summary: string
  categories: SeoCategory[]
}

function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  if (score >= 30) return 'E'
  return 'F'
}

function calcCategoryScore(checks: SeoCheck[]): number {
  // Exclude 'info' checks from scoring — they're informational, not pass/fail
  const scorable = checks.filter(c => c.status !== 'info')
  const total = scorable.reduce((s, c) => s + c.weight, 0)
  if (total === 0) return 100
  const passed = scorable.filter(c => c.status === 'pass').reduce((s, c) => s + c.weight, 0)
  const partial = scorable.filter(c => c.status === 'warn').reduce((s, c) => s + c.weight * 0.5, 0)
  return Math.round(((passed + partial) / total) * 100)
}

function getJsonLdTypes(html: string): string[] {
  const types: string[] = []
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const b of blocks) {
    const matches = b[1].matchAll(/"@type"\s*:\s*"([^"]+)"/g)
    for (const m of matches) types.push(m[1])
  }
  return types
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function checkFaqSchema(html: string): SeoCategory {
  const checks: SeoCheck[] = []
  const types = getJsonLdTypes(html)

  checks.push({
    id: 'faq-schema', name: 'FAQPage schema', weight: 3,
    status: types.includes('FAQPage') ? 'pass' : 'fail',
    recommendation: types.includes('FAQPage') ? undefined : 'Add FAQPage JSON-LD schema — AI engines strongly favor structured Q&A.',
  })

  checks.push({
    id: 'howto-schema', name: 'HowTo schema', weight: 2,
    status: types.includes('HowTo') ? 'pass' : 'info',
    value: types.includes('HowTo') ? 'Present' : 'Not found (recommended for tutorial content)',
    recommendation: types.includes('HowTo') ? undefined : 'Add HowTo schema for step-by-step content to appear in AI answers.',
  })

  const hasQA = types.includes('QAPage') || types.includes('Question') || types.includes('Answer')
  checks.push({
    id: 'qa-schema', name: 'Q&A schema', weight: 2,
    status: hasQA ? 'pass' : 'info',
    value: hasQA ? 'Present' : 'Not found (optional)',
  })

  return { id: 'faq-schema', name: 'FAQ Schema', checks, score: calcCategoryScore(checks) }
}

function checkAnswerReady(html: string): SeoCategory {
  const checks: SeoCheck[] = []

  // Q&A pattern headings (What, How, Why, When, Where, Who, Can, Does, Is)
  const qaHeadings = [...html.matchAll(/<h[2-3][^>]*>([^<]*)/gi)]
  const qaPatterns = qaHeadings.filter(m => {
    const text = m[1].trim()
    return /^(what|how|why|when|where|who|can|does|is|will|should|which|什麼|如何|為什麼|何時|哪裡|誰|可以|是否)/i.test(text)
  })
  checks.push({
    id: 'qa-headings', name: 'Q&A pattern headings', weight: 3,
    status: qaPatterns.length >= 3 ? 'pass' : qaPatterns.length >= 1 ? 'warn' : 'fail',
    value: `${qaPatterns.length} question-style headings`,
    recommendation: qaPatterns.length < 3 ? 'Use question-format headings (What is..., How to...) — AI engines extract these as answers.' : undefined,
  })

  // Lists usage
  const uls = html.match(/<ul[\s>]/gi) || []
  const ols = html.match(/<ol[\s>]/gi) || []
  const listCount = uls.length + ols.length
  checks.push({
    id: 'list-usage', name: 'Structured lists', weight: 2,
    status: listCount >= 3 ? 'pass' : listCount >= 1 ? 'warn' : 'fail',
    value: `${listCount} lists (${uls.length} unordered, ${ols.length} ordered)`,
    recommendation: listCount < 3 ? 'Use bullet/numbered lists — AI engines prefer structured, scannable content.' : undefined,
  })

  // Short paragraphs
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  if (paragraphs.length > 0) {
    const avgLen = paragraphs.reduce((s, m) => s + stripHtml(m[1]).length, 0) / paragraphs.length
    checks.push({
      id: 'short-paragraphs', name: 'Concise paragraphs', weight: 2,
      status: avgLen <= 150 ? 'pass' : avgLen <= 250 ? 'warn' : 'fail',
      value: `Average ${Math.round(avgLen)} chars/paragraph`,
      recommendation: avgLen > 150 ? 'Keep paragraphs under 150 chars — AI engines extract shorter blocks more accurately.' : undefined,
    })
  } else {
    checks.push({ id: 'short-paragraphs', name: 'Concise paragraphs', status: 'warn', value: 'No <p> tags found', weight: 2 })
  }

  // Definition-like patterns (bold term followed by text)
  const defPatterns = html.match(/<(strong|b)>[^<]+<\/\1>\s*[—–:-]/g) || []
  checks.push({
    id: 'definitions', name: 'Definition patterns', weight: 1,
    status: defPatterns.length >= 2 ? 'pass' : defPatterns.length >= 1 ? 'warn' : 'info',
    value: `${defPatterns.length} definition-style patterns`,
    recommendation: defPatterns.length < 2 ? 'Use "**Term** — definition" patterns for AI-extractable definitions.' : undefined,
  })

  return { id: 'answer-ready', name: 'Answer-Ready Content', checks, score: calcCategoryScore(checks) }
}

function checkStructuredRichness(html: string): SeoCategory {
  const checks: SeoCheck[] = []
  const types = getJsonLdTypes(html)

  checks.push({
    id: 'breadcrumb-schema', name: 'BreadcrumbList schema', weight: 2,
    status: types.includes('BreadcrumbList') ? 'pass' : 'warn',
    recommendation: types.includes('BreadcrumbList') ? undefined : 'Add BreadcrumbList schema for navigation context in AI answers.',
  })

  const hasArticle = types.includes('Article') || types.includes('BlogPosting') || types.includes('NewsArticle') || types.includes('TechArticle')
  const hasPageType = hasArticle || types.includes('ProfessionalService') || types.includes('LocalBusiness') || types.includes('Product') || types.includes('SoftwareApplication')
  checks.push({
    id: 'article-schema', name: 'Content type schema', weight: 3,
    status: hasPageType ? 'pass' : hasArticle ? 'pass' : 'fail',
    value: hasPageType ? `Found: ${types.filter(t => ['Article','BlogPosting','ProfessionalService','LocalBusiness','Product','SoftwareApplication'].includes(t)).join(', ')}` : undefined,
    recommendation: hasPageType ? undefined : 'Add Article, ProfessionalService, or other content type schema — critical for AI citation.',
  })

  checks.push({
    id: 'org-schema', name: 'Organization schema', weight: 2,
    status: types.includes('Organization') ? 'pass' : 'warn',
    recommendation: types.includes('Organization') ? undefined : 'Add Organization schema to establish entity identity for AI engines.',
  })

  const hasWebPage = types.includes('WebPage') || types.includes('WebSite')
  checks.push({
    id: 'webpage-schema', name: 'WebPage/WebSite schema', weight: 1,
    status: hasWebPage ? 'pass' : 'info',
  })

  return { id: 'structured-rich', name: 'Structured Data Richness', checks, score: calcCategoryScore(checks) }
}

function checkContentClarity(html: string): SeoCategory {
  const checks: SeoCheck[] = []
  const text = stripHtml(html)
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
  const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const totalWords = wordCount + cjkChars

  // Heading density
  const headings = html.match(/<h[1-6][\s>]/gi) || []
  const headingsPer500 = totalWords > 0 ? (headings.length / totalWords) * 500 : 0
  checks.push({
    id: 'heading-density', name: 'Heading density', weight: 2,
    status: headingsPer500 >= 1 && headingsPer500 <= 5 ? 'pass' : headingsPer500 > 0 ? 'warn' : 'fail',
    value: `${headings.length} headings / ${totalWords} words`,
    recommendation: headingsPer500 < 1 ? 'Add more headings — AI engines use headings to understand content structure.' : undefined,
  })

  // Tables
  const tables = html.match(/<table[\s>]/gi) || []
  checks.push({
    id: 'tables', name: 'Comparison tables', weight: 1,
    status: tables.length > 0 ? 'pass' : 'info',
    value: `${tables.length} table(s)`,
    recommendation: tables.length === 0 ? 'Use tables for comparisons — AI engines extract tabular data effectively.' : undefined,
  })

  // Content length
  checks.push({
    id: 'content-length', name: 'Content length', weight: 2,
    status: totalWords >= 300 && totalWords <= 5000 ? 'pass' : totalWords > 5000 ? 'warn' : 'fail',
    value: `~${totalWords} words`,
    recommendation: totalWords < 300 ? 'Content is too thin. Aim for 300+ words for AI engines to consider your page.' :
      totalWords > 5000 ? 'Very long content. Consider splitting into focused pages for better AI extraction.' : undefined,
  })

  // Direct answer patterns ("X is", "X means")
  const directAnswers = text.match(/(is|are|means|refers to|involves|consists of|includes)\s/gi) || []
  checks.push({
    id: 'direct-answers', name: 'Direct answer patterns', weight: 2,
    status: directAnswers.length >= 5 ? 'pass' : directAnswers.length >= 2 ? 'warn' : 'fail',
    value: `${directAnswers.length} direct answer sentences`,
    recommendation: directAnswers.length < 5 ? 'Use direct answer patterns (e.g., "X is..." or "X means...") — AI engines prefer clear, extractable definitions.' : undefined,
  })

  return { id: 'clarity', name: 'Content Clarity', checks, score: calcCategoryScore(checks) }
}

function checkCitationFriendly(html: string): SeoCategory {
  const checks: SeoCheck[] = []

  // Author info
  const hasAuthor = /<meta[^>]+name=["']author["']/i.test(html) ||
    /["']author["']\s*:/i.test(html) ||
    /<a[^>]+rel=["']author["']/i.test(html)
  checks.push({
    id: 'author-info', name: 'Author information', weight: 3,
    status: hasAuthor ? 'pass' : 'fail',
    recommendation: hasAuthor ? undefined : 'Add author meta tag or JSON-LD author — AI engines cite sources with clear authorship.',
  })

  // Date published
  const hasDate = /datePublished/i.test(html) || /dateModified/i.test(html) ||
    /<time[^>]+datetime/i.test(html) ||
    /<meta[^>]+article:published_time/i.test(html)
  checks.push({
    id: 'date-info', name: 'Publication date', weight: 3,
    status: hasDate ? 'pass' : 'fail',
    recommendation: hasDate ? undefined : 'Add datePublished/dateModified — AI engines prioritize recent, dated content.',
  })

  // Copyright info
  const hasCopyright = /copyright/i.test(html) || /©/i.test(html) || /&copy;/i.test(html) ||
    /copyrightHolder/i.test(html) || /copyrightYear/i.test(html)
  checks.push({
    id: 'copyright', name: 'Copyright declaration', weight: 1,
    status: hasCopyright ? 'pass' : 'info',
    value: hasCopyright ? 'Copyright notice found' : 'No copyright notice',
  })

  // Meta rights
  const hasRights = /<meta[^>]+name=["'](rights|dcterms\.rights)["']/i.test(html)
  checks.push({
    id: 'meta-rights', name: 'Rights meta tags', weight: 1,
    status: hasRights ? 'pass' : 'info',
    recommendation: hasRights ? undefined : 'Add <meta name="rights"> to declare content ownership for AI crawlers.',
  })

  return { id: 'citation', name: 'Citation-Friendliness', checks, score: calcCategoryScore(checks) }
}

function checkAiCrawlerAccess(html: string): SeoCategory {
  const checks: SeoCheck[] = []

  // Check for AI bot meta directives
  const robotsMeta = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i)
  const robotsContent = robotsMeta ? robotsMeta[1] : ''

  // Check specific AI bot meta tags
  const aiBots = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'anthropic-ai']
  const blockedBots: string[] = []
  const allowedBots: string[] = []

  for (const bot of aiBots) {
    const botMeta = html.match(new RegExp(`<meta[^>]+name=["']${bot}["'][^>]*content=["']([^"']*)["']`, 'i'))
    if (botMeta) {
      if (botMeta[1].includes('noindex') || botMeta[1].includes('none')) {
        blockedBots.push(bot)
      } else {
        allowedBots.push(bot)
      }
    }
  }

  // General robots check
  const generallyBlocked = robotsContent.includes('noindex') || robotsContent.includes('none')
  checks.push({
    id: 'general-indexable', name: 'Page indexable by AI', weight: 3,
    status: generallyBlocked ? 'fail' : 'pass',
    value: generallyBlocked ? 'Page has noindex — AI engines cannot read this page' : 'Page is indexable',
    recommendation: generallyBlocked ? 'Remove noindex if you want AI engines to cite your content.' : undefined,
  })

  // AI bot specific
  if (blockedBots.length > 0) {
    checks.push({
      id: 'ai-bots-blocked', name: 'AI crawler access', weight: 2,
      status: 'warn',
      value: `Blocked: ${blockedBots.join(', ')}`,
      recommendation: 'Some AI crawlers are blocked. This limits your visibility in AI search results.',
    })
  } else {
    checks.push({
      id: 'ai-bots-allowed', name: 'AI crawler access', weight: 2,
      status: 'pass',
      value: 'No AI-specific blocks detected in HTML',
    })
  }

  // Check for ai-content-declaration meta
  const hasAiMeta = /<meta[^>]+name=["']ai-content-declaration["']/i.test(html)
  checks.push({
    id: 'ai-meta', name: 'AI content declaration', weight: 1,
    status: hasAiMeta ? 'pass' : 'info',
    value: hasAiMeta ? 'Present — claims original content' : 'Not found',
    recommendation: hasAiMeta ? undefined : 'Add <meta name="ai-content-declaration"> to declare content originality to AI crawlers.',
  })

  return { id: 'ai-crawler', name: 'AI Crawler Access', checks, score: calcCategoryScore(checks) }
}

function checkLlmsTxt(html: string): SeoCategory {
  const checks: SeoCheck[] = []

  // llms.txt reference
  const hasLlmsTxt = /llms\.txt/i.test(html) || /llms-full\.txt/i.test(html)
  checks.push({
    id: 'llms-txt', name: 'llms.txt reference', weight: 3,
    status: hasLlmsTxt ? 'pass' : 'fail',
    recommendation: hasLlmsTxt ? undefined : 'Add llms.txt — the emerging standard for AI-readable site context. See llmstxt.org.',
  })

  // ai-plugin.json reference
  const hasAiPlugin = /ai-plugin\.json/i.test(html) || /\.well-known\/ai-plugin/i.test(html)
  checks.push({
    id: 'ai-plugin', name: 'AI plugin manifest', weight: 1,
    status: hasAiPlugin ? 'pass' : 'info',
    value: hasAiPlugin ? 'Present' : 'Not found (optional, for ChatGPT plugins)',
  })

  // Semantic HTML5 elements
  const hasMain = /<main[\s>]/i.test(html)
  const hasArticle = /<article[\s>]/i.test(html)
  const hasNav = /<nav[\s>]/i.test(html)
  const semanticCount = [hasMain, hasArticle, hasNav].filter(Boolean).length
  checks.push({
    id: 'semantic-html', name: 'Semantic HTML5 elements', weight: 2,
    status: semanticCount >= 2 ? 'pass' : semanticCount >= 1 ? 'warn' : 'fail',
    value: `Found: ${[hasMain && '<main>', hasArticle && '<article>', hasNav && '<nav>'].filter(Boolean).join(', ') || 'none'}`,
    recommendation: semanticCount < 2 ? 'Use semantic HTML5 elements (<main>, <article>, <nav>) — AI engines use them to identify main content.' : undefined,
  })

  return { id: 'llms-txt', name: 'llms.txt & AI Standards', checks, score: calcCategoryScore(checks) }
}

function checkEntityClarity(html: string): SeoCategory {
  const checks: SeoCheck[] = []

  // Key term emphasis
  const strongTags = html.match(/<(strong|b)>[^<]+<\/\1>/gi) || []
  checks.push({
    id: 'key-terms', name: 'Key term emphasis', weight: 2,
    status: strongTags.length >= 5 ? 'pass' : strongTags.length >= 2 ? 'warn' : 'fail',
    value: `${strongTags.length} bold/strong elements`,
    recommendation: strongTags.length < 5 ? 'Use <strong> to highlight key terms — helps AI engines identify important concepts.' : undefined,
  })

  // About/author page link
  const hasAboutLink = /<a[^>]+href=["'][^"']*(about|author|team|us)[^"']*["']/i.test(html)
  checks.push({
    id: 'about-link', name: 'About/Author page link', weight: 2,
    status: hasAboutLink ? 'pass' : 'warn',
    recommendation: hasAboutLink ? undefined : 'Link to an About or Author page — establishes E-E-A-T for AI citation trust.',
  })

  // Expertise signals (credentials, experience, qualifications)
  const text = html.toLowerCase()
  const expertiseKeywords = ['expert', 'experience', 'certified', 'professional', 'specialist',
    'phd', 'researcher', 'founded', 'built', 'developed', 'years of',
    '專家', '經驗', '認證', '專業', '研究', '創辦', '開發']
  const foundKeywords = expertiseKeywords.filter(k => text.includes(k))
  checks.push({
    id: 'expertise-signals', name: 'Expertise signals (E-E-A-T)', weight: 2,
    status: foundKeywords.length >= 3 ? 'pass' : foundKeywords.length >= 1 ? 'warn' : 'fail',
    value: foundKeywords.length > 0 ? `Found: ${foundKeywords.slice(0, 5).join(', ')}` : 'No expertise markers detected',
    recommendation: foundKeywords.length < 3 ? 'Add expertise markers (experience, certifications, credentials) — AI engines trust content from recognized authorities.' : undefined,
  })

  // Consistent entity naming (org name appears multiple times)
  const types = getJsonLdTypes(html)
  const orgBlocks = [...html.matchAll(/"@type"\s*:\s*"Organization"[\s\S]*?"name"\s*:\s*"([^"]+)"/g)]
  const orgName = orgBlocks.length > 0 ? orgBlocks[0][1] : null
  if (orgName) {
    const nameCount = (html.match(new RegExp(orgName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    checks.push({
      id: 'entity-consistency', name: 'Entity name consistency', weight: 2,
      status: nameCount >= 3 ? 'pass' : 'warn',
      value: orgName ? `"${orgName}" appears ${nameCount} times` : 'No organization entity found',
      recommendation: nameCount < 3 ? 'Mention your brand/entity name consistently — AI engines build entity graphs from repeated references.' : undefined,
    })
  } else {
    checks.push({
      id: 'entity-consistency', name: 'Entity name consistency', weight: 2,
      status: 'warn',
      value: 'No Organization schema found to check entity consistency',
      recommendation: 'Add Organization JSON-LD with your brand name for AI entity recognition.',
    })
  }

  return { id: 'entity', name: 'Entity Clarity (E-E-A-T)', checks, score: calcCategoryScore(checks) }
}

export function runAeoScan(html: string, url: string): AeoScanOutput {
  const categories = [
    checkFaqSchema(html),
    checkAnswerReady(html),
    checkStructuredRichness(html),
    checkContentClarity(html),
    checkCitationFriendly(html),
    checkAiCrawlerAccess(html),
    checkLlmsTxt(html),
    checkEntityClarity(html),
  ]

  const scorable = categories.flatMap(cat => cat.checks).filter(c => c.status !== 'info')
  const totalWeight = scorable.reduce((s, c) => s + c.weight, 0)
  const passedWeight = scorable.filter(c => c.status === 'pass').reduce((s, c) => s + c.weight, 0)
  const warnWeight = scorable.filter(c => c.status === 'warn').reduce((s, c) => s + c.weight * 0.5, 0)

  const score = totalWeight > 0 ? Math.round(((passedWeight + warnWeight) / totalWeight) * 100) : 0
  const grade = scoreToGrade(score)

  const failCount = categories.reduce((s, cat) =>
    s + cat.checks.filter(c => c.status === 'fail').length, 0)

  const summary = score >= 90
    ? `Excellent AEO! Your content is highly optimized for AI search engines.`
    : score >= 75
    ? `Good AEO foundation. ${failCount} improvement(s) would boost your AI search visibility.`
    : score >= 60
    ? `Moderate AEO readiness. ${failCount} issue(s) are limiting your visibility in AI-powered search.`
    : `Your content is poorly optimized for AI search engines. ${failCount} critical issue(s) need immediate attention.`

  return { grade, score, summary, categories }
}
