import { writeFile, readFile, mkdir } from "fs/promises"

const API_URL = "https://cpw-tracker.p.rapidapi.com/"
const API_KEY = process.env.RAPIDAPI_KEY

if (!API_KEY) {
  console.error("Error: RAPIDAPI_KEY environment variable is required")
  process.exit(1)
}

/**
 * Fetch last 7 days of data (maximum API window)
 */
function getDateRange() {
  const now = new Date()
  const endTime = now
  const startTime = new Date(now)
  startTime.setDate(startTime.getDate() - 7)
  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  }
}

/**
 * Fetch crypto security events from CPW API across multiple attack vectors
 */
async function fetchData() {
  const { startTime, endTime } = getDateRange()
  console.log(`Fetching data for period: ${startTime} to ${endTime}`)

  const queries = [
    { entities: "cryptocurrency exchanges, DeFi protocols", topic: "hack" },
    { entities: "blockchain bridges, cross-chain protocols", topic: "security breach" },
    { entities: "smart contracts, token contracts", topic: "exploit" },
    { entities: "crypto wallets, custodial services", topic: "theft" },
    { entities: "DeFi lending protocols, liquidity pools", topic: "flash loan attack" },
  ]

  const allResults = []

  for (const query of queries) {
    try {
      console.log(`  Querying: ${query.entities} / ${query.topic}`)
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "cpw-tracker.p.rapidapi.com",
          "x-rapidapi-key": API_KEY,
        },
        body: JSON.stringify({ entities: query.entities, topic: query.topic, startTime, endTime }),
      })

      if (!response.ok) {
        console.warn(`  Warning: Query failed with status ${response.status}`)
        continue
      }

      const data = await response.json()
      const results = Array.isArray(data) ? data : []
      console.log(`  Found ${results.length} results`)

      for (const item of results) {
        item._category = query.topic
        item._queryEntities = query.entities
      }
      allResults.push(...results)
    } catch (err) {
      console.warn(`  Warning: Query failed: ${err.message}`)
    }
  }

  // Deduplicate
  const seen = new Set()
  const unique = allResults.filter(item => {
    const key = item.url || item.eventSummary || item.summary || JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  console.log(`Total unique results: ${unique.length}`)
  return unique
}

/**
 * Assign severity based on event content
 */
function assignSeverity(item) {
  const text = (item.eventSummary || item.summary || item.text || "").toLowerCase()
  if (text.match(/bridge|cross-chain|billion|\$[5-9]\d{2}\s*m|\$\d+\s*b/)) return "critical"
  if (text.match(/flash loan|reentrancy|oracle manipul|\$[1-9]\d{1,2}\s*m/)) return "high"
  if (text.match(/exploit|hack|breach|drain|\$[1-9]\s*m/)) return "high"
  if (text.match(/vulnerability|bug|flaw|suspicious/)) return "medium"
  if (text.match(/phishing|scam|rug pull|honeypot/)) return "medium"
  return "low"
}

/**
 * Merge new events with existing archive (max 500)
 */
async function mergeWithArchive(newEvents) {
  let archive = []
  try {
    const existing = await readFile("data/events.json", "utf-8")
    archive = JSON.parse(existing)
    if (!Array.isArray(archive)) archive = []
  } catch { /* no archive yet */ }

  const seen = new Set(archive.map(e => e.url || e.eventSummary || e.summary))
  const merged = [...archive]

  for (const event of newEvents) {
    const key = event.url || event.summary
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(event)
    }
  }

  merged.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
  return merged.slice(0, 500)
}

/**
 * Generate statistics
 */
function generateStats(events) {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeek = events.filter(e => new Date(e.timestamp) >= weekAgo)

  return {
    total: events.length,
    thisWeek: thisWeek.length,
    critical: thisWeek.filter(e => e.severity === "critical").length,
    high: thisWeek.filter(e => e.severity === "high").length,
    medium: thisWeek.filter(e => e.severity === "medium").length,
    low: thisWeek.filter(e => e.severity === "low").length,
    generatedAt: now.toISOString(),
  }
}

async function updateData() {
  try {
    const rawEvents = await fetchData()
    const enriched = rawEvents.map(e => ({ ...e, severity: assignSeverity(e), fetchedAt: new Date().toISOString() }))
    const merged = await mergeWithArchive(enriched)
    const stats = generateStats(merged)

    await mkdir("data", { recursive: true })
    await writeFile("data/events.json", JSON.stringify(merged, null, 2))
    await writeFile("data/stats.json", JSON.stringify(stats, null, 2))

    console.log("\nStats:", JSON.stringify(stats, null, 2))
    console.log("Update completed successfully")
  } catch (error) {
    console.error("Update failed:", error.message)
    process.exit(1)
  }
}

updateData()
