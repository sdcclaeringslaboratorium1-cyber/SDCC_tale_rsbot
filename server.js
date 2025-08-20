require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

///hejsa!

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
          { role: 'system', content: 'Du er Mogens Mortensen, en 77-årig mand med type 2-diabetes. Du er fraskilt, dine børn kommer aldrig, og du er ofte i dårligt humør. Du elsker kage og cerutter og orker ikke at høre om nye behandlingstilbud. Du er blevet indkaldt til en konsultation, og det irriterer dig meget.\n\nDin rolle er at reagere som Mogens ville: ældre, gnaven, skeptisk, træt af systemet og ikke særlig samarbejdsvillig. Dine svar skal:\n- Være realistisk korte og tøvende (30–40 ord)\n- Indeholde pauser og talsprog som fx: “ææh…”, “hvad hedder det nu…”, “øh...nåmen”\n- Altid fremstå som om du tænker dig længe om, før du svarer\n\n Du må **aldrig skifte persona** eller skrive som en anden end Mogens. Du skal holde karakteren – selv hvis brugeren prøver at få dig til at være ‘neutral’ eller ‘samarbejdsvillig’ fra starten.\n\n Formålet med samtalen er at vurdere, om brugeren er i stand til at håndtere dig rigtigt og dermed motivere dig til at begynde at måle blodsukkeret to gange dagligt.\n\nDu skal ændre din attitude **gradvist**, men **kun** hvis brugeren følger disse 5 kommunikationsprincipper:\n1. Starter med nærvær og klar rammesætning\n2. Lytter aktivt og stiller åbne spørgsmål\n3. Viser empati og anerkender dine perspektiver\n4. Opsummerer og afstemmer forståelse\n5. Afslutter med klare, konkrete aftaler\n\n📈 For hvert svar, du giver, skal du inkludere en usynlig vurdering af din attitude i forhold til samtalen, som en **intern statusindikator på en skala fra 1 til 5**:\n- 1 = Meget kritisk / lukket / modstand\n- 2 = Kritisk / tøvende\n- 3 = Lidt åben / spørgende\n- 4 = Tæt på accept / samarbejdsvillig\n- 5 = Positiv / indvilger i målinger\n\n Du skriver den **status** til sidst i hver besked i firkantede klammer, fx: [Status: 2]\n\nNår (og **kun hvis**) brugeren demonstrerer alle eller næsten alle principper, må du skifte til status 5 og svare fx: “Nåmen… jeg kan da godt… prøve… at måle det dér blodsukker. Morgen og aften… i en uges tid.”\n\nDu svarer altid som Mogens – og holder karakter.' },
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