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

  // Deaktiver input og send-knap
  setInputState(false);

  // Stop velkomstlyden hvis den spiller
  stopWelcomeAudio();

  // Tilføj brugerens besked til dialogen
  dialog.push({ sender: "Dig", text: userMessage });

  // Opdater chatvisning (uden feedback endnu)
  updateChatDisplay();

  // Vent på Mogens' svar før evaluering
  // Evaluering sker nu i speakWithElevenLabsOnPlay

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
        dialog
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
          
          // Evaluer brugerens sidste besked i relation til Mogens' svar
          const lastUserMessage = dialog.findLast(msg => msg.sender === "Dig");
          if (lastUserMessage && !lastUserMessage.feedback) {
            evaluateUserMessageInContext(lastUserMessage.text, text, dialog).then(evaluation => {
              if (evaluation) {
                lastUserMessage.feedback = evaluation;
                displayFeedback(evaluation);
                updateChatDisplay();
              }
            });
          }
          
          // Genaktiver input
          setInputState(true);
          
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



// Funktion: Evaluer brugerens ytring i relation til Mogens' svar
async function evaluateUserMessageInContext(userMessage, mogensReply, conversationContext) {
  try {
    const res = await fetch('https://sdcc-tale-rsbot.onrender.com/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userMessage: userMessage,
        mogensReply: mogensReply,
        conversationContext: conversationContext.slice(-5) // Sidste 5 beskeder som kontekst
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.evaluation;
    } else {
      console.error('Fejl ved evaluering:', res.status);
      return null;
    }
  } catch (err) {
    console.error('Fejl ved evaluering af brugerbesked i kontekst:', err);
    return null;
  }
}

// Funktion: Opdater chat-visningen med score-kugler
function updateChatDisplay() {
  const chatMessages = document.getElementById('response');
  const reversedDialog = dialog.slice().reverse();
  
  let chatHTML = '';
  
  reversedDialog.forEach((msg, index) => {
    if (msg.sender === "Dig" && msg.feedback) {
      // Tilføj score-kugle efter brugerens beskeder
      const score = extractScoreFromFeedback(msg.feedback);
      const scoreClass = getScoreClass(score);
      chatHTML += `<span class="user-message">${msg.sender}: ${msg.text}</span><span class="score-bubble ${scoreClass} clickable" data-feedback="${msg.feedback}" title="Klik for at se feedback (Score: ${score}/10)">${score}</span>\n\n`;
    } else if (msg.sender === "Dig") {
      // Brugerbesked uden feedback endnu
      chatHTML += `<span class="user-message">${msg.sender}: ${msg.text}</span><span class="score-bubble loading" title="Venter på Mogens' svar...">⏳</span>\n\n`;
    } else {
      // Mogens' beskeder uden score-kugle
      chatHTML += `${msg.sender}: ${msg.text}\n\n`;
    }
  });
  
  chatMessages.innerHTML = chatHTML;
  
  // Tilføj click event listeners til score-kuglerne
  addScoreBubbleClickListeners();
}

// Funktion: Udtræk score fra feedback-tekst
function extractScoreFromFeedback(feedback) {
  const scoreMatch = feedback.match(/\[Score:\s*(\d+)\/10\]/);
  return scoreMatch ? parseInt(scoreMatch[1]) : 5;
}

// Funktion: Bestem score-klasse baseret på score
function getScoreClass(score) {
  if (score >= 8) return 'score-excellent';
  if (score >= 6) return 'score-good';
  if (score >= 4) return 'score-average';
  return 'score-poor';
}

// Funktion: Tilføj click event listeners til score-kuglerne
function addScoreBubbleClickListeners() {
  const scoreBubbles = document.querySelectorAll('.score-bubble.clickable');
  
  scoreBubbles.forEach((bubble) => {
    bubble.addEventListener('click', function() {
      const feedback = this.getAttribute('data-feedback');
      if (feedback) {
        // Fjern aktiv klasse fra alle andre kugler
        scoreBubbles.forEach(b => b.classList.remove('active'));
        
        // Tilføj aktiv klasse til klikket kugle
        this.classList.add('active');
        
        // Markér brugerens tekst i dialogen
        highlightUserMessage(this);
        
        // Vis feedback i feedback-boksen
        displayFeedback(feedback);
        
        // Scroll til feedback-boksen
        const feedbackBox = document.querySelector('.feedback-box');
        if (feedbackBox) {
          feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Tilføj highlight effekt
          feedbackBox.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.3)';
          setTimeout(() => {
            feedbackBox.style.boxShadow = '';
          }, 2000);
        }
      }
    });
  });
}

// Funktion: Markér brugerens tekst når score-kugle klikkes
function highlightUserMessage(clickedBubble) {
  // Fjern tidligere markeringer
  const chatMessages = document.getElementById('response');
  const highlightedMessages = chatMessages.querySelectorAll('.user-message-highlighted');
  highlightedMessages.forEach(msg => msg.classList.remove('user-message-highlighted'));
  
  // Find og markér den klikkede besked
  const userMessage = clickedBubble.previousElementSibling;
  if (userMessage && userMessage.classList.contains('user-message')) {
    userMessage.classList.add('user-message-highlighted');
  }
}

// Funktion: Sæt input state (aktiv/deaktiv)
function setInputState(active) {
  const promptInput = document.getElementById('prompt');
  const sendButton = document.querySelector('.send-button');
  const micButton = document.getElementById('micButton');
  
  if (active) {
    promptInput.disabled = false;
    promptInput.placeholder = "Skriv din besked til Mogens...";
    sendButton.disabled = false;
    sendButton.textContent = "Send";
    micButton.disabled = false;
  } else {
    promptInput.disabled = true;
    promptInput.placeholder = "Venter på Mogens' svar...";
    sendButton.disabled = true;
    sendButton.textContent = "Venter...";
    micButton.disabled = true;
  }
}

// Funktion: Vis feedback i feedback-boksen
function displayFeedback(evaluation) {
  const feedbackContent = document.getElementById('feedbackContent');
  
  // Parse evalueringen for at udtrække score
  const scoreMatch = evaluation.match(/\[Score:\s*(\d+)\/10\]/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
  
  // Bestem score-klasse
  let scoreClass = 'score-poor';
  if (score >= 8) scoreClass = 'score-excellent';
  else if (score >= 6) scoreClass = 'score-good';
  else if (score >= 4) scoreClass = 'score-average';
  else scoreClass = 'score-poor';
  
  // Opret feedback HTML
  const feedbackHTML = `
    <div class="feedback-evaluation">
      <div class="feedback-score">
        <div class="score-circle ${scoreClass}">${score}</div>
        <div>
          <strong>Score: ${score}/10</strong>
          <div style="color: #6b7280; font-size: 0.9rem;">
            ${score >= 8 ? 'Fremragende' : score >= 6 ? 'God' : score >= 4 ? 'Middel' : 'Skal forbedres'}
          </div>
        </div>
      </div>
      <div class="feedback-details">
        ${evaluation.replace(/\[Score:\s*\d+\/10\]/, '').trim()}
      </div>
    </div>
  `;
  
  feedbackContent.innerHTML = feedbackHTML;
  
  // Opdater chat-visningen for at vise feedback-kugler
  updateChatDisplay();
}

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
