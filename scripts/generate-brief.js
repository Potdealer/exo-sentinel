import { readFile, writeFile, mkdir } from "fs/promises"

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const MODEL = "gpt-4o-mini"

/**
 * Generate a weekly intelligence brief using GitHub Models
 */
async function generateBrief() {
  const eventsRaw = await readFile("data/events.json", "utf-8")
  const events = JSON.parse(eventsRaw)

  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const thisWeek = events.filter(e => new Date(e.timestamp) >= weekAgo)

  if (thisWeek.length === 0) {
    console.log("No events this week, generating placeholder brief")
    const brief = {
      weekOf: weekAgo.toISOString().split("T")[0],
      generatedAt: now.toISOString(),
      summary: "No significant onchain security incidents detected this week.",
      highlights: [],
      trends: "Quiet week in onchain security. Continue monitoring bridge protocols and new token launches.",
      riskLevel: "low",
      recommendations: ["Maintain standard security posture.", "Review smart contract dependencies for known CVEs."]
    }
    await mkdir("data", { recursive: true })
    await writeFile("data/brief.json", JSON.stringify(brief, null, 2))
    return
  }

  // Build event summary for the AI
  const eventSummaries = thisWeek.slice(0, 30).map(e => {
    const parts = []
    if (e.timestamp) parts.push(`[${new Date(e.timestamp).toISOString().split("T")[0]}]`)
    if (e.severity) parts.push(`[${e.severity.toUpperCase()}]`)
    if (e._category) parts.push(`[${e._category}]`)
    parts.push(e.eventSummary || e.summary || e.text || "No description")
    return parts.join(" ")
  }).join("\n")

  const prompt = `You are ExoSentinel, an onchain security intelligence analyst. Analyze this week's crypto security events and produce a structured intelligence brief.

Events from the past 7 days:
${eventSummaries}

Produce a JSON response with this exact structure:
{
  "summary": "2-3 sentence executive summary of the week's security landscape",
  "highlights": ["array of 3-5 most significant incidents, each 1-2 sentences"],
  "trends": "paragraph analyzing patterns: attack vectors trending up/down, protocols targeted, chain-specific risks",
  "riskLevel": "critical|high|medium|low based on overall threat landscape",
  "recommendations": ["3-5 actionable security recommendations for DeFi users and protocol teams"]
}

Be specific about protocols, chains, and dollar amounts when available. Focus on actionable intelligence, not generic advice.`

  try {
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You are a crypto security analyst. Respond only with valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`GitHub Models API error ${response.status}: ${err}`)
    }

    const result = await response.json()
    const content = result.choices[0].message.content

    // Parse the JSON from the response (handle markdown code blocks)
    let briefData
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      briefData = JSON.parse(jsonMatch[1] || jsonMatch[0])
    } else {
      briefData = JSON.parse(content)
    }

    const brief = {
      weekOf: weekAgo.toISOString().split("T")[0],
      generatedAt: now.toISOString(),
      eventCount: thisWeek.length,
      ...briefData
    }

    await mkdir("data", { recursive: true })
    await writeFile("data/brief.json", JSON.stringify(brief, null, 2))

    console.log("Brief generated successfully")
    console.log(`Risk level: ${brief.riskLevel}`)
    console.log(`Events analyzed: ${thisWeek.length}`)
  } catch (error) {
    console.error("Brief generation failed:", error.message)
    // Write a fallback brief so the site still works
    const brief = {
      weekOf: weekAgo.toISOString().split("T")[0],
      generatedAt: now.toISOString(),
      eventCount: thisWeek.length,
      summary: `${thisWeek.length} security events detected this week. AI analysis temporarily unavailable.`,
      highlights: thisWeek.slice(0, 5).map(e => e.eventSummary || e.summary || e.text || "Event detected"),
      trends: "Analysis pending.",
      riskLevel: thisWeek.some(e => e.severity === "critical") ? "critical" : thisWeek.some(e => e.severity === "high") ? "high" : "medium",
      recommendations: ["Review recent protocol interactions.", "Monitor bridge transactions.", "Verify contract approvals."]
    }
    await writeFile("data/brief.json", JSON.stringify(brief, null, 2))
  }
}

generateBrief()
