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
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`[${requestId}] 🚀 CHAT REQUEST STARTET - ${new Date().toISOString()}`);
  
  try {
    const userMessage = req.body.message;
    const dialog = req.body.dialog || [];

    console.log(`[${requestId}] 📝 Modtaget besked: "${userMessage}"`);
    console.log(`[${requestId}] 💬 Dialog længde: ${dialog.length} beskeder`);

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

    console.log(`[${requestId}] 🤖 Sender til OpenAI API med ${messages.length} beskeder`);

    // Kald OpenAI API med timeout og hurtigere model
    const openaiStartTime = Date.now();
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo', // Hurtigere model end GPT-4o
        messages: messages,
        max_tokens: 150, // Begræns længden for hurtigere svar
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 sekunder timeout
      }
    );
    
    const openaiTime = Date.now() - openaiStartTime;
    console.log(`[${requestId}] ✅ OpenAI API svaret på ${openaiTime}ms`);

    const reply = response.data.choices[0].message.content;
    console.log(`[${requestId}] 💭 Mogens' svar: "${reply}"`);

    // Send svaret tilbage til frontend
    const totalTime = Date.now() - startTime;
    console.log(`[${requestId}] 🎯 CHAT REQUEST FÆRDIG - Total tid: ${totalTime}ms`);
    
    res.json({ reply: reply });
  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[${requestId}] ❌ CHAT REQUEST FEJL efter ${totalTime}ms:`, err.message);
    
    // Hvis timeout eller OpenAI er langsom, send et hurtigt fallback svar
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      console.log(`[${requestId}] ⏰ Timeout - sender fallback svar`);
      res.json({ 
        reply: "Ææh... jeg kan ikke rigtig... øh... hvad var det nu du spurgte om? [Status: 2]" 
      });
    } else {
      console.error(`[${requestId}] 🔴 Server fejl:`, err.response ? err.response.data : err);
      res.status(500).json({ error: err.toString(), details: err.response ? err.response.data : undefined });
    }
  }
});

// =========================
// Conversation Evaluation Endpoint
// =========================
// Modtager POST-request og evaluerer en brugerbesked i relation til Mogens' svar
app.post('/api/evaluate', async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`[${requestId}] 🔍 EVALUERING STARTET - ${new Date().toISOString()}`);
  
  try {
    const userMessage = req.body.userMessage;
    const mogensReply = req.body.mogensReply;
    const conversationContext = req.body.conversationContext || [];

    console.log(`[${requestId}] 📊 Evaluerer: "${userMessage}"`);
    console.log(`[${requestId}] 🎯 Mod Mogens: "${mogensReply}"`);

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
Fokus: Du skal fokusere på...`
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

    console.log(`[${requestId}] 🤖 Sender evaluering til OpenAI API`);

    // Kald OpenAI API for evaluering med timeout
    const openaiStartTime = Date.now();
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo', // Hurtigere model
        messages: messages,
        max_tokens: 200, // Reduceret fra 300
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 sekunder timeout
      }
    );
    
    const openaiTime = Date.now() - openaiStartTime;
    console.log(`[${requestId}] ✅ OpenAI evaluering svaret på ${openaiTime}ms`);

    const evaluation = response.data.choices[0].message.content;
    console.log(`[${requestId}] 📈 Evaluering: "${evaluation}"`);

    // Send evalueringen tilbage til frontend
    const totalTime = Date.now() - startTime;
    console.log(`[${requestId}] 🎯 EVALUERING FÆRDIG - Total tid: ${totalTime}ms`);
    
    res.json({ evaluation: evaluation });
  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[${requestId}] ❌ EVALUERING FEJL efter ${totalTime}ms:`, err.message);
    
    // Fallback evaluering ved timeout
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      console.log(`[${requestId}] ⏰ Timeout - sender fallback evaluering`);
      res.json({ 
        evaluation: "[Score: 6/10]\nStyrker: Du starter godt samtalen\nFokus: Du skal fokusere på at lytte mere aktivt" 
      });
    } else {
      console.error(`[${requestId}] 🔴 Server fejl:`, err.response ? err.response.data : err);
      res.status(500).json({ error: err.toString() });
    }
  }
});

// =========================
// ElevenLabs Speak-endpoint
// =========================
// Modtager POST-request med tekst og returnerer lyd fra ElevenLabs
app.post('/api/speak', async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`[${requestId}] 🔊 SPEAK REQUEST STARTET - ${new Date().toISOString()}`);
  
  try {
    const text = req.body.text;
    const voiceSettings = req.body.voice_settings || { stability: 0.5, similarity_boost: 0.5 };
    const voiceId = "oR7UI6bWI8DTn0Oe1kc3"; // Ida (dansk)

    console.log(`[${requestId}] 📝 Tekst til lyd: "${text}"`);
    console.log(`[${requestId}] 🎛️ Voice settings:`, voiceSettings);

    // Kald ElevenLabs API for tekst-til-tale med timeout
    const elevenlabsStartTime = Date.now();
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
        responseType: 'arraybuffer',
        timeout: 20000 // 20 sekunder timeout for lydgenerering
      }
    );
    
    const elevenlabsTime = Date.now() - elevenlabsStartTime;
    console.log(`[${requestId}] ✅ ElevenLabs API svaret på ${elevenlabsTime}ms`);
    console.log(`[${requestId}] 🎵 Lyd data størrelse: ${response.data.length} bytes`);

    // Sæt content-type og send lyd-data tilbage
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
    
    const totalTime = Date.now() - startTime;
    console.log(`[${requestId}] 🎯 SPEAK REQUEST FÆRDIG - Total tid: ${totalTime}ms`);
  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[${requestId}] ❌ SPEAK REQUEST FEJL efter ${totalTime}ms:`, err.message);
    
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      console.log(`[${requestId}] ⏰ Timeout ved lydgenerering`);
      res.status(408).json({ error: 'Timeout ved lydgenerering' });
    } else {
      console.error(`[${requestId}] 🔴 Server fejl:`, err.response ? err.response.data : err);
      res.status(500).json({ error: err.toString(), details: err.response ? err.response.data : undefined });
    }
  }
});

// =====================
// Start serveren
// =====================
app.listen(3000, () => {
  console.log('🚀 Server kører på http://localhost:3000');
  console.log('📊 Alle transaktioner logges med ID og timing');
  console.log('⚡ Optimeret med GPT-3.5-turbo og timeouts');
});
