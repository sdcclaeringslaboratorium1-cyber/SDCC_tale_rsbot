// Gemmer dialogen mellem bruger og Mogens
let dialog = [];

// Holder styr på Mogens' nuværende status (1-5 skala)
let mogensStatus = 1; // Starter med status 1 (meget kritisk/lukket)

// Tale-til-tekst variabler
let recognition;
let isRecording = false;

// Ventelyd variabel
let waitingAudio = null;

// Velkomstlyd variabel
let welcomeAudio = null;

// Funktion: Afspil velkomstlyd når siden indlæses
function playWelcomeAudio() {
  try {
    // Stop eventuel eksisterende velkomstlyd
    if (welcomeAudio) {
      welcomeAudio.pause();
      welcomeAudio = null;
    }
    
    // Opret en ny Audio instans for velkomstlyden
    welcomeAudio = new Audio('audio/mogens_velkomst.mp3'); // Tilpas filnavnet til din lydfil
    
    // Sæt volumen til et behageligt niveau (0.0 til 1.0)
    welcomeAudio.volume = 0.8;
    
    // Afspil lyden når siden er klar
    welcomeAudio.play().catch(error => {
      console.log('Kunne ikke afspille velkomstlyd:', error);
      // Dette er normalt hvis browseren blokerer autoplay
    });
    
    console.log('Velkomstlyd afspilles');
  } catch (error) {
    console.log('Fejl ved afspilning af velkomstlyd:', error);
  }
}

// Funktion: Stop velkomstlyden
function stopWelcomeAudio() {
  if (welcomeAudio) {
    welcomeAudio.pause();
    welcomeAudio = null;
    console.log('Velkomstlyd stoppet');
  }
}

// Funktion: Skjul audio overlay og start lyden
function startAudioAndHideOverlay() {
  const overlay = document.getElementById('audioOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    // Tilføj en klasse for at markere at overlayet er blevet brugt
    overlay.classList.add('used');
  }
  playWelcomeAudio();
}

// Funktion: Afspil ventelyd mens vi venter på Mogens' svar
function playWaitingAudio() {
  try {
    // Stop eventuel eksisterende ventelyd
    if (waitingAudio) {
      waitingAudio.pause();
      waitingAudio = null;
    }
    
    // Vælg en tilfældig ventelyd (1-4)
    const randomWaitFile = Math.floor(Math.random() * 4) + 1; // 1, 2, 3, eller 4
    const waitAudioPath = `audio/mogens_wait${randomWaitFile}.mp3`;
    
    // Opret og afspil ny ventelyd
    waitingAudio = new Audio(waitAudioPath);
    waitingAudio.volume = 0.6;
    waitingAudio.loop = true; // Gentag lyden indtil svaret kommer
    
    waitingAudio.play().catch(error => {
      console.log('Kunne ikke afspille ventelyd:', error);
    });
    
    console.log(`Ventelyd ${randomWaitFile} afspilles...`);
  } catch (error) {
    console.log('Fejl ved afspilning af ventelyd:', error);
  }
}

// Funktion: Stop ventelyden med fade-out effekt
function stopWaitingAudioWithFade() {
  if (waitingAudio) {
    // Fade-out effekt over 0.3 sekunder
    const fadeOutDuration = 300; // 300ms = 0.3 sekunder
    const fadeOutSteps = 10; // Antal fade steps
    const fadeOutInterval = fadeOutDuration / fadeOutSteps;
    const volumeStep = waitingAudio.volume / fadeOutSteps;
    
    let currentStep = 0;
    const fadeOutTimer = setInterval(() => {
      currentStep++;
      if (currentStep <= fadeOutSteps) {
        waitingAudio.volume = Math.max(0, waitingAudio.volume - volumeStep);
      } else {
        // Stop lyden helt når fade er færdig
        clearInterval(fadeOutTimer);
        waitingAudio.pause();
        waitingAudio = null;
        console.log('Ventelyd stoppet med fade-out');
      }
    }, fadeOutInterval);
  }
}

// Funktion: Stop ventelyden
function stopWaitingAudio() {
  if (waitingAudio) {
    waitingAudio.pause();
    waitingAudio = null;
    console.log('Ventelyd stoppet');
  }
}

// Initialiser Web Speech API
function initSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'da-DK'; // Dansk sprog
    
    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      document.getElementById('prompt').value = transcript;
      // Automatisk send beskeden når optagelsen slutter
      sendMessage();
    };
    
    recognition.onerror = function(event) {
      console.error('Tale-genkendelse fejl:', event.error);
      stopRecording();
    };
    
    recognition.onend = function() {
      stopRecording();
    };
  } else {
    console.log('Tale-genkendelse understøttes ikke i denne browser');
    document.getElementById('micButton').style.display = 'none';
  }
}

// Start optagelse
function startRecording() {
  if (recognition && !isRecording) {
    recognition.start();
    isRecording = true;
    updateMicButton(true);
  }
}

// Stop optagelse
function stopRecording() {
  if (recognition && isRecording) {
    recognition.stop();
    isRecording = false;
    updateMicButton(false);
  }
}

// Opdater mikrofon-knappens udseende
function updateMicButton(recording) {
  const micButton = document.getElementById('micButton');
  if (recording) {
    micButton.classList.add('recording');
    micButton.style.backgroundColor = '#ff4444';
    micButton.style.borderRadius = '50%';
  } else {
    micButton.classList.remove('recording');
    micButton.style.backgroundColor = '#10b981';
    micButton.style.borderRadius = '8px';
  }
}

// Funktion: Send besked til backend og opdater UI
async function sendMessage() {
  const promptInput = document.getElementById('prompt');
  const userMessage = promptInput.value.trim();
  if (!userMessage) return;

  // Stop velkomstlyden hvis den spiller
  stopWelcomeAudio();

  // Tilføj brugerens besked til dialogen
  dialog.push({ sender: "Dig", text: userMessage });

  // Opdater chatvisning
  document.getElementById('response').innerText = dialog
    .slice().reverse()
    .map(msg => `${msg.sender}: ${msg.text}`)
    .join('\n\n');

  // Vent 0.5-1.5 sekunder (tilfældigt) før ventelyden starter
  const randomDelay = Math.floor(Math.random() * 1000) + 500; // 500-1500ms (0.5-1.5 sekunder)
  console.log(`Venter ${randomDelay}ms før ventelyd starter...`);
  
  setTimeout(() => {
    // Start ventelyd mens vi venter på svar
    playWaitingAudio();
  }, randomDelay);

  // Send besked til backend (OpenAI)
  try {
    const res = await fetch('https://sdcc-tale-rsbot.onrender.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: userMessage, 
        dialog,
        systemPrompt: MOGENS_SYSTEM_PROMPT
      })
    });
    const data = await res.json();
    const mogensReply = data.reply || "Ingen svar fra Mogens.";

    // Ekstraher og opdater Mogens' status fra hans svar
    updateMogensStatus(mogensReply);
    
    // Rens svaret og gem det rene svar i dialogen
    const cleanReply = cleanMogensReply(mogensReply);

    // Vent med at stoppe ventelyden - den stopper når Mogens' svar begynder at afspilles
    // stopWaitingAudio(); // Fjernet - ventelyden stopper nu i speakWithElevenLabsOnPlay

    // Afspil svaret med ElevenLabs og tilføj til dialogen når lyden starter
    await speakWithElevenLabsOnPlay(cleanReply);
  } catch (err) {
    // Stop ventelyden ved fejl
    stopWaitingAudio();
    document.getElementById('response').innerText += "\n(Fejl i kommunikation med serveren)";
    console.log('Fejl ved afspilning af ventelyd:', err);
  }

  // Tøm inputfeltet
  promptInput.value = "";
}

// Funktion: Afspil ElevenLabs-lyd og tilføj Mogens' svar til dialogen når lyden starter
async function speakWithElevenLabsOnPlay(text) {
  try {
    // Få voice settings baseret på Mogens' nuværende status
    const voiceSettings = getVoiceSettingsForStatus(mogensStatus);
    
    console.log(`Afspiller Mogens' svar med tonefald for status ${mogensStatus}:`, voiceSettings);

    const res = await fetch('https://sdcc-tale-rsbot.onrender.com/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text,
        voice_settings: voiceSettings
      })
    });
    if (res.ok) {
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioPlayer = document.getElementById('audioPlayer');
      audioPlayer.src = audioUrl;
      audioPlayer.style.display = "block";
      
      // Stop ventelyden med fade-out effekt
      stopWaitingAudioWithFade();
      
      // Vent 0.3 sekunder før Mogens' svar afspilles
      setTimeout(() => {
        audioPlayer.onplay = function() {
          dialog.push({ sender: "Mogens", text: text });
          document.getElementById('response').innerText = dialog
            .slice().reverse()
            .map(msg => `${msg.sender}: ${msg.text}`)
            .join('\n\n');
          audioPlayer.onplay = null;
        };
        audioPlayer.play();
      }, 300); // 300ms = 0.3 sekunder
      
    } else {
      // Stop ventelyden ved fejl
      stopWaitingAudio();
      document.getElementById('response').innerText += "\n(Kunne ikke hente lyd fra ElevenLabs)";
    }
  } catch (err) {
    // Stop ventelyden ved fejl
    stopWaitingAudio();
    document.getElementById('response').innerText += "\n(Fejl i tekst-til-tale)";
  }
}

// Funktion: Opdater Mogens' status baseret på hans svar
function updateMogensStatus(reply) {
  // Søg efter status i hårde klammer [Status: X]
  const statusMatch = reply.match(/\[Status:\s*(\d+)\]/);
  if (statusMatch) {
    const newStatus = parseInt(statusMatch[1]);
    if (newStatus >= 1 && newStatus <= 5) {
      const oldStatus = mogensStatus;
      mogensStatus = newStatus;
      
      // Log status-ændringen
      console.log(`Mogens' status ændret fra ${oldStatus} til ${newStatus}`);
      
      // Opdater h2-elementet med ny status
      const statusText = getStatusDescription(mogensStatus);
      document.getElementById('mogensStatus').innerText = `Mogens' nuværende attitude: ${statusText}`;
      
      // Opdater status-værdien
      document.getElementById('statusValue').innerText = mogensStatus;
      
      // Opdater status-bar'en
      const statusFill = document.getElementById('statusFill');
      const percentage = (mogensStatus / 5) * 100;
      statusFill.style.width = percentage + '%';
      
      // Tilføj visuel feedback
      updateStatusBarColor(mogensStatus);
    }
  }
}

// Funktion: Opdater status-bar farve baseret på status
function updateStatusBarColor(status) {
  const statusFill = document.getElementById('statusFill');
  const statusValue = document.getElementById('statusValue');
  
  // Fjern alle farve-klasser
  statusValue.className = 'status-value';
  
  if (status <= 2) {
    statusValue.style.background = '#ef4444'; // Rød for kritisk
  } else if (status === 3) {
    statusValue.style.background = '#f59e0b'; // Orange for neutral
  } else {
    statusValue.style.background = '#10b981'; // Grøn for positiv
  }
}

// Funktion: Fjern status-tekst fra Mogens' svar
function cleanMogensReply(reply) {
  // Fjern [Status: X] fra svaret
  return reply.replace(/\[Status:\s*\d+\]/g, '').trim();
}

// Funktion: Få beskrivelse af status
function getStatusDescription(status) {
  const descriptions = {
    1: "Meget kritisk overfor dig",
    2: "Kritisk og tøvende", 
    3: "Lidt åben og spørgende",
    4: "Tæt på accept og samarbejdsvillig",
    5: "Positiv og indvilger i målinger"
  };
  return descriptions[status] || "Ukendt status";
}

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

// Funktion: Få voice settings baseret på Mogens' nuværende status
function getVoiceSettingsForStatus(status) {
  // Base voice settings
  const baseSettings = {
    stability: 0.7,
    similarity_boost: 0.8,
    use_speaker_boost: true
  };

  // Juster tonefald baseret på status
  switch (status) {
    case 1: // Meget kritisk
      return {
        ...baseSettings,
        style: 0.8,        // Høj stil = mere udtryksfuld og dramatisk
        stability: 0.5     // Lavere stabilitet = mere varieret tone
      };
    case 2: // Kritisk og tøvende
      return {
        ...baseSettings,
        style: 0.6,        // Moderat stil
        stability: 0.6
      };
    case 3: // Lidt åben og spørgende
      return {
        ...baseSettings,
        style: 0.4,        // Lav stil = mere neutral
        stability: 0.7
      };
    case 4: // Tæt på accept
      return {
        ...baseSettings,
        style: 0.3,        // Lav stil = rolig og afslappet
        stability: 0.8
      };
    case 5: // Positiv og indvilger
      return {
        ...baseSettings,
        style: 0.2,        // Meget lav stil = rolig og venlig
        stability: 0.9     // Høj stabilitet = konsistent og rolig
      };
    default:
      return baseSettings;
  }
}

// Initialiser alt når siden er loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialiser tale-genkendelse
  initSpeechRecognition();
  
  // Lyt efter klik på "Klar" knappen for at starte lyden
  document.getElementById('startAudioBtn').addEventListener('click', startAudioAndHideOverlay);
  
  // Lyt efter Enter-tast i inputfeltet og send besked
  document.getElementById('prompt').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });

  // Lyt efter klik på mikrofon-knappen
  document.getElementById('micButton').addEventListener('click', function() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });
});
