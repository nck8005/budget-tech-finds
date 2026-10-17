const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://budget-tech-finds.web.app',
    'https://budget-tech-finds.firebaseapp.com',
    'https://budget-tech-finds.onrender.com'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Budget Tech Finds server is running' });
});

// Proxy Groq API calls
app.post('/api/compare', async (req, res) => {
  const { laptop1, laptop2 } = req.body;

  if (!laptop1 || !laptop2) {
    return res.status(400).json({ error: 'Both laptop names are required' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Groq API key not configured on server. Please set GROQ_API_KEY in .env file.' });
  }

  const prompt = `Compare these two laptops. Reply ONLY with valid compact JSON, no markdown.

Laptop 1: "${laptop1}"
Laptop 2: "${laptop2}"

JSON structure (keep ALL string values short — under 8 words each):
{
  "laptop1": {
    "name": "model name",
    "brand": "brand",
    "priceRange": "₹XX,000-₹XX,000",
    "processor": "chip model",
    "processorScore": "8.0",
    "ram": "8GB DDR4",
    "ramScore": "7.5",
    "storage": "512GB SSD",
    "storageScore": "8.0",
    "display": "15.6in FHD IPS 60Hz",
    "displayScore": "7.5",
    "graphics": "Intel Iris Xe",
    "graphicsScore": "6.0",
    "battery": "41Wh 6hrs",
    "batteryScore": "7.0",
    "weight": "1.8kg",
    "weightScore": "7.5",
    "buildQuality": "plastic build",
    "buildScore": "7.0",
    "pros": ["fast CPU", "good display", "lightweight"],
    "cons": ["weak GPU", "average battery"],
    "bestFor": "students office work",
    "overallScore": "7.5",
    "amazonSearchQuery": "laptop model name"
  },
  "laptop2": {
    "name": "model name",
    "brand": "brand",
    "priceRange": "₹XX,000-₹XX,000",
    "processor": "chip model",
    "processorScore": "8.0",
    "ram": "8GB DDR4",
    "ramScore": "7.5",
    "storage": "512GB SSD",
    "storageScore": "8.0",
    "display": "15.6in FHD IPS 60Hz",
    "displayScore": "7.5",
    "graphics": "Intel Iris Xe",
    "graphicsScore": "6.0",
    "battery": "41Wh 6hrs",
    "batteryScore": "7.0",
    "weight": "1.8kg",
    "weightScore": "7.5",
    "buildQuality": "plastic build",
    "buildScore": "7.0",
    "pros": ["fast CPU", "good display", "lightweight"],
    "cons": ["weak GPU", "average battery"],
    "bestFor": "students office work",
    "overallScore": "7.5",
    "amazonSearchQuery": "laptop model name"
  },
  "verdict": {
    "winner": "laptop name or Tie",
    "winnerReason": "one short sentence",
    "laptop1Summary": "one short sentence",
    "laptop2Summary": "one short sentence",
    "recommendation": "two short sentences",
    "valueForMoney": "one short sentence"
  }
}
Fill in real specs for both laptops. Scores are numeric strings like "8.5".`;

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
            content: 'You are a laptop spec expert. Return only a valid JSON object. No markdown, no code fences, no explanations. Start your response with { and end with }.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 950
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to get comparison from Groq API',
        details: errorData.error?.message || 'Unknown error'
      });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Empty response from Groq API' });
    }

    // Extract JSON robustly — strip markdown fences if present
    let jsonStr = content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const braceStart = jsonStr.indexOf('{');
    const braceEnd = jsonStr.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd !== -1) {
      jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
    }

    let comparison;
    try {
      comparison = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, '\nRaw:', jsonStr.slice(0, 300));
      return res.status(500).json({ error: 'Invalid JSON from Groq API', raw: jsonStr.slice(0, 300) });
    }

    res.json({ 
      success: true, 
      comparison,
      affiliateId: 'budgettec0710-21'
    });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Budget Tech Finds server running at http://localhost:${PORT}`);
  console.log(`📊 Open your browser and visit: http://localhost:${PORT}\n`);
});
