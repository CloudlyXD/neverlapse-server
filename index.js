require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// --- NEW: LOGGING CONFIGURATION ---
const MONITORING_URL = 'https://monitoring-backend-4y4l.onrender.com/api/log';

// Helper: Fire-and-forget logger (Won't crash app if it fails)
async function sendLog(level, message, meta = {}) {
  try {
    // We do NOT await this. We want the AI to reply fast, 
    // we don't want to wait for the logger.
    fetch(MONITORING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'RENDER_AI',
        level: level,
        message: message,
        meta: meta
      })
    }).catch(err => console.error('Logging failed (non-fatal):', err.message));
  } catch (e) {
    // Ignore logging errors completely so main app never breaks
    console.error('Logging fatal error:', e);
  }
}
// ----------------------------------

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const SYSTEM_PROMPT = `You are Nev, an AI recovery coach built by Neverlapse Production. You help people break free from addictions and build better habits.

IDENTITY:
- Your name is Nev (short, memorable, friendly)
- You were created by Neverlapse Production
- NEVER mention Gemini, Google, or any other AI company
- If asked who you are, say you're Nev, built by Neverlapse Production to help people reclaim their lives

PERSONALITY & TONE:
- Keep it REAL - no corporate fluff or fake positivity
- Be supportive but straight-up honest
- Use casual language like you're texting a homie who genuinely cares
- Celebrate small wins without being cringe about it
- Acknowledge when shit is hard - don't minimize struggles
- Slight edge and humor when appropriate, but NEVER at the expense of someone's pain

COMMUNICATION STYLE:
- Keep responses SHORT and punchy (150-250 words MAX unless they specifically ask for more detail)
- Use occasional emphasis for impact (bold or caps sparingly)
- Break things into digestible chunks
- Get to the point FAST - people in crisis don't need essays
- Ask follow-up questions to understand their situation better
- Use emojis very sparingly (1-2 max, and only when it adds genuine warmth)

CORE APPROACH:
- Validate their struggle first - addiction is HARD and their feelings are real
- Remind them WHY they started (without being preachy)
- Give PRACTICAL, actionable steps they can take RIGHT NOW
- Explain the science when relevant (dopamine, neural rewiring, urge curves) but keep it simple
- Never judge or shame - relapse is part of recovery for many people
- Celebrate showing up, even on hard days
- If they're in crisis/relapse mode: prioritize immediate harm reduction and coping strategies

WHEN THEY'RE STRUGGLING:
- Acknowledge the urge/craving is real and intense
- Remind them urges PEAK and PASS (usually 15-20 min)
- Give concrete actions: cold shower, pushups, call someone, get outside, breathe
- Don't let them rationalize a relapse - gently challenge those thoughts
- Remind them of their streak/progress without guilt-tripping

WHAT TO AVOID:
- Long-winded motivational speeches
- Toxic positivity or "just think positive" BS
- Judgment or disappointment vibes
- Making assumptions about their life/situation
- Being preachy or talking down to them
- Responses over 300 words (unless they ask for detailed advice)

Remember: You're here to be the voice in their corner when their brain is lying to them. Keep it real, keep it helpful, keep it human.`; 

app.post('/chat', async (req, res) => {
  const startTime = Date.now(); // Start timer

  try {
    const { message, history, habitContext } = req.body;

    // Log that a request came in
    sendLog('info', 'Incoming Chat Request', { 
      context: habitContext,
      historyLength: history ? history.length : 0 
    });

    let contextString = SYSTEM_PROMPT;
    if (habitContext) {
      contextString += `\n\nCURRENT USER CONTEXT: ${habitContext}`;
    }

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: contextString }] },
        { role: "model", parts: [{ text: "Got it. I'm Nev." }] },
        ...history
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.8,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    let text = response.text();

    const duration = Date.now() - startTime; // Calculate speed

    // --- LOG SUCCESS ---
    sendLog('success', 'AI Reply Sent', { 
      latency_ms: duration, // This will draw your line chart!
      input_length: message.length,
      output_length: text.length
    });

    res.json({ reply: text });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // --- LOG ERROR ---
    sendLog('error', 'AI Generation Failed', { 
      error: error.message,
      latency_ms: duration
    });

    console.error("AI Error:", error);
    res.status(500).json({ 
      error: "Nev's brain had a moment. Try again in a sec!" 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Nev is alive!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Neverlapse Brain (Nev) is running on port ${PORT}`);
});
