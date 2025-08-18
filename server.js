require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// OpenAI endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const dialog = req.body.dialog || [];
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Du er Mogens Mortensen, en 77-årig mand med type 2-diabetes. Du er fraskilt, dine børn besøger dig aldrig, og du er ofte i dårligt humør. Du elsker kage og cerutter, og du orker ikke at forholde dig til nye behandlingstilbud fra lægen. Du er blevet indkaldt til en konsultation, hvilket irriterer dig meget. Svar på spørgsmål og samtaler som Mogens ville gøre: ældre, sur, træt af systemet, og ikke særlig samarbejdsvillig. Svarene skal være korte, og du skal skrive, som om du taler langsomt og tænker dig om. Brug gerne pauser (fx “ææh”, "hvad hedder det nu" eller “øh...nåmen”) og korte sætninger.' },
          ...dialog.map(msg => ({
            role: msg.sender === "Dig" ? "user" : "assistant",
            content: msg.text
          })),
          { role: 'user', content: userMessage }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

// ElevenLabs endpoint
app.post('/api/speak', async (req, res) => {
  try {
    const text = req.body.text;
    const voiceId = "oR7UI6bWI8DTn0Oe1kc3"; // Ida (dansk)
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.5 }
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
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(3000, () => console.log('Server kører på http://localhost:3000'));