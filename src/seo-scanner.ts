/**
 * Deterministic SEO Scanner — pure HTML parsing, $0 cost.
 * Analyzes fetched HTML for SEO best practices.
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

export interface SeoScanOutput {
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
  const passed = scorable
    .filter(c => c.status === 'pass')
    .reduce((s, c) => s + c.weight, 0)
  const partial = scorable
    .filter(c => c.status === 'warn')
    .reduce((s, c) => s + c.weight * 0.5, 0)
  return Math.round(((passed + partial) / total) * 100)
}

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
  const m = html.match(re)
  if (m) return m[1]
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i')
  const m2 = html.match(re2)
  return m2 ? m2[1] : null
}

function extractTag(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = html.match(re)
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : null
}

function checkMetaTags(html: string, url: string): SeoCategory {
  const checks: SeoCheck[] = []

  // Title
  const title = extractTag(html, 'title')
  if (title) {
    const len = title.length
    if (len >= 30 && len <= 60) {
      checks.push({ id: 'title-length', name: 'Title tag', status: 'pass', value: `${len} chars — "${title.slice(0, 50)}${len > 50 ? '...' : ''}"`, weight: 3 })
    } else if (len > 0) {
      checks.push({ id: 'title-length', name: 'Title tag', status: 'warn', value: `${len} chars (ideal: 30-60)`, recommendation: len < 30 ? 'Title is too short, add more descriptive keywords.' : 'Title is too long, search engines may truncate it.', weight: 3 })
    }
  } else {
    checks.push({ id: 'title-length', name: 'Title tag', status: 'fail', recommendation: 'Add a <title> tag with 30-60 characters.', weight: 3 })
  }

  // Meta description
  const desc = extractMeta(html, 'description')
  if (desc) {
    const len = desc.length
    if (len >= 120 && len <= 160) {
      checks.push({ id: 'meta-desc', name: 'Meta description', status: 'pass', value: `${len} chars`, weight: 3 })
    } else if (len > 0) {
      checks.push({ id: 'meta-desc', name: 'Meta description', status: 'warn', value: `${len} chars (ideal: 120-160)`, recommendation: len < 120 ? 'Description is too short, add more detail.' : 'Description is too long, may be truncated in search results.', weight: 3 })
    }
  } else {
    checks.push({ id: 'meta-desc', name: 'Meta description', status: 'fail', recommendation: 'Add <meta name="description"> with 120-160 characters.', weight: 3 })
  }

  // Canonical
  const hasCanonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html)
  checks.push({
    id: 'canonical', name: 'Canonical URL', weight: 2,
    status: hasCanonical ? 'pass' : 'fail',
    recommendation: hasCanonical ? undefined : 'Add <link rel="canonical"> to prevent duplicate content issues.',
  })

  // Favicon
  const hasFavicon = /<link[^>]+rel=["'](icon|shortcut icon|apple-touch-icon)["'][^>]*>/i.test(html)
  checks.push({
    id: 'favicon', name: 'Favicon', weight: 1,
    status: hasFavicon ? 'pass' : 'warn',
    recommendation: hasFavicon ? undefined : 'Add a favicon for better brand recognition in browser tabs.',
  })

  // Viewport
  const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html)
  checks.push({
    id: 'viewport', name: 'Viewport meta', weight: 2,
    status: hasViewport ? 'pass' : 'fail',
    recommendation: hasViewport ? undefined : 'Add <meta name="viewport"> for mobile responsiveness.',
  })

  // Charset
  const hasCharset = /<meta[^>]+charset/i.test(html)
  checks.push({
    id: 'charset', name: 'Charset declaration', weight: 1,
    status: hasCharset ? 'pass' : 'warn',
    recommendation: hasCharset ? undefined : 'Add <meta charset="UTF-8"> for proper encoding.',
  })

  const score = calcCategoryScore(checks)
  return { id: 'meta', name: 'Meta Tags', checks, score }
}

function checkHeadings(html: string): SeoCategory {
  const checks: SeoCheck[] = []

  const h1Matches = html.match(/<h1[\s>]/gi) || []
  if (h1Matches.length === 1) {
    checks.push({ id: 'h1-count', name: 'Single H1 tag', status: 'pass', value: '1 H1 found', weight: 3 })
  } else if (h1Matches.length === 0) {
    checks.push({ id: 'h1-count', name: 'Single H1 tag', status: 'fail', recommendation: 'Add exactly one <h1> tag as the main heading.', weight: 3 })
  } else {
    checks.push({ id: 'h1-count', name: 'Single H1 tag', status: 'warn', value: `${h1Matches.length} H1 tags found`, recommendation: 'Use only one <h1> per page.', weight: 3 })
  }

  // Heading hierarchy
  const headingLevels = [...html.matchAll(/<h([1-6])[\s>]/gi)].map(m => parseInt(m[1]))
  let hierarchyOk = true
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      hierarchyOk = false
      break
    }
  }
  checks.push({
    id: 'heading-hierarchy', name: 'Heading hierarchy', weight: 2,
    status: hierarchyOk ? 'pass' : 'warn',
    value: hierarchyOk ? 'No skipped levels' : 'Skipped heading levels detected',
    recommendation: hierarchyOk ? undefined : 'Avoid skipping heading levels (e.g. H1 → H3). Use sequential hierarchy.',
  })

  // H2 count
  const h2Matches = html.match(/<h2[\s>]/gi) || []
  checks.push({
    id: 'h2-count', name: 'Content structure (H2)', weight: 2,
    status: h2Matches.length >= 2 ? 'pass' : h2Matches.length === 1 ? 'warn' : 'fail',
    value: `${h2Matches.length} H2 tags`,
    recommendation: h2Matches.length < 2 ? 'Use multiple <h2> tags to structure your content into sections.' : undefined,
  })

  return { id: 'headings', name: 'Headings', checks, score: calcCategoryScore(checks) }
}

function checkImages(html: string): SeoCategory {
  const checks: SeoCheck[] = []

  const imgs = [...html.matchAll(/<img\s[^>]*>/gi)]
  if (imgs.length === 0) {
    checks.push({ id: 'img-alt', name: 'Image alt attributes', status: 'info', value: 'No images found', weight: 2 })
    checks.push({ id: 'img-lazy', name: 'Lazy loading', status: 'info', value: 'No images found', weight: 1 })
  } else {
    const withAlt = imgs.filter(m => /alt=["'][^"']+["']/i.test(m[0]))
    const altPct = Math.round((withAlt.length / imgs.length) * 100)
    checks.push({
      id: 'img-alt', name: 'Image alt attributes', weight: 2,
      status: altPct >= 90 ? 'pass' : altPct >= 50 ? 'warn' : 'fail',
      value: `${withAlt.length}/${imgs.length} images have alt text (${altPct}%)`,
      recommendation: altPct < 90 ? 'Add descriptive alt text to all images for accessibility and SEO.' : undefined,
    })

    const withLazy = imgs.filter(m => /loading=["']lazy["']/i.test(m[0]))
    const lazyPct = Math.round((withLazy.length / imgs.length) * 100)
    checks.push({
      id: 'img-lazy', name: 'Lazy loading', weight: 1,
      status: lazyPct >= 50 ? 'pass' : lazyPct > 0 ? 'warn' : 'info',
      value: `${withLazy.length}/${imgs.length} images use lazy loading`,
      recommendation: lazyPct < 50 ? 'Add loading="lazy" to below-fold images for faster page load.' : undefined,
    })
  }

  return { id: 'images', name: 'Images', checks, score: calcCategoryScore(checks) }
}

function checkLinks(html: string, url: string): SeoCategory {
  const checks: SeoCheck[] = []
  let hostname = ''
  try { hostname = new URL(url).hostname } catch {}

  const links = [...html.matchAll(/<a\s[^>]*href=["']([^"']*)["'][^>]*>/gi)]
  const internalLinks = links.filter(m => {
    const href = m[1]
    return href.startsWith('/') || href.includes(hostname)
  })
  const externalLinks = links.filter(m => {
    const href = m[1]
    return href.startsWith('http') && !href.includes(hostname)
  })

  checks.push({
    id: 'internal-links', name: 'Internal links', weight: 2,
    status: internalLinks.length >= 3 ? 'pass' : internalLinks.length > 0 ? 'warn' : 'fail',
    value: `${internalLinks.length} internal links`,
    recommendation: internalLinks.length < 3 ? 'Add more internal links to improve site navigation and SEO.' : undefined,
  })

  // External links rel
  if (externalLinks.length > 0) {
    const withRel = externalLinks.filter(m => /rel=["'][^"']*(noopener|noreferrer)[^"']*["']/i.test(m[0]))
    checks.push({
      id: 'external-rel', name: 'External link security', weight: 1,
      status: withRel.length >= externalLinks.length * 0.8 ? 'pass' : 'warn',
      value: `${withRel.length}/${externalLinks.length} have rel="noopener"`,
      recommendation: withRel.length < externalLinks.length ? 'Add rel="noopener noreferrer" to external links.' : undefined,
    })
  }

  // javascript:void links
  const jsLinks = links.filter(m => m[1].startsWith('javascript:'))
  checks.push({
    id: 'js-links', name: 'No javascript: links', weight: 1,
    status: jsLinks.length === 0 ? 'pass' : 'fail',
    value: jsLinks.length === 0 ? 'None found' : `${jsLinks.length} javascript: links`,
    recommendation: jsLinks.length > 0 ? 'Replace javascript: links with proper href or button elements.' : undefined,
  })

  return { id: 'links', name: 'Links', checks, score: calcCategoryScore(checks) }
}

function checkSocialTags(html: string): SeoCategory {
  const checks: SeoCheck[] = []

  const ogTitle = extractMeta(html, 'og:title')
  checks.push({
    id: 'og-title', name: 'og:title', weight: 2,
    status: ogTitle ? 'pass' : 'fail',
    value: ogTitle ? `"${ogTitle.slice(0, 50)}"` : undefined,
    recommendation: ogTitle ? undefined : 'Add <meta property="og:title"> for social media sharing.',
  })

  const ogDesc = extractMeta(html, 'og:description')
  checks.push({
    id: 'og-desc', name: 'og:description', weight: 2,
    status: ogDesc ? 'pass' : 'fail',
    recommendation: ogDesc ? undefined : 'Add <meta property="og:description"> for social previews.',
  })

  const ogImage = extractMeta(html, 'og:image')
  checks.push({
    id: 'og-image', name: 'og:image', weight: 2,
    status: ogImage ? 'pass' : 'fail',
    value: ogImage ? 'Present' : undefined,
    recommendation: ogImage ? undefined : 'Add <meta property="og:image"> — pages with images get 2x more shares.',
  })

  const ogUrl = extractMeta(html, 'og:url')
  checks.push({
    id: 'og-url', name: 'og:url', weight: 1,
    status: ogUrl ? 'pass' : 'warn',
    recommendation: ogUrl ? undefined : 'Add <meta property="og:url"> for canonical social sharing.',
  })

  const twitterCard = extractMeta(html, 'twitter:card')
  checks.push({
    id: 'twitter-card', name: 'Twitter card', weight: 1,
    status: twitterCard ? 'pass' : 'warn',
    value: twitterCard || undefined,
    recommendation: twitterCard ? undefined : 'Add <meta name="twitter:card" content="summary_large_image"> for Twitter/X sharing.',
  })

  return { id: 'social', name: 'Social / Open Graph', checks, score: calcCategoryScore(checks) }
}

function checkTechnical(html: string, url: string): SeoCategory {
  const checks: SeoCheck[] = []

  // HTTPS
  const isHttps = url.startsWith('https://')
  checks.push({
    id: 'https', name: 'HTTPS', weight: 3,
    status: isHttps ? 'pass' : 'fail',
    recommendation: isHttps ? undefined : 'Switch to HTTPS — required for SEO and security.',
  })

  // Meta robots
  const robotsMeta = extractMeta(html, 'robots')
  const isIndexable = !robotsMeta || (!robotsMeta.includes('noindex') && !robotsMeta.includes('none'))
  checks.push({
    id: 'indexable', name: 'Page is indexable', weight: 2,
    status: isIndexable ? 'pass' : 'warn',
    value: robotsMeta || 'No robots meta (indexable by default)',
    recommendation: isIndexable ? undefined : 'Page has noindex directive — it will not appear in search results.',
  })

  // Sitemap reference
  const hasSitemapLink = /<link[^>]+href=["'][^"']*sitemap[^"']*["']/i.test(html) ||
    html.includes('/sitemap.xml')
  checks.push({
    id: 'sitemap', name: 'Sitemap reference', weight: 1,
    status: hasSitemapLink ? 'pass' : 'info',
    recommendation: hasSitemapLink ? undefined : 'Consider linking to your sitemap.xml for better crawlability.',
  })

  // Hreflang
  const hasHreflang = /<link[^>]+hreflang/i.test(html)
  checks.push({
    id: 'hreflang', name: 'Hreflang tags', weight: 1,
    status: hasHreflang ? 'pass' : 'info',
    value: hasHreflang ? 'Multi-language support detected' : 'Not found (optional, for multilingual sites)',
  })

  // Language attribute
  const hasLang = /<html[^>]+lang=["']/i.test(html)
  checks.push({
    id: 'html-lang', name: 'HTML lang attribute', weight: 2,
    status: hasLang ? 'pass' : 'fail',
    recommendation: hasLang ? undefined : 'Add lang attribute to <html> tag for accessibility and SEO.',
  })

  return { id: 'technical', name: 'Technical', checks, score: calcCategoryScore(checks) }
}

function checkStructuredData(html: string): SeoCategory {
  const checks: SeoCheck[] = []

  // JSON-LD
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  checks.push({
    id: 'jsonld', name: 'JSON-LD structured data', weight: 3,
    status: jsonLdMatches.length > 0 ? 'pass' : 'fail',
    value: jsonLdMatches.length > 0 ? `${jsonLdMatches.length} JSON-LD block(s)` : undefined,
    recommendation: jsonLdMatches.length === 0 ? 'Add JSON-LD structured data for rich search results.' : undefined,
  })

  // Schema.org types
  if (jsonLdMatches.length > 0) {
    const allJsonLd = jsonLdMatches.map(m => m[1]).join(' ')
    const types: string[] = []
    const typeMatches = allJsonLd.matchAll(/"@type"\s*:\s*"([^"]+)"/g)
    for (const m of typeMatches) types.push(m[1])

    checks.push({
      id: 'schema-types', name: 'Schema.org types', weight: 2,
      status: types.length > 0 ? 'pass' : 'warn',
      value: types.length > 0 ? types.join(', ') : 'No @type detected',
    })

    // Validate JSON
    let allValid = true
    for (const m of jsonLdMatches) {
      try { JSON.parse(m[1]) } catch { allValid = false }
    }
    checks.push({
      id: 'jsonld-valid', name: 'JSON-LD is valid', weight: 2,
      status: allValid ? 'pass' : 'fail',
      recommendation: allValid ? undefined : 'Fix JSON-LD syntax errors for proper indexing.',
    })
  } else {
    checks.push({ id: 'schema-types', name: 'Schema.org types', status: 'fail', weight: 2, recommendation: 'Add schema.org types like Article, Organization, or WebPage.' })
  }

  return { id: 'structured', name: 'Structured Data', checks, score: calcCategoryScore(checks) }
}

function checkPerformance(html: string): SeoCategory {
  const checks: SeoCheck[] = []

  // Script count
  const scripts = html.match(/<script[\s>]/gi) || []
  const scriptCount = scripts.length
  checks.push({
    id: 'script-count', name: 'JavaScript files', weight: 2,
    status: scriptCount <= 10 ? 'pass' : scriptCount <= 20 ? 'warn' : 'fail',
    value: `${scriptCount} <script> tags`,
    recommendation: scriptCount > 10 ? 'Reduce script count — bundle or defer non-critical scripts.' : undefined,
  })

  // Stylesheet count
  const stylesheets = html.match(/<link[^>]+rel=["']stylesheet["']/gi) || []
  checks.push({
    id: 'css-count', name: 'CSS files', weight: 1,
    status: stylesheets.length <= 5 ? 'pass' : 'warn',
    value: `${stylesheets.length} stylesheets`,
    recommendation: stylesheets.length > 5 ? 'Consolidate CSS files to reduce HTTP requests.' : undefined,
  })

  // Inline style size
  const inlineStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
  const totalInline = inlineStyles.reduce((s, m) => s + m[1].length, 0)
  checks.push({
    id: 'inline-css', name: 'Inline CSS size', weight: 1,
    status: totalInline < 5000 ? 'pass' : totalInline < 15000 ? 'warn' : 'fail',
    value: `${Math.round(totalInline / 1024 * 10) / 10} KB inline CSS`,
    recommendation: totalInline >= 5000 ? 'Move large inline styles to external CSS files.' : undefined,
  })

  return { id: 'performance', name: 'Performance Hints', checks, score: calcCategoryScore(checks) }
}

export function runSeoScan(html: string, url: string): SeoScanOutput {
  const categories = [
    checkMetaTags(html, url),
    checkHeadings(html),
    checkImages(html),
    checkLinks(html, url),
    checkSocialTags(html),
    checkTechnical(html, url),
    checkStructuredData(html),
    checkPerformance(html),
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
    ? `Excellent SEO! Your site follows best practices with only minor areas for improvement.`
    : score >= 75
    ? `Good SEO fundamentals. ${failCount} issue(s) should be addressed for better rankings.`
    : score >= 60
    ? `Decent SEO foundation, but ${failCount} issue(s) need attention to compete effectively.`
    : `Significant SEO issues detected. ${failCount} critical problem(s) are hurting your search visibility.`

  return { grade, score, summary, categories }
}
