// Indlæs miljøvariabler fra .env
require('dotenv').config();

// Importer nødvendige moduler
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Indlæs konfiguration fra ekstern kilde
let config = null;

// Funktion til at hente konfiguration fra GitHub
async function loadConfig() {
  // Tjek om vi skal bruge lokal config til test
  if (process.env.USE_LOCAL_CONFIG === 'true') {
    console.log('🧪 Test mode: Bruger lokal config.json');
    try {
      const configPath = path.join(__dirname, 'config.json');
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('✅ Lokal config.json indlæst for test');
      return;
    } catch (error) {
      console.error('❌ Kunne ikke indlæse lokal config.json:', error);
      process.exit(1);
    }
  }
  
  try {
    // Hent konfiguration fra GitHub (hvor resten af koden også ligger)
    const response = await axios.get('https://raw.githubusercontent.com/DIN-BRUGERNAVN/DIN-REPO/main/config.json');
    config = response.data;
    console.log('✅ Konfiguration indlæst fra GitHub');
  } catch (error) {
    console.error('❌ Fejl ved indlæsning af konfiguration fra GitHub:', error);
    console.log('⚠️ Prøver lokal fallback for test...');
    
    // Fallback til lokal fil for test
    try {
      const configPath = path.join(__dirname, 'config.json');
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('✅ Brugt lokal config.json for test');
    } catch (fallbackError) {
      console.error('❌ Ingen konfiguration fundet - hverken på GitHub eller lokalt');
      process.exit(1);
    }
  }
}

// Hent Mogens' konfiguration (vil blive sat efter loadConfig())
let mogensConfig = null;



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
        content: mogensConfig.system_prompt
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
        model: config.api.openai.model,
        messages: messages,
        max_tokens: config.api.openai.max_tokens,
        temperature: config.api.openai.temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: config.api.openai.timeout
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
        content: config.evaluation.system_prompt
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
        model: config.api.evaluation.model,
        messages: messages,
        max_tokens: config.api.evaluation.max_tokens,
        temperature: config.api.evaluation.temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: config.api.evaluation.timeout
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
        evaluation: config.evaluation.fallback_evaluation
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
    const voiceId = mogensConfig.voice_id;

    console.log(`[${requestId}] 📝 Tekst til lyd: "${text}"`);
    console.log(`[${requestId}] 🎛️ Voice settings:`, voiceSettings);

    // Kald ElevenLabs API for tekst-til-tale med timeout
    const elevenlabsStartTime = Date.now();
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: config.api.elevenlabs.model,
        voice_settings: voiceSettings
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: config.api.elevenlabs.timeout
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
// Config endpoint - Send konfiguration til frontend
// =====================
app.get('/api/config', (req, res) => {
  res.json(config);
});

// =====================
// Start serveren
// =====================
async function startServer() {
  // Indlæs konfiguration først
  await loadConfig();
  
  // Sæt mogensConfig efter konfiguration er indlæst
  mogensConfig = config.characters.mogens;
  
  app.listen(3000, () => {
    console.log('🚀 Server kører på http://localhost:3000');
    console.log('📊 Alle transaktioner logges med ID og timing');
    console.log('⚡ Optimeret med GPT-3.5-turbo og timeouts');
    console.log('🔧 Konfiguration indlæst fra ekstern kilde');
  });
}

startServer();
