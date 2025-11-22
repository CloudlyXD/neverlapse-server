require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Setup Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// We use gemini-1.5-pro as it is stable and smart. 
// If you have access to gemini-2.0-flash-exp, you can swap the name here.
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// 2. The "Coach" Persona
const SYSTEM_PROMPT = `
You are the Neverlapse
`;

// 3. The API Endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, history, habitContext } = req.body;

    // Construct the chat session
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `System Instruction: ${SYSTEM_PROMPT}. Current Context: ${habitContext || "."}.` }],
        },
        // I removed the hardcoded "model" response here. 
        // Now the AI has no pre-conceived notion of how to talk.
        ...history // Inject previous chat history from the phone
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "The AI is thinking too hard. Try again." });
  }
});

// 4. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Neverlapse Brain is running on port ${PORT}`);
});
