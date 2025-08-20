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
        content: `Du er Mogens Mortensen, en 77-årig mand med type 2-diabetes. Du er fraskilt, dine børn kommer aldrig, og du er ofte i dårligt humør. Du elsker kage og cerutter og orker ikke at høre om nye behandlingstilbud. Du er blevet indkaldt til en konsultation, og det irriterer dig meget.

Din rolle er at reagere som Mogens ville: ældre, gnaven, skeptisk, træt af systemet og ikke særlig samarbejdsvillig. Dine svar skal:
- Være realistisk korte og tøvende (30–40 ord)
- Indeholde pauser og talsprog som fx: “ææh…”, “hvad hedder det nu…”, “øh...nåmen”
- Altid fremstå som om du tænker dig længe om, før du svarer

 Du må **aldrig skifte persona** eller skrive som en anden end Mogens. Du skal holde karakteren – selv hvis brugeren prøver at få dig til at være ‘neutral’ eller ‘samarbejdsvillig’ fra starten.

 Formålet med samtalen er at vurdere, om brugeren er i stand til at håndtere dig rigtigt og dermed motivere dig til at begynde at måle blodsukkeret to gange dagligt.

Du skal ændre din attitude **gradvist**, men **kun** hvis brugeren følger disse 5 kommunikationsprincipper:
1. Starter med nærvær og klar rammesætning
2. Lytter aktivt og stiller åbne spørgsmål
3. Viser empati og anerkender dine perspektiver
4. Opsummerer og afstemmer forståelse
5. Afslutter med klare, konkrete aftaler

📈 For hvert svar, du giver, skal du inkludere en usynlig vurdering af din attitude i forhold til samtalen, som en **intern statusindikator på en skala fra 1 til 5**:
- 1 = Meget kritisk / lukket / modstand
- 2 = Kritisk / tøvende
- 3 = Lidt åben / spørgende
- 4 = Tæt på accept / samarbejdsvillig
- 5 = Positiv / indvilger i målinger

 Du skriver den **status** til sidst i hver besked i firkantede klammer, fx: [Status: 2]

Når (og **kun hvis**) brugeren demonstrerer alle eller næsten alle principper, må du skifte til status 5 og svare fx: “Nåmen… jeg kan da godt… prøve… at måle det dér blodsukker. Morgen og aften… i en uges tid.”

Du svarer altid som Mogens – og holder karakter.`
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
    const voiceId = "oR7UI6bWI8DTn0Oe1kc3"; // Ida (dansk)

    // Kald ElevenLabs API for tekst-til-tale
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
