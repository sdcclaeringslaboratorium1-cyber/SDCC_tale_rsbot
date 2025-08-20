// Gemmer dialogen mellem bruger og Mogens
let dialog = [];

// Holder styr på Mogens' nuværende status (1-5 skala)
let mogensStatus = 1; // Starter med status 1 (meget kritisk/lukket)

// Tale-til-tekst variabler
let recognition;
let isRecording = false;

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
    micButton.style.backgroundColor = '#ff4444';
    micButton.style.borderRadius = '50%';
  } else {
    micButton.style.backgroundColor = 'transparent';
    micButton.style.borderRadius = '0';
  }
}

// Funktion: Send besked til backend og opdater UI
async function sendMessage() {
  const promptInput = document.getElementById('prompt');
  const userMessage = promptInput.value.trim();
  if (!userMessage) return;

  // Tilføj brugerens besked til dialogen
  dialog.push({ sender: "Dig", text: userMessage });

  // Opdater chatvisning
  document.getElementById('response').innerText = dialog
    .slice().reverse()
    .map(msg => `${msg.sender}: ${msg.text}`)
    .join('\n\n');

  // Send besked til backend (OpenAI)
  try {
    const res = await fetch('https://sdcc-tale-rsbot.onrender.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, dialog })
    });
    const data = await res.json();
    const mogensReply = data.reply || "Ingen svar fra Mogens.";

    // Ekstraher og opdater Mogens' status fra hans svar
    updateMogensStatus(mogensReply);
    
    // Rens svaret og gem det rene svar i dialogen
    const cleanReply = cleanMogensReply(mogensReply);

    // Afspil svaret med ElevenLabs og tilføj til dialogen når lyden starter
    await speakWithElevenLabsOnPlay(cleanReply);
  } catch (err) {
    document.getElementById('response').innerText += "\n(Fejl i kommunikation med serveren)";
  }

  // Tøm inputfeltet
  promptInput.value = "";
}

// Funktion: Afspil ElevenLabs-lyd og tilføj Mogens' svar til dialogen når lyden starter
async function speakWithElevenLabsOnPlay(text) {
  try {
    const res = await fetch('https://sdcc-tale-rsbot.onrender.com/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (res.ok) {
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioPlayer = document.getElementById('audioPlayer');
      audioPlayer.src = audioUrl;
      audioPlayer.style.display = "block";
      audioPlayer.onplay = function() {
        dialog.push({ sender: "Mogens", text: text });
        document.getElementById('response').innerText = dialog
          .slice().reverse()
          .map(msg => `${msg.sender}: ${msg.text}`)
          .join('\n\n');
        audioPlayer.onplay = null;
      };
      audioPlayer.play();
    } else {
      document.getElementById('response').innerText += "\n(Kunne ikke hente lyd fra ElevenLabs)";
    }
  } catch (err) {
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
    }
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
    1: "Meget kritisk / lukket / modstand",
    2: "Kritisk / tøvende", 
    3: "Lidt åben / spørgende",
    4: "Tæt på accept / samarbejdsvillig",
    5: "Positiv / indvilger i målinger"
  };
  return descriptions[status] || "Ukendt status";
}

// Initialiser alt når siden er loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialiser tale-genkendelse
  initSpeechRecognition();
  
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
