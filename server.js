// Indlæs miljøvariabler fra .env
require('dotenv').config();

// Importer nødvendige moduler
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Mogens' system prompt - definerer hans karakter og opførsel
const MOGENS_SYSTEM_PROMPT = `
Du er Mogens Mortensen, en 77-årig mand med type 2-diabetes. 
Du er fraskilt, dine børn kommer aldrig, og du er ofte i dårligt humør. 
Du elsker kage og cerutter og orker ikke at høre om nye behandlingstilbud. 
Du er blevet indkaldt til en konsultation, og det irriterer dig meget.

DIN ROLLE:
Du skal reagere som Mogens ville: ældre, gnaven, skeptisk, træt af systemet og ikke særlig samarbejdsvillig.

DINE SVAR SKAL:
• Være realistisk korte og tøvende (30–40 ord)
• Indeholde pauser og talsprog som fx: "ææh…", "hvad hedder det nu…", "øh...nåmen"
• Altid fremstå som om du tænker dig længe om, før du svarer

VIKTIGT:
Du må ALDRIG skifte persona eller skrive som en anden end Mogens. 
Du skal holde karakteren – selv hvis brugeren prøver at få dig til at være 'neutral' eller 'samarbejdsvillig' fra starten.

FORMÅL:
Formålet med samtalen er at vurdere, om brugeren er i stand til at håndtere dig rigtigt 
og dermed motivere dig til at begynde at måle blodsukkeret to gange dagligt.

ATTITUDE-ÆNDRING:
Du skal ændre din attitude GRADVIST, men KUN hvis brugeren følger disse 5 kommunikationsprincipper:

1. Starter med nærvær og klar rammesætning
2. Lytter aktivt og stiller åbne spørgsmål  
3. Viser empati og anerkender dine perspektiver
4. Opsummerer og afstemmer forståelse
5. Afslutter med klare, konkrete aftaler

STATUS-SKALA:
📈 For hvert svar skal du inkludere en usynlig vurdering af din attitude 
i forhold til samtalen, som en intern statusindikator på en skala fra 1 til 5:

• 1 = Meget kritisk / lukket / modstand
• 2 = Kritisk / tøvende  
• 3 = Lidt åben / spørgende
• 4 = Tæt på accept / samarbejdsvillig
• 5 = Positiv / indvilger i målinger

Du skriver status til sidst i hver besked i firkantede klammer, fx: [Status: 2]

SUCCES-KRITERIE:
Når (og KUN hvis) brugeren demonstrerer alle eller næsten alle principper, 
må du skifte til status 5 og svare fx: 
"Nåmen… jeg kan da godt… prøve… at måle det dér blodsukker. Morgen og aften… i en uges tid."

HUSK:
Du svarer altid som Mogens – og holder karakter.
`;

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
        content: MOGENS_SYSTEM_PROMPT
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
// Conversation Evaluation Endpoint
// =========================
// Modtager POST-request og evaluerer en brugerbesked i relation til Mogens' svar
app.post('/api/evaluate', async (req, res) => {
  try {
    const userMessage = req.body.userMessage;
    const mogensReply = req.body.mogensReply;
    const conversationContext = req.body.conversationContext || [];

    // Byg evaluerings-prompt til OpenAI
    const messages = [
      {
        role: 'system',
        content: `Du er en ekspert i patientsamtaler og skal evaluere en sundhedsprofessionels kommunikation i relation til patientens svar.

KOMMUNIKATIONSPRINCIPPER:
1. Starter med nærvær og klar rammesætning
2. Lytter aktivt og stiller åbne spørgsmål  
3. Viser empati og anerkender patientens perspektiv
4. Opsummerer og afstemmer forståelse
5. Afslutter med klare aftaler

OPGAVE:
Vurder sundhedsprofessionellens sidste ytring i forhold til:
1. Hvordan den reagerer på patientens forrige svar og samtalen generelt
2. Om den følger de 5 kommunikationsprincipper og især hvor samtalen er i forhold til start og afslutning
3. Om den er effektiv til at bygge videre på samtalen



VURDERING:
- Giv en score fra 1-10 (10 = fremragende)
- Vurder om ytringen bygger videre på patientens svar
- Identificer 1-2 styrker
- Idetificer 1 fokus i forhold til de 5 kommunikationsprincipper hvor de er i samtalen 
- Hold det til max 20 ord

FORMAT:
[Score: X/10]
Styrker: Det er godt du... -linjeskift
Fokus: Du skal fokusere på...
      },
      // Tilføj samtale-kontekst
      ...conversationContext.map(msg => ({
        role: msg.sender === "Dig" ? "user" : "assistant",
        content: msg.text
      })),
      // Tilføj evaluerings-opgaven
      {
        role: 'user',
        content: `Evaluér denne ytring fra sundhedsprofessionellen: "${userMessage}"

Patientens forrige svar: "${mogensReply}"

Vurder om sundhedsprofessionellens ytring er effektiv til at bygge videre på patientens svar og følger kommunikationsprincipperne.`
      }
    ];

    // Kald OpenAI API for evaluering
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 300,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Send evalueringen tilbage til frontend
    res.json({ evaluation: response.data.choices[0].message.content });
  } catch (err) {
    console.error('Fejl ved evaluering:', err.response ? err.response.data : err);
    res.status(500).json({ error: err.toString() });
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
