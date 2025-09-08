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

// Performance tracking
let performanceMetrics = {
  firstResponseTime: null,
  averageResponseTime: 0,
  responseCount: 0
};

// Konfiguration fra server
let config = null;
let patientConfig = null; // Reference til aktiv patient fra config
let completionShown = false; // Popup vises kun én gang ved 5/5

// Funktion: Afspil velkomstlyd når siden indlæses
function playWelcomeAudio() {
  try {
    // Stop eventuel eksisterende velkomstlyd
    if (welcomeAudio) {
      welcomeAudio.pause();
      welcomeAudio = null;
    }
    
    // Opret en ny Audio instans for velkomstlyden
    const welcomeFile = (patientConfig && patientConfig.audio_files?.welcome) || config.characters.mogens.audio_files.welcome;
    welcomeAudio = new Audio(welcomeFile);
    
    // Sæt volumen til et behageligt niveau (0.0 til 1.0)
    welcomeAudio.volume = config.audio.welcome_volume;
    
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
  // Afspil introducerende hilsen i stedet for mp3
  playInitialGreetingFromConfig();
}

// Funktion: Afspil ventelyd mens vi venter på Mogens' svar
function playWaitingAudio() {
  try {
    // Stop eventuel eksisterende ventelyd
    if (waitingAudio) {
      waitingAudio.pause();
      waitingAudio = null;
    }
    
    // Vælg en tilfældig ventelyd fra konfigurationen
    const waitingFiles = (patientConfig && patientConfig.audio_files?.waiting) || config.characters.mogens.audio_files.waiting;
    const randomIndex = Math.floor(Math.random() * waitingFiles.length);
    const waitAudioPath = waitingFiles[randomIndex];
    
    // Opret og afspil ny ventelyd
    waitingAudio = new Audio(waitAudioPath);
    waitingAudio.volume = config.audio.waiting_volume;
    waitingAudio.loop = true; // Gentag lyden indtil svaret kommer
    
    waitingAudio.play().catch(error => {
      console.log('Kunne ikke afspille ventelyd:', error);
    });
    
    console.log(`Ventelyd ${randomIndex + 1} afspilles...`);
  } catch (error) {
    console.log('Fejl ved afspilning af ventelyd:', error);
  }
}

// Funktion: Stop ventelyden med fade-out effekt
function stopWaitingAudioWithFade() {
  if (waitingAudio) {
    // Fade-out effekt fra konfigurationen
    const fadeOutDuration = config.audio.fade_out_duration; // 300ms = 0.3 sekunder
    const fadeOutSteps = config.audio.fade_out_steps; // Antal fade steps
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

// Funktion: Hent introducerende hilsen fra config og afspil via ElevenLabs
function playInitialGreetingFromConfig() {
  try {
    const greeting = getInitialGreetingFromConfig();
    if (!greeting) {
      console.log('Ingen introducerende hilsen fundet i config. Springes over.');
      return;
    }
    const requestId = 'init_' + Math.random().toString(36).substr(2, 6);
    console.log(`[${requestId}] 🔊 Afspiller introducerende hilsen fra config`);
    // Brug eksisterende TTS-funktion; den tilføjer også beskeden til dialogen og opdaterer UI
    speakWithElevenLabsOnPlay(greeting, requestId);
  } catch (error) {
    console.error('Fejl ved afspilning af introducerende hilsen:', error);
  }
}

// Funktion: Udtræk introducerende hilsen fra patientConfig.system_prompt
function getInitialGreetingFromConfig() {
  try {
    const prompts = patientConfig && Array.isArray(patientConfig.system_prompt)
      ? patientConfig.system_prompt
      : [];
    const line = prompts.find(l => typeof l === 'string' && l.toLowerCase().startsWith('mogens introducerende hilsen'));
    if (!line) return null;
    // Forsøg at finde tekst i enkelte anførselstegn '...'
    const match = line.match(/'([^']+)'/);
    if (match && match[1]) return match[1].trim();
    // Alternativt fjern label og kolon
    const afterColon = line.split(':').slice(1).join(':').trim();
    return afterColon || null;
  } catch (e) {
    return null;
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

// Funktion: Opdater performance dashboard
function updatePerformanceDashboard() {
  const firstResponseElement = document.getElementById('firstResponseTime');
  const averageResponseElement = document.getElementById('averageResponseTime');
  const responseCountElement = document.getElementById('responseCount');
  
  if (firstResponseElement) {
    firstResponseElement.textContent = performanceMetrics.firstResponseTime ? 
      `${performanceMetrics.firstResponseTime}ms` : '-';
  }
  
  if (averageResponseElement) {
    averageResponseElement.textContent = performanceMetrics.averageResponseTime ? 
      `${Math.round(performanceMetrics.averageResponseTime)}ms` : '-';
  }
  
  if (responseCountElement) {
    responseCountElement.textContent = performanceMetrics.responseCount;
  }
}

// Funktion: Send besked til backend og opdater UI
async function sendMessage() {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`[${requestId}] 🚀 FRONTEND: Besked sendt - ${new Date().toISOString()}`);
  
  const promptInput = document.getElementById('prompt');
  const userMessage = promptInput.value.trim();
  if (!userMessage) return;

  console.log(`[${requestId}] 📝 Brugerbesked: "${userMessage}"`);

  // Deaktiver input og send-knap
  setInputState(false);

  // Stop velkomstlyden hvis den spiller
  stopWelcomeAudio();

  // Tilføj brugerens besked til dialogen
  dialog.push({ sender: "Dig", text: userMessage });

  // Opdater chatvisning (uden feedback endnu)
  updateChatDisplay();

  // Start ventelyd med minimal forsinkelse fra konfigurationen
  const isFirstMessage = dialog.length === 1;
  const delayConfig = isFirstMessage ? 
    config.timing.first_message_delay : 
    config.timing.subsequent_message_delay;
  const randomDelay = isFirstMessage ? 
    Math.floor(Math.random() * (delayConfig.max - delayConfig.min)) + delayConfig.min :
    Math.floor(Math.random() * (delayConfig.max - delayConfig.min)) + delayConfig.min;
  console.log(`[${requestId}] ⏱️ Venter ${randomDelay}ms før ventelyd starter...`);
  
  setTimeout(() => {
    // Start ventelyd mens vi venter på svar
    playWaitingAudio();
  }, randomDelay);

  // Send besked til backend (OpenAI) med timeout
  try {
    console.log(`[${requestId}] 🤖 Sender til OpenAI API...`);
    const openaiStartTime = Date.now();
    
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: userMessage, 
        dialog
      })
    });
    
    const openaiTime = Date.now() - openaiStartTime;
    console.log(`[${requestId}] ✅ OpenAI API svaret på ${openaiTime}ms`);
    
    const data = await res.json();
    const mogensReply = data.reply || `Ingen svar fra ${(patientConfig && patientConfig.name) || 'Patient'}.`;

    console.log(`[${requestId}] 💭 ${(patientConfig && patientConfig.name) || 'Patient'}'s svar modtaget: "${mogensReply}"`);

    // Rens svaret og gem det rene svar i dialogen (ingen status-parsing længere)
    const cleanReply = cleanMogensReply(mogensReply);

    // Start parallel processing: ElevenLabs og evaluering samtidigt
    console.log(`[${requestId}] 🔄 Starter parallel processing...`);
    
    const [audioResult, evaluationResult] = await Promise.allSettled([
      speakWithElevenLabsOnPlay(cleanReply, requestId),
      evaluateUserMessageInContext(userMessage, cleanReply, dialog, requestId)
    ]);
    
    // Håndter resultater
    if (audioResult.status === 'fulfilled') {
      console.log(`[${requestId}] ✅ Lyd generering færdig`);
    } else {
      console.error(`[${requestId}] ❌ Lyd generering fejlede:`, audioResult.reason);
    }
    
    if (evaluationResult.status === 'fulfilled' && evaluationResult.value) {
      console.log(`[${requestId}] ✅ Evaluering færdig`);
      const lastUserMessage = dialog.findLast(msg => msg.sender === "Dig");
      if (lastUserMessage) {
        lastUserMessage.feedback = evaluationResult.value;
        displayFeedback(evaluationResult.value);
        updateChatDisplay();
        
        // Parse og opdater Mogens' status og attitude fra evaluation feedback
        console.log(`🔍 Evaluation feedback: "${evaluationResult.value}"`);
        let newStatus = parseStatusFromEvaluation(evaluationResult.value);
        const newAttitude = parseAttitudeFromEvaluation(evaluationResult.value);
        console.log(`🔍 Parsed status: ${newStatus}, attitude: ${newAttitude}`);
        
        // Regel: Efter første bruger-ytring er status 1, med mindre score > 8
        const userMsgCount = dialog.filter(m => m.sender === "Dig").length;
        if (userMsgCount === 1) {
          const firstScore = extractScoreFromFeedback(evaluationResult.value);
          if (!(firstScore > 8)) {
            newStatus = 1;
            console.log(`🔧 Første ytring: score ${firstScore} → tvinger status til 1`);
          } else {
            // Score > 8: status må maksimalt være 2
            const capped = newStatus == null ? 2 : Math.min(newStatus, 2);
            console.log(`🔧 Første ytring: score ${firstScore} > 7 → cap status fra ${newStatus} til ${capped}`);
            newStatus = capped;
          }
        }

        if (newStatus !== null && newStatus >= 1 && newStatus <= 5) {
          // Global regel: status må kun bevæge sig ét trin ad gangen
          const clamped = clampStatusStep(mogensStatus, newStatus);
          if (clamped !== newStatus) {
            console.log(`🔧 Clamper status fra ${newStatus} til ${clamped} (maks ±1 fra ${mogensStatus})`);
          }
          console.log(`🔍 Kalder updateMogensStatusFromEvaluation...`);
          updateMogensStatusFromEvaluation(clamped, newAttitude);
        } else {
          console.warn(`⚠️ Ingen gyldig status fundet i evaluation: ${newStatus}`);
        }
      }
    } else {
      console.error(`[${requestId}] ❌ Evaluering fejlede:`, evaluationResult.reason);
    }
    
  } catch (err) {
    // Stop ventelyden ved fejl
    stopWaitingAudio();
    document.getElementById('response').innerText += "\n(Fejl i kommunikation med serveren)";
    console.error(`[${requestId}] ❌ Fejl ved afspilning af ventelyd:`, err);
  }

  // Tøm inputfeltet
  promptInput.value = "";
  
  // Beregn og log performance
  const totalTime = Date.now() - startTime;
  if (isFirstMessage) {
    performanceMetrics.firstResponseTime = totalTime;
    console.log(`[${requestId}] 🎯 FØRSTE SVAR TID: ${totalTime}ms`);
  }
  
  performanceMetrics.responseCount++;
  performanceMetrics.averageResponseTime = 
    (performanceMetrics.averageResponseTime * (performanceMetrics.responseCount - 1) + totalTime) / performanceMetrics.responseCount;
  
  console.log(`[${requestId}] 📊 Performance: Total tid: ${totalTime}ms, Gennemsnit: ${Math.round(performanceMetrics.averageResponseTime)}ms`);
  
  // Opdater performance dashboard
  updatePerformanceDashboard();
}

// Funktion: Afspil ElevenLabs-lyd og tilføj Mogens' svar til dialogen når lyden starter
async function speakWithElevenLabsOnPlay(text, requestId) {
  try {
    console.log(`[${requestId}] 🔊 Starter ElevenLabs lyd generering...`);

    const res = await fetch('http://localhost:3000/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text
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
      
      // Tilføj patientens svar til dialogen med det samme
      const patientName = (patientConfig && patientConfig.name) || "Patient";
      dialog.push({ sender: patientName, text: text });
      console.log(`[${requestId}] ✅ Svar fra ${patientName} tilføjet til dialog: "${text}"`);
      
      // Opdater chatvisningen for at vise Mogens' svar
      updateChatDisplay();
      
      // Afspil Mogens' svar med minimal forsinkelse fra konfigurationen
      const playDelay = config.audio.play_delay;
      setTimeout(() => {
        audioPlayer.onplay = function() {
          // Genaktiver input
          setInputState(true);
          
          audioPlayer.onplay = null;
        };
        audioPlayer.play();
      }, playDelay);

      // Tjek om patienten afslutter samtalen
      checkForEndConversation(text, patientName);
      
    } else {
      // Stop ventelyden ved fejl
      stopWaitingAudio();
      document.getElementById('response').innerText += "\n(Kunne ikke hente lyd fra ElevenLabs)";
    }
  } catch (err) {
    // Stop ventelyden ved fejl
    stopWaitingAudio();
    document.getElementById('response').innerText += "\n(Fejl i tekst-til-tale)";
    throw err;
  }
}

// Funktion: Opdater patientens status baseret på evaluation feedback
function updateMogensStatusFromEvaluation(newStatus, newAttitude = null) {
  console.log(`🔍 updateMogensStatusFromEvaluation kaldt med: newStatus=${newStatus}, newAttitude=${newAttitude}`);
  
  if (newStatus >= 1 && newStatus <= 5) {
    const oldStatus = mogensStatus;
    mogensStatus = newStatus;
    
    // Log status-ændringen
    console.log(`🔄 Patientens status ændret fra ${oldStatus} til ${newStatus} (fra evaluation)`);
    console.log(`📊 Patientens nuværende status: ${mogensStatus}/5`);
    
    // Opdater h2-elementet med ny status - brug altid beskrivelsen, så attitude matcher status
    const statusText = getStatusDescription(mogensStatus);
    const mogensStatusElement = document.getElementById('mogensStatus');
    
    console.log(`🔍 Søger efter mogensStatus element:`, mogensStatusElement);
    console.log(`🔍 Status tekst: ${statusText}`);
    
    if (mogensStatusElement) {
      mogensStatusElement.innerText = `${(patientConfig && patientConfig.name) || 'Patient'}'s nuværende attitude: ${statusText} (Status: ${mogensStatus}/5)`;
      console.log(`✅ Mogens status tekst opdateret`);
    } else {
      console.error('❌ mogensStatus element ikke fundet');
    }
    
    // Opdater status-bar'en
    const statusFill = document.getElementById('statusFill');
    console.log(`🔍 Søger efter statusFill element:`, statusFill);
    
    if (statusFill) {
      const percentage = (mogensStatus / 5) * 100;
      statusFill.style.width = percentage + '%';
      console.log(`✅ Status bar opdateret til ${percentage}%`);
      // Popup ved 5/5 (kun én gang)
      if (mogensStatus === 5 && !completionShown) {
        completionShown = true;
        showCompletionPopup();
      }
    } else {
      console.error('❌ statusFill element ikke fundet');
    }
    
    // Tilføj visuel feedback
    updateStatusBarColor(mogensStatus);
    
    // Opdater område baseret på status
    updateAreaByStatus(mogensStatus);
  } else {
    console.warn(`⚠️ Ugyldig status: ${newStatus} (skal være 1-5)`);
  }
}

// Funktion: Opdater status-bar farve baseret på status
function updateStatusBarColor(status) {
  const statusFill = document.getElementById('statusFill');
  
  // Opdater gradient baseret på status
  if (status <= 2) {
    statusFill.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'; // Rød gradient
  } else if (status === 3) {
    statusFill.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'; // Orange gradient
  } else {
    statusFill.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)'; // Grøn gradient
  }
}

// Simpel popup ved fuldført (5/5)
function showCompletionPopup() {
  const uiCfg = (config && config.ui && config.ui.completion_popup) || {};
  const title = uiCfg.title || 'Godt klaret!';
  const message = uiCfg.message || "Godt klaret, du lykkedes med at have en god patientsamtale!";

  // Opret overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.4)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';

  // Opret modal boks
  const modal = document.createElement('div');
  modal.style.background = '#ffffff';
  modal.style.borderRadius = '12px';
  modal.style.padding = '24px';
  modal.style.width = 'min(520px, 90vw)';
  modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
  modal.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

  const h3 = document.createElement('h3');
  h3.textContent = title;
  h3.style.margin = '0 0 12px 0';
  h3.style.fontSize = '1.25rem';
  h3.style.fontWeight = '600';

  const body = document.createElement('div');
  body.innerHTML = message;
  body.style.color = '#374151';
  body.style.lineHeight = '1.5';
  body.style.marginBottom = '16px';

  const btn = document.createElement('button');
  btn.textContent = 'OK';
  btn.style.background = '#0ea5e9';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '8px';
  btn.style.padding = '10px 16px';
  btn.style.cursor = 'pointer';
  btn.style.fontWeight = '600';

  btn.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  modal.appendChild(h3);
  modal.appendChild(body);
  modal.appendChild(btn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// Registrer afslutning på samtalen baseret på patientens tekst
function checkForEndConversation(text, patientName) {
  try {
    const normalized = (text || '').toLowerCase();
    // Simple heuristik: indeholder "tak for samtalen" eller "tak for i dag"
    if (normalized.includes('tak for samtalen') || normalized.includes('tak for i dag') || normalized.includes('tak for idag')) {
      showEndConversationPopup(patientName);
    }
  } catch (e) {
    // Ignorer fejl
  }
}

function showEndConversationPopup(patientName) {
  const uiCfg = (config && config.ui && config.ui.end_conversation_popup) || {};
  const title = uiCfg.title || 'Samtalen er afsluttet';
  const message = uiCfg.message || `${patientName || 'Patienten'} sluttede samtalen.`;
  const buttonText = uiCfg.button_text || 'Prøv igen';

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.4)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';

  const modal = document.createElement('div');
  modal.style.background = '#ffffff';
  modal.style.borderRadius = '12px';
  modal.style.padding = '24px';
  modal.style.width = 'min(520px, 90vw)';
  modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
  modal.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

  const h3 = document.createElement('h3');
  h3.textContent = title;
  h3.style.margin = '0 0 12px 0';
  h3.style.fontSize = '1.25rem';
  h3.style.fontWeight = '600';

  const body = document.createElement('div');
  body.innerHTML = message;
  body.style.color = '#374151';
  body.style.lineHeight = '1.5';
  body.style.marginBottom = '16px';

  const btn = document.createElement('button');
  btn.textContent = buttonText;
  btn.style.background = '#0ea5e9';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '8px';
  btn.style.padding = '10px 16px';
  btn.style.cursor = 'pointer';
  btn.style.fontWeight = '600';

  btn.addEventListener('click', () => {
    window.location.reload();
  });

  modal.appendChild(h3);
  modal.appendChild(body);
  modal.appendChild(btn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// Funktion: Opdater område baseret på Mogens' status
function updateAreaByStatus(status) {
  const mogensProfile = document.querySelector('.mogens-profile');
  const mogensPortrait = document.querySelector('.mogens-portrait');
  
  console.log(`🔍 Søger efter DOM elementer...`);
  console.log(`🔍 mogensProfile:`, mogensProfile);
  console.log(`🔍 mogensPortrait:`, mogensPortrait);
  
  if (!mogensProfile) {
    console.error('❌ .mogens-profile element ikke fundet');
    return;
  }
  
  if (!mogensPortrait) {
    console.warn('⚠️ .mogens-portrait element ikke fundet');
  }
  
  // Fjern alle status-klasser
  mogensProfile.classList.remove('status-1', 'status-2', 'status-3', 'status-4', 'status-5');
  
  // Tilføj ny status-klasse
  mogensProfile.classList.add(`status-${status}`);
  
  console.log(`🖼️ Opdateret område til status ${status}`);
  console.log(`🖼️ Mogens profile klasser:`, mogensProfile.className);
}

// Funktion: Rens Mogens' svar - fjern alle hårde klammer før ElevenLabs
function cleanMogensReply(reply) {
  // Fjern alle hårde klammer [tekst] fra svaret før det sendes til ElevenLabs
  return reply.replace(/\[[^\]]*\]/g, '').trim();
}

// Helper: Begræns statusændring til højst ±1 fra nuværende status
function clampStatusStep(currentStatus, proposedStatus) {
  if (proposedStatus == null) return currentStatus;
  if (typeof currentStatus !== 'number') return proposedStatus;
  const minAllowed = Math.max(1, currentStatus - 1);
  const maxAllowed = Math.min(5, currentStatus + 1);
  return Math.max(minAllowed, Math.min(maxAllowed, proposedStatus));
}

// Funktion: Få beskrivelse af status
function getStatusDescription(status) {
  const descriptions = config.characters.mogens.status_descriptions;
  return descriptions[status] || "Ukendt status";
}

// Funktion: Parse status fra evaluation feedback
function parseStatusFromEvaluation(feedback) {
  console.log(`🔍 Parser status fra feedback: "${feedback}"`);
  const statusMatch = feedback.match(/\[Status:\s*(\d+)\]/);
  console.log(`🔍 Status match resultat:`, statusMatch);
  return statusMatch ? parseInt(statusMatch[1]) : null;
}

// Funktion: Parse attitude-tekst fra evaluation feedback
function parseAttitudeFromEvaluation(feedback) {
  console.log(`🔍 Parser attitude fra feedback: "${feedback}"`);
  const attitudeMatch = feedback.match(/\[Attitude:\s*([^\]]+)\]/);
  console.log(`🔍 Attitude match resultat:`, attitudeMatch);
  const result = attitudeMatch ? attitudeMatch[1].trim() : null;
  console.log(`🔍 Parsed attitude: "${result}"`);
  return result;
}

// Funktion: Evaluer brugerens ytring i relation til Mogens' svar
async function evaluateUserMessageInContext(userMessage, mogensReply, conversationContext, requestId) {
  try {
    console.log(`[${requestId}] 🔍 Starter evaluering...`);
    
    const requestBody = { 
      userMessage: userMessage,
      mogensReply: mogensReply,
      conversationContext: conversationContext.slice(-5) // Sidste 5 beskeder som kontekst
    };
    
    console.log(`[${requestId}] 🔍 Sender til evaluation API:`, requestBody);
    
    const res = await fetch('http://localhost:3000/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`[${requestId}] ✅ Evaluering modtaget`);
      console.log(`[${requestId}] 🔍 RAW evaluation data:`, data);
      console.log(`[${requestId}] 🔍 Evaluation text: "${data.evaluation}"`);
      return data.evaluation;
    } else {
      console.error(`[${requestId}] ❌ Evaluering fejl:`, res.status);
      return null;
    }
  } catch (err) {
    console.error(`[${requestId}] ❌ Fejl ved evaluering af brugerbesked i kontekst:`, err);
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
      chatHTML += `<span class="user-message">${msg.sender}: ${msg.text}</span><span class="score-bubble loading" title="Venter på ${(patientConfig && patientConfig.name) || 'patientens'} svar...">⏳</span>\n\n`;
    } else {
      // Patientens beskeder uden score-kugle
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
    promptInput.placeholder = `Skriv din besked til ${(patientConfig && patientConfig.name) || 'patienten'}...`;
    sendButton.disabled = false;
    sendButton.textContent = "Send";
    micButton.disabled = false;
  } else {
    promptInput.disabled = true;
    promptInput.placeholder = `Venter på ${(patientConfig && patientConfig.name) || 'patientens'} svar...`;
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
  
  // Rens visningstekst: fjern Score/Status/Attitude tokens fra feedback-teksten
  const cleanedEvaluation = evaluation
    .replace(/\[Score:\s*\d+\/10\]/, '')
    .replace(/\[Status:\s*\d+\]/, '')
    .replace(/\[Attitude:\s*[^\]]+\]/, '')
    .trim();
  
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
        ${cleanedEvaluation}
      </div>
    </div>
  `;
  
  feedbackContent.innerHTML = feedbackHTML;
  
  // Opdater chat-visningen for at vise feedback-kugler
  updateChatDisplay();
}


// Funktion: Hent konfiguration fra server
async function loadConfig() {
  try {
    // Hent konfiguration via server
    const response = await fetch('http://localhost:3000/api/config');
    config = await response.json();
    console.log('✅ Konfiguration indlæst fra server');
    // Sæt aktiv patient (pt. Mogens)
    patientConfig = (config && config.characters && config.characters.mogens) ? config.characters.mogens : null;
    
    // Opdater UI med konfigurationen
    updateUIWithConfig();
    
    // Sæt initial status - vent lidt for at sikre DOM er klar
    setTimeout(() => {
      updateAreaByStatus(mogensStatus);
      console.log(`📊 ${(patientConfig && patientConfig.name) || 'Patient'}'s initiale status: ${mogensStatus}/5`);
    }, 500);
  } catch (error) {
    console.error('❌ Fejl ved indlæsning af konfiguration:', error);
  }
}

// Funktion: Genindlæs konfiguration (hot reload)
async function reloadConfig() {
  try {
    // Genindlæs config på serveren
    await fetch('http://localhost:3000/api/reload-config', { method: 'POST' });
    
    // Hent den nye config
    await loadConfig();
    console.log('🔄 Konfiguration genindlæst');
  } catch (error) {
    console.error('❌ Fejl ved genindlæsning af konfiguration:', error);
  }
}

// Funktion: Opdater UI med konfiguration
function updateUIWithConfig() {
  if (!config) return;
  
  // Opdater titel og beskrivelser
  const uiConfig = config.ui;
  if (uiConfig) {
    document.title = uiConfig.title || document.title;
    
    const headerTitle = document.querySelector('.logo h1');
    if (headerTitle && uiConfig.header?.title) {
      headerTitle.textContent = uiConfig.header.title;
    }
    
    const headerSubtitle = document.querySelector('.logo p');
    if (headerSubtitle && uiConfig.header?.subtitle) {
      headerSubtitle.textContent = uiConfig.header.subtitle;
    }
    
    const pageTitle = document.querySelector('.page-header h2');
    if (pageTitle && uiConfig.page?.title) {
      pageTitle.textContent = uiConfig.page.title;
    }
    
    const pageSubtitle = document.querySelector('.page-header .subtitle');
    if (pageSubtitle && uiConfig.page?.subtitle) {
      pageSubtitle.textContent = uiConfig.page.subtitle;
    }
    
    const taskDescription = document.querySelector('.task-description');
    if (taskDescription && uiConfig.page?.task_description) {
      taskDescription.innerHTML = uiConfig.page.task_description;
    }
    
    // Opdater Mogens' initiale status og statusbar
    const statusText = getStatusDescription(mogensStatus);
    const mogensStatusElement = document.getElementById('mogensStatus');
    if (mogensStatusElement) {
      mogensStatusElement.innerText = `Mogens' nuværende attitude: ${statusText} (Status: ${mogensStatus}/5)`;
      console.log(`✅ Mogens status opdateret i HTML: ${statusText} (Status: ${mogensStatus}/5)`);
    } else {
      console.error('❌ mogensStatus element ikke fundet i updateUIWithConfig');
    }
    const statusFillInit = document.getElementById('statusFill');
    if (statusFillInit) {
      const percentageInit = (mogensStatus / 5) * 100;
      statusFillInit.style.width = percentageInit + '%';
      updateStatusBarColor(mogensStatus);
    }
    
    const adviceTitle = document.querySelector('.advice-box h3');
    if (adviceTitle && uiConfig.advice?.title) {
      adviceTitle.textContent = uiConfig.advice.title;
    }
    
    const feedbackTitle = document.querySelector('.feedback-box h3');
    if (feedbackTitle && uiConfig.feedback?.title) {
      feedbackTitle.textContent = uiConfig.feedback.title;
    }
    
    const feedbackPlaceholder = document.querySelector('.feedback-placeholder');
    if (feedbackPlaceholder && uiConfig.feedback?.placeholder) {
      feedbackPlaceholder.textContent = uiConfig.feedback.placeholder;
    }
    
    const audioOverlayTitle = document.querySelector('.audio-overlay-content h3');
    if (audioOverlayTitle && uiConfig.audio_overlay?.title) {
      audioOverlayTitle.textContent = uiConfig.audio_overlay.title;
    }
    
    const audioOverlayButton = document.querySelector('.start-audio-btn');
    if (audioOverlayButton && uiConfig.audio_overlay?.button_text) {
      audioOverlayButton.textContent = uiConfig.audio_overlay.button_text;
    }
    
    const audioOverlayWarning = document.querySelector('.browser-warning');
    if (audioOverlayWarning && uiConfig.audio_overlay?.warning) {
      audioOverlayWarning.textContent = uiConfig.audio_overlay.warning;
    }
  }
}

// Initialiser alt når siden er loaded
document.addEventListener('DOMContentLoaded', async function() {
  // Indlæs konfiguration først
  await loadConfig();
  
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
  
  // Initialiser performance dashboard
  updatePerformanceDashboard();
  
  console.log('🚀 SDCC Talebot initialiseret med performance tracking');
  console.log('📊 Alle transaktioner logges med ID og timing');
  console.log('⚡ Optimeret med parallel processing og hurtigere modeller');
});
