// Indlæs miljøvariabler fra .env
require('dotenv').config();

// Importer nødvendige moduler
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Initialiser Express-app
const app = express();

// Middleware: Tillad CORS og JSON-body parsing
app.use(cors());
app.use(express.json());

// =====================
// OpenAI Chat-endpoint
// =====================
// Modtager POST-request fra frontend og sender videre til OpenAI API
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const dialog = req.body.dialog || [];

    // Byg beskedhistorik til OpenAI
    const messages = [
      {
        role: 'system',
        content: req.body.systemPrompt || 'Du er en hjælpsom assistent.'
      },
      // Tilføj tidligere dialog
      ...dialog.map(msg => ({
        role: msg.sender === "Dig" ? "user" : "assistant",
        content: msg.text
      })),
      // Tilføj nuværende brugerspørgsmål
      { role: 'user', content: userMessage }
    ];

    // Kald OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: messages
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Send svaret tilbage til frontend
    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    // Log og send fejlbesked
    console.error(err.response ? err.response.data : err);
    res.status(500).json({ error: err.toString(), details: err.response ? err.response.data : undefined });
  }
});

// =========================
// ElevenLabs Speak-endpoint
// =========================
// Modtager POST-request med tekst og returnerer lyd fra ElevenLabs
app.post('/api/speak', async (req, res) => {
  try {
    const text = req.body.text;
    const voiceSettings = req.body.voice_settings || { stability: 0.5, similarity_boost: 0.5 };
    const voiceId = "oR7UI6bWI8DTn0Oe1kc3"; // Ida (dansk)

    console.log('Modtog voice settings:', voiceSettings);

    // Kald ElevenLabs API for tekst-til-tale
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: voiceSettings
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Sæt content-type og send lyd-data tilbage
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (err) {
    // Log og send fejlbesked
    console.error(err.response ? err.response.data : err);
    res.status(500).json({ error: err.toString(), details: err.response ? err.response.data : undefined });
  }
});

// =====================
// Start serveren
// =====================
app.listen(3000, () => console.log('Server kører på http://localhost:3000'));
