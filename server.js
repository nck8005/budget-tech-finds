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
    'https://budget-tech-finds.firebaseapp.com'
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

  const prompt = `You are a professional tech reviewer and laptop expert. Compare the following two laptops in extreme detail:

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
            content: prompt
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

    let comparison;
    try {
      comparison = JSON.parse(content);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      return res.status(500).json({ error: 'Invalid JSON from Groq API', raw: content });
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
