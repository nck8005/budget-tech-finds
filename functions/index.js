const functions = require('firebase-functions');
const fetch = require('node-fetch');

// ─── Helper: build the full prompt ──────────────────────────────────────────
function buildPrompt(laptop1, laptop2) {
  return `You are a professional tech reviewer and laptop expert. Compare the following two laptops in extreme detail:

Laptop 1: "${laptop1}"
Laptop 2: "${laptop2}"

Provide a comprehensive comparison in the following exact JSON structure (no markdown, pure JSON):

{
  "laptop1": {
    "name": "Full official name of laptop 1",
    "brand": "Brand name",
    "priceRange": "Approximate price range in INR (e.g., ₹45,000 - ₹55,000)",
    "processor": "Processor name and details",
    "processorScore": "Score out of 10",
    "ram": "RAM size and type",
    "ramScore": "Score out of 10",
    "storage": "Storage size and type",
    "storageScore": "Score out of 10",
    "display": "Display size, resolution, panel type, refresh rate",
    "displayScore": "Score out of 10",
    "graphics": "GPU name and VRAM",
    "graphicsScore": "Score out of 10",
    "battery": "Battery capacity and estimated life",
    "batteryScore": "Score out of 10",
    "weight": "Weight in kg",
    "weightScore": "Score out of 10",
    "buildQuality": "Material and build quality description",
    "buildScore": "Score out of 10",
    "pros": ["Pro 1", "Pro 2", "Pro 3", "Pro 4", "Pro 5"],
    "cons": ["Con 1", "Con 2", "Con 3"],
    "bestFor": "Who should buy this laptop",
    "overallScore": "Overall score out of 10",
    "amazonSearchQuery": "optimized search query for Amazon.in to find this laptop"
  },
  "laptop2": {
    "name": "Full official name of laptop 2",
    "brand": "Brand name",
    "priceRange": "Approximate price range in INR (e.g., ₹45,000 - ₹55,000)",
    "processor": "Processor name and details",
    "processorScore": "Score out of 10",
    "ram": "RAM size and type",
    "ramScore": "Score out of 10",
    "storage": "Storage size and type",
    "storageScore": "Score out of 10",
    "display": "Display size, resolution, panel type, refresh rate",
    "displayScore": "Score out of 10",
    "graphics": "GPU name and VRAM",
    "graphicsScore": "Score out of 10",
    "battery": "Battery capacity and estimated life",
    "batteryScore": "Score out of 10",
    "weight": "Weight in kg",
    "weightScore": "Score out of 10",
    "buildQuality": "Material and build quality description",
    "buildScore": "Score out of 10",
    "pros": ["Pro 1", "Pro 2", "Pro 3", "Pro 4", "Pro 5"],
    "cons": ["Con 1", "Con 2", "Con 3"],
    "bestFor": "Who should buy this laptop",
    "overallScore": "Overall score out of 10",
    "amazonSearchQuery": "optimized search query for Amazon.in to find this laptop"
  },
  "verdict": {
    "winner": "Name of the winning laptop or 'Tie'",
    "winnerReason": "2-3 sentences explaining why this laptop wins overall",
    "laptop1Summary": "2-3 sentence summary of laptop 1 strengths",
    "laptop2Summary": "2-3 sentence summary of laptop 2 strengths",
    "recommendation": "Final expert recommendation paragraph (4-5 sentences) helping users decide between the two",
    "valueForMoney": "Which offers better value and why"
  }
}

Be accurate and detailed. Use real specifications. Scores must be numeric strings like "8.5" not "8.5/10".`;
}

// ─── Cloud Function: /api/compare ────────────────────────────────────────────
exports.api = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onRequest(async (req, res) => {

    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Health check
    if (req.path === '/api/health' || req.path === '/health') {
      res.json({ status: 'ok', message: 'Budget Tech Finds API is running on Firebase' });
      return;
    }

    // Only handle POST /api/compare
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { laptop1, laptop2 } = req.body;

    if (!laptop1 || !laptop2) {
      res.status(400).json({ error: 'Both laptop names are required' });
      return;
    }

    // Read GROQ key from process.env (Firebase loads functions/.env automatically)
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      res.status(500).json({ error: 'Groq API key not configured. Add GROQ_API_KEY to functions/.env' });
      return;
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            {
              role: 'system',
              content: 'You are a professional laptop reviewer. Always respond with valid JSON only, no markdown, no code blocks, just raw JSON.'
            },
            {
              role: 'user',
              content: buildPrompt(laptop1, laptop2)
            }
          ],
          temperature: 0.3,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Groq API error:', errorData);
        res.status(response.status).json({
          error: 'Failed to get comparison from Groq API',
          details: errorData.error?.message || 'Unknown error'
        });
        return;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        res.status(500).json({ error: 'Empty response from Groq API' });
        return;
      }

      let comparison;
      try {
        comparison = JSON.parse(content);
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
        res.status(500).json({ error: 'Invalid JSON from Groq API', raw: content });
        return;
      }

      res.json({
        success: true,
        comparison,
        affiliateId: 'budgettec0710-21'
      });

    } catch (err) {
      console.error('Function error:', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });
