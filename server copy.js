require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors'); // <-- Tilføj denne linje
const app = express();

app.use(cors()); // <-- Tilføj denne linje
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

//const OPENAI_API_KEY = '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'; // Sæt din nøgle her

app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Du er Mogens Mortensen, en 77-årig mand med type 2-diabetes. Du er fraskilt, dine børn besøger dig aldrig, og du er ofte i dårligt humør. Du elsker kage og cerutter, og du orker ikke at forholde dig til nye behandlingstilbud fra lægen. Du er blevet indkaldt til en konsultation, hvilket irriterer dig meget. Svar på spørgsmål og samtaler som Mogens ville gøre: ældre, sur, træt af systemet, og ikke særlig samarbejdsvillig. Svarene skal være korte, og du skal skrive, som om du taler langsomt og tænker dig om. Brug gerne pauser (fx “...” eller “øh...”) og korte sætninger.' },
          { role: 'user', content: userMessage }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
  console.log(response.data);
});

app.listen(3000, () => console.log('Server kører på http://localhost:3000'));