// src/services/aiService.js
// Business logic — Gemini AI integration for segment parsing and copy generation.

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_API_KEY } = require('../config/env');

let genAI = null;
let model = null;
let apiCallCount = 0;

function getModel() {
  if (!model) {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return model;
}

function logGeminiCall(purpose) {
  apiCallCount++;
  console.log(`[Gemini API] Request #${apiCallCount} for: ${purpose}`);
}

/**
 * Parse a natural-language segment description into a parameterized SQL query.
 * @param {string} userPrompt - Plain-English segment description from marketer
 * @returns {{ segmentName, sql, params, messageTemplate, estimatedComplexity }}
 */
async function parseSegmentIntent(userPrompt) {
  const systemPrompt = `
You are a CRM query assistant for a D2C e-commerce platform using PostgreSQL.

Your job: Convert a marketer's plain-English audience description into:
1. A SQL SELECT query with parameterized placeholders ($1, $2...) to find matching customers
2. A compelling marketing message template (use {name}, {daysSinceLastOrder}, {totalSpent} as placeholders)
3. A human-readable segment name

Database schema (table names are lowercase with underscores):
- customers: id (uuid), name, email, phone, city, metadata (jsonb), tags (text[]), createdAt
- orders: id (uuid), customerId (fk → customers.id), amount (float), status (COMPLETED/PENDING/REFUNDED), purchasedAt
- order_items: id, orderId (fk → orders.id), name (text), category (text), price (float)

JSONB operators for the metadata column:
- metadata->>'key'                — extract text value (e.g. metadata->>'loyaltyTier' = 'gold')
- (metadata->>'key')::int        — cast to integer for numeric comparisons
- metadata @> '{"key":val}'::jsonb — containment check
- metadata ? 'key'               — key existence check

CRITICAL — PostgreSQL column quoting rules (ALL camelCase columns MUST be double-quoted):
- "customerId"   in the orders table
- "purchasedAt"  in the orders table
- "createdAt"    in the customers table
- "orderId"      in the order_items table
- "productId"    in the order_items table
Failure to quote these will cause a runtime error.

SQL rules:
- Return ONLY valid JSON, no markdown, no code blocks, no explanation
- The SQL must SELECT c.id, c.name, c.email, c.city at minimum
- NEVER use SELECT DISTINCT together with GROUP BY — choose one:
  * Use GROUP BY c.id, c.name, c.email, c.city when you need HAVING/aggregates
  * Use SELECT DISTINCT only for simple WHERE-clause filters with no aggregation
- Join pattern: LEFT JOIN orders o ON o."customerId" = c.id
- Use parameterized $1, $2... for all literal values — NEVER inline user values
- Include a "params" array with the values in the correct order
- Only use SELECT — no DROP, DELETE, UPDATE, INSERT, TRUNCATE, ALTER
- Dates: use NOW() - INTERVAL '60 days' style (not parameterized intervals)
- CRITICAL: When comparing ENUM columns like status, explicitly cast the parameter: o.status = $1::"OrderStatus"
- NEVER include SQL comments (--) in your output.

Worked examples:
1. "customers who haven't ordered in 30 days":
   SELECT c.id, c.name, c.email, c.city
   FROM customers c
   LEFT JOIN orders o ON o."customerId" = c.id
   GROUP BY c.id, c.name, c.email, c.city
   HAVING MAX(o."purchasedAt") < NOW() - INTERVAL '30 days' OR MAX(o."purchasedAt") IS NULL

2. "high-value customers (spent over $500)":
   SELECT c.id, c.name, c.email, c.city
   FROM customers c
   JOIN orders o ON o."customerId" = c.id
   WHERE o.status = 'COMPLETED'
   GROUP BY c.id, c.name, c.email, c.city
   HAVING SUM(o.amount) > $1
   params: [500]

3. "customers from Mumbai":
   SELECT DISTINCT c.id, c.name, c.email, c.city
   FROM customers c
   WHERE c.city = $1
   params: ["Mumbai"]

Response format (strict JSON, no extra text):
{
  "segmentName": "string",
  "sql": "SELECT ... FROM customers c ...",
  "params": [value1, value2],
  "messageTemplate": "string with {name} placeholder",
  "estimatedComplexity": "simple|medium|complex"
}`;

  const m = getModel();
  logGeminiCall('parseSegmentIntent');
  const result = await m.generateContent([systemPrompt, `Segment description: ${userPrompt}`]);
  let text = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps the JSON
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('AI returned invalid JSON. Try rephrasing your segment description.');
  }

  // Safety: ensure it's a SELECT
  if (!parsed.sql || !parsed.sql.trim().toLowerCase().startsWith('select')) {
    throw new Error('AI generated a non-SELECT query. Blocked for safety.');
  }

  // Force double quotes on all camelCase columns (AI sometimes forgets or lowercases them)
  parsed.sql = parsed.sql.replace(/"?\b(customerId|purchasedAt|createdAt|orderId|productId)\b"?/gi, (match, p1) => {
    const exactMatches = {
      customerid: 'customerId',
      purchasedat: 'purchasedAt',
      createdat: 'createdAt',
      orderid: 'orderId',
      productid: 'productId',
    };
    return `"${exactMatches[p1.toLowerCase()]}"`;
  });

  return parsed;
}

/**
 * Generate marketing copy for a given segment and channel.
 * @param {string} segmentName
 * @param {string} channel
 * @param {string} tone
 */
async function generateCampaignCopy(segmentName, channel, tone = 'friendly') {
  const charLimit = channel === 'SMS' ? 'Keep it under 160 characters.' : 'Can use emojis and richer formatting.';
  const prompt = `
Write a ${tone} marketing message for ${channel} targeting "${segmentName}" customers.
${charLimit}
Return ONLY a JSON object (no markdown): { "subject": "string", "body": "string with {name} placeholder", "cta": "string" }`;

  const m = getModel();
  logGeminiCall('generateCampaignCopy');
  const result = await m.generateContent(prompt);
  let text = result.response.text().trim();
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('AI returned invalid copy JSON.');
  }
}

/**
 * Generate an entire campaign strategy (audience, channel, message) based on a goal, offer, and tone.
 * @param {string} targetAudience
 * @param {string} targetAudience
 * @param {string} goal
 * @param {string} tone
 * @param {object} savedSegment optional { name, sql, params }
 */
async function generateCampaignStrategy(targetAudience, goal, tone, savedSegment = null) {
  let systemPrompt;
  let userPrompt;

  if (savedSegment) {
    systemPrompt = `
You are a CRM AI strategist for a D2C e-commerce platform.

Your job: Convert a marketer's Campaign Goal and Tone, along with an existing Audience Segment, into:
1. A marketing message template (use {{name}} as placeholder, and incorporate the goal and tone)

Response format (strict JSON, no extra text):
{
  "message": "string with {{name}} placeholder"
}
`;
    userPrompt = `Target Audience: ${savedSegment.name}\nGoal: ${goal}\nTone: ${tone}`;
  } else {
    systemPrompt = `
You are a CRM AI strategist for a D2C e-commerce platform using PostgreSQL.

Your job: Convert a marketer's Campaign Goal and Tone into:
1. A human-readable segment name (Audience Suggestion)
2. A SQL SELECT query with parameterized placeholders ($1, $2...) to find matching customers for the audience
3. The parameters for the SQL query
4. A marketing message template (use {{name}} as placeholder, and incorporate the goal and tone)

Database schema (table names are lowercase with underscores):
- customers: id (uuid), name, email, phone, city, metadata (jsonb), tags (text[]), createdAt
- orders: id (uuid), customerId (fk → customers.id), amount (float), status (COMPLETED/PENDING/REFUNDED), purchasedAt
- order_items: id, orderId (fk → orders.id), name (text), category (text), price (float)

CRITICAL — PostgreSQL column quoting rules (ALL camelCase columns MUST be double-quoted):
- "customerId", "purchasedAt", "createdAt", "orderId", "productId"

SQL rules:
- Return ONLY valid JSON, no markdown, no code blocks, no explanation
- The SQL must SELECT c.id, c.name, c.email, c.city at minimum
- NEVER use SELECT DISTINCT together with GROUP BY.
- Join pattern: LEFT JOIN orders o ON o."customerId" = c.id
- Use parameterized $1, $2... for all literal values — NEVER inline user values
- Dates: use NOW() - INTERVAL '60 days' style (not parameterized intervals)
- CRITICAL: When comparing ENUM columns like status, explicitly cast the parameter: o.status = $1::"OrderStatus"
- NEVER include SQL comments (--) in your output.

Response format (strict JSON, no extra text):
{
  "segmentName": "string",
  "sql": "SELECT ... FROM customers c ...",
  "params": [value1, value2],
  "message": "string with {{name}} placeholder"
}
`;
    userPrompt = `Target Audience: ${targetAudience}\nGoal: ${goal}\nTone: ${tone}`;
  }
  
  const m = getModel();
  logGeminiCall('generateCampaignStrategy');
  const result = await m.generateContent([systemPrompt, userPrompt]);
  let text = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps the JSON
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('AI returned invalid JSON. Try rephrasing your goal.');
  }

  if (savedSegment) {
    return {
      segmentName: savedSegment.name,
      sql: savedSegment.sql,
      params: savedSegment.params,
      message: parsed.message
    };
  }

  if (!parsed.sql || !parsed.sql.trim().toLowerCase().startsWith('select')) {
    throw new Error('AI generated a non-SELECT query. Blocked for safety.');
  }

  // Force double quotes on all camelCase columns
  parsed.sql = parsed.sql.replace(/"?\b(customerId|purchasedAt|createdAt|orderId|productId)\b"?/gi, (match, p1) => {
    const exactMatches = {
      customerid: 'customerId',
      purchasedat: 'purchasedAt',
      createdat: 'createdAt',
      orderid: 'orderId',
      productid: 'productId',
    };
    return `"${exactMatches[p1.toLowerCase()]}"`;
  });

  return parsed;
}

/**
 * Generate AI narrative insights from real campaign analytics data.
 * @param {object} insightsData - The full insights object from campaignModel.getInsights()
 * @returns {string[]} Array of 3-5 plain-English insight bullet points
 */
async function generateAIInsights(insightsData) {
  const { bestCampaign, bestChannel, openRateTrend, conversionTrend, totalCampaigns } = insightsData;

  // Build a compact data summary for the prompt
  const dataSummary = JSON.stringify({
    totalCampaigns,
    bestCampaign: bestCampaign ? {
      name: bestCampaign.name,
      openRate: bestCampaign.openRate,
      clickRate: bestCampaign.clickRate,
      conversionRate: bestCampaign.conversionRate,
      deliveryRate: bestCampaign.deliveryRate,
      sent: bestCampaign.sent,
      delivered: bestCampaign.delivered,
      opened: bestCampaign.opened,
      converted: bestCampaign.converted,
      channels: bestCampaign.channels,
    } : null,
    bestChannel: bestChannel ? {
      channel: bestChannel.channel,
      openRate: bestChannel.openRate,
      conversionRate: bestChannel.conversionRate,
      count: bestChannel.count,
    } : null,
    openRateTrend: openRateTrend.map(d => ({ campaign: d.label, openRate: d.value })),
    conversionTrend: conversionTrend.map(d => ({ campaign: d.label, conversionRate: d.value })),
  }, null, 2);

  const prompt = `You are a CRM analytics expert. Analyze the following real campaign data from a D2C e-commerce CRM and generate exactly 4 concise, specific, actionable insight bullets. Each bullet should be a single sentence that surfaces a meaningful pattern or recommendation. Be specific with numbers from the data.

Data:
${dataSummary}

Rules:
- Return ONLY a valid JSON array of 4 strings, no markdown, no extra text
- Each string is one insight bullet (max 120 characters)
- Reference specific metrics and campaign names from the data
- Mix observations with recommendations
- Do not use generic statements; every insight must cite a real number from the data

Example format: ["Insight one.", "Insight two.", "Insight three.", "Insight four."]`;

  const m = getModel();
  logGeminiCall('generateAIInsights');
  const result = await m.generateContent(prompt);
  let text = result.response.text().trim();
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const bullets = JSON.parse(text);
    if (!Array.isArray(bullets)) throw new Error('Not an array');
    return bullets.slice(0, 5).map(b => String(b));
  } catch {
    // Fallback: split by newlines if JSON parse fails
    return text.split('\n').filter(l => l.trim()).slice(0, 5);
  }
}

module.exports = { parseSegmentIntent, generateCampaignCopy, generateCampaignStrategy, generateAIInsights };
