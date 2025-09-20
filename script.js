// Gemmer dialogen mellem bruger og Mogens
let dialog = [];

// Holder styr på Mogens' nuværende status (1-5 skala)
let mogensStatus = 1; // Starter med status 1 (meget kritisk/lukket)
let currentStatusClass = null; // Holder styr på nuværende status-klasse
let currentImagePath = null; // Holder styr på nuværende billede-sti

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
let initialLoaderInterval = null; // Interval til loader-tekst

// Backend base URL. Tom streng = samme origin. Sættes automatisk til Render ved fallback
let API_BASE = '';
function apiUrl(path) {
  return (API_BASE ? API_BASE : '') + path;
}

// Funktion: Hent aktiv karakter fra URL parameter
function getActiveCharacter() {
  const urlParams = new URLSearchParams(window.location.search);
  const character = urlParams.get('character');
  
  // Validér at karakteren findes
  const validCharacters = ['mogens', 'bodil'];
  if (character && validCharacters.includes(character.toLowerCase())) {
    return character.toLowerCase();
  }
  
  // Default til mogens hvis ingen eller ugyldig parameter
  return 'mogens';
}

// Globale variabler for aktiv karakter
let activeCharacter = getActiveCharacter();
let configFileName = `config${activeCharacter === 'mogens' ? '' : '_' + activeCharacter}.json`;

console.log(`🎭 Aktiv karakter: ${activeCharacter}`);
console.log(`📄 Config fil: ${configFileName}`);

// Funktion: Afspil velkomstlyd når siden indlæses
function playWelcomeAudio() {
  try {
    // Stop eventuel eksisterende velkomstlyd
    if (welcomeAudio) {
      welcomeAudio.pause();
      welcomeAudio = null;
    }
    
    // Opret en ny Audio instans for velkomstlyden
    const welcomeFile = (patientConfig && patientConfig.audio_files?.welcome) || config.characters[activeCharacter].audio_files.welcome;
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
  // Vis loader indtil første lyd afspilles
  showInitialLoader();
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
    const waitingFiles = (patientConfig && patientConfig.audio_files?.waiting) || config.characters[activeCharacter].audio_files.waiting;
    const randomIndex = Math.floor(Math.random() * waitingFiles.length);
    const waitAudioPath = waitingFiles[randomIndex];
    
    // Opret og afspil ny ventelyd
    waitingAudio = new Audio(waitAudioPath);
    waitingAudio.volume = 0; // Start stille for fade-in
    waitingAudio.loop = true; // Gentag lyden indtil svaret kommer
    
    // Sæt tilfældig startposition (0-7 sekunder)
    const randomStartTime = Math.random() * 7;
    
    waitingAudio.addEventListener('loadedmetadata', () => {
      waitingAudio.currentTime = Math.min(randomStartTime, waitingAudio.duration || 0);
    });
    
    waitingAudio.play().catch(error => {
      console.log('Kunne ikke afspille ventelyd:', error);
    });
    
    // Fade-in effekt
    const targetVolume = config.audio.waiting_volume;
    const fadeInDuration = 1000; // 1 sekund fade-in
    const fadeInSteps = 20;
    const fadeInInterval = fadeInDuration / fadeInSteps;
    const volumeStep = targetVolume / fadeInSteps;
    
    let currentStep = 0;
    const fadeInTimer = setInterval(() => {
      currentStep++;
      if (currentStep <= fadeInSteps) {
        waitingAudio.volume = Math.min(targetVolume, waitingAudio.volume + volumeStep);
      } else {
        clearInterval(fadeInTimer);
        waitingAudio.volume = targetVolume;
      }
    }, fadeInInterval);
    
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
      hideInitialLoader();
      return;
    }
    const requestId = 'init_' + Math.random().toString(36).substr(2, 6);
    console.log(`[${requestId}] 🔊 Afspiller introducerende hilsen fra config`);
    // Brug eksisterende TTS-funktion; den tilføjer også beskeden til dialogen og opdaterer UI
    speakWithElevenLabsOnPlay(greeting, requestId);
  } catch (error) {
    console.error('Fejl ved afspilning af introducerende hilsen:', error);
    hideInitialLoader();
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
    
    // Tjek om vi er på FTP deployment (samme logik som i loadConfig)
    const isLocalServer = window.location.protocol === 'file:' || 
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';

    let res;
    if (isLocalServer) {
      // På lokal server: Prøv lokal API først, derefter Render
      try {
        res = await fetch(apiUrl('/api/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userMessage, 
            dialog
          }),
          signal: AbortSignal.timeout(10000) // 10 sek timeout
        });
      } catch (fetchErr) {
        console.log(`[${requestId}] ⚠️ Lokal server ikke tilgængelig, prøver Render...`);
        if (!API_BASE) {
          API_BASE = 'https://sdcc-tale-rsbot.onrender.com';
          try {
            res = await fetch(apiUrl('/api/chat'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                message: userMessage, 
                dialog
              }),
              signal: AbortSignal.timeout(15000) // 15 sek timeout for Render
            });
          } catch (renderErr) {
            console.error(`[${requestId}] ❌ Render server også utilgængelig:`, renderErr);
            throw renderErr;
          }
        } else {
          throw fetchErr;
        }
      }
    } else {
      // På FTP: Gå direkte til Render server
      console.log(`[${requestId}] 🌐 FTP deployment detekteret, bruger Render til chat...`);
      if (!API_BASE) {
        API_BASE = 'https://sdcc-tale-rsbot.onrender.com';
      }
      res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage, 
          dialog
        }),
        signal: AbortSignal.timeout(15000) // 15 sek timeout for Render
      });
    }
    
    const openaiTime = Date.now() - openaiStartTime;
    console.log(`[${requestId}] ✅ OpenAI API svaret på ${openaiTime}ms`);
    
    const data = await res.json();
    const mogensReply = data.reply || `Ingen svar fra ${(patientConfig && patientConfig.name) || 'Patient'}.`;

    console.log(`[${requestId}] 💭 ${(patientConfig && patientConfig.name) || 'Patient'}'s svar modtaget: "${mogensReply}"`);

    // Rens svaret og gem det rene svar i dialogen (ingen status-parsing længere)
    const cleanReply = cleanMogensReply(mogensReply);

    // Sekventiel behandling: Først lyd (Mogens' svar), derefter evaluering
    console.log(`[${requestId}] 🔊 Starter lyd, derefter evaluering...`);
    try {
      await speakWithElevenLabsOnPlay(cleanReply, requestId);
      console.log(`[${requestId}] ✅ Lyd generering færdig`);
    } catch (audioErr) {
      console.error(`[${requestId}] ❌ Lyd generering fejlede:`, audioErr);
    }

    let evaluationText = null;
    try {
      evaluationText = await evaluateUserMessageInContext(userMessage, cleanReply, dialog, requestId);
    } catch (evalErr) {
      console.error(`[${requestId}] ❌ Evaluering kastede fejl:`, evalErr);
    }

    if (evaluationText) {
      console.log(`[${requestId}] ✅ Evaluering færdig`);
      const lastUserMessage = dialog.findLast(msg => msg.sender === "Dig");
      if (lastUserMessage) {
        lastUserMessage.feedback = evaluationText;
        displayFeedback(evaluationText);
        updateChatDisplay();
        
        // Parse og opdater Mogens' status og attitude fra evaluation feedback
        console.log(`🔍 Evaluation feedback: "${evaluationText}"`);
        let newStatus = parseStatusFromEvaluation(evaluationText);
        const newAttitude = parseAttitudeFromEvaluation(evaluationText);
        console.log(`🔍 Parsed status: ${newStatus}, attitude: ${newAttitude}`);
        
        // Regel: Efter første bruger-ytring er status 1, med mindre score > 8
        const userMsgCount = dialog.filter(m => m.sender === "Dig").length;
        if (userMsgCount === 1) {
          const firstScore = extractScoreFromFeedback(evaluationText);
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
          await updateMogensStatusFromEvaluation(clamped, newAttitude);
        } else {
          console.warn(`⚠️ Ingen gyldig status fundet i evaluation: ${newStatus}`);
        }
      }
    } else {
      console.error(`[${requestId}] ❌ Evaluering fejlede eller tomt resultat`);
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

    // Tjek om vi er på FTP deployment (samme logik som i loadConfig)
    const isLocalServer = window.location.protocol === 'file:' || 
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';

    let res;
    if (isLocalServer) {
      // På lokal server: Prøv lokal API først, derefter Render
      try {
        res = await fetch(apiUrl('/api/speak'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text,
            character: activeCharacter
          }),
          signal: AbortSignal.timeout(15000) // 15 sek timeout for lyd
        });
      } catch (fetchErr) {
        console.log(`[${requestId}] ⚠️ Lokal server ikke tilgængelig til lyd, prøver Render...`);
        if (!API_BASE) {
          API_BASE = 'https://sdcc-tale-rsbot.onrender.com';
          try {
            res = await fetch(apiUrl('/api/speak'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                text,
                character: activeCharacter
              }),
              signal: AbortSignal.timeout(20000) // 20 sek timeout for Render lyd
            });
          } catch (renderErr) {
            console.error(`[${requestId}] ❌ Render server også utilgængelig til lyd:`, renderErr);
            throw renderErr;
          }
        } else {
          throw fetchErr;
        }
      }
    } else {
      // På FTP: Gå direkte til Render server
      console.log(`[${requestId}] 🌐 FTP deployment detekteret, bruger Render til lyd...`);
      if (!API_BASE) {
        API_BASE = 'https://sdcc-tale-rsbot.onrender.com';
      }
      res = await fetch(apiUrl('/api/speak'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          character: activeCharacter
        }),
        signal: AbortSignal.timeout(20000) // 20 sek timeout for Render lyd
      });
    }
    
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
          // Skjul initial loader når første lyd starter
          hideInitialLoader();
          
          audioPlayer.onplay = null;
        };
        // Fokus på input når lyden slutter
        audioPlayer.onended = function() {
          const promptInput = document.getElementById('prompt');
          if (promptInput) {
            // Undgå auto-fokus på mobile enheder for at forhindre zoom
            if (!isMobileDevice()) {
              promptInput.focus();
            }
          }
          audioPlayer.onended = null;
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
    hideInitialLoader();
    throw err;
  }
}

// Loader: vis ved opstart indtil første lyd afspilles
function showInitialLoader() {
  try {
    let loader = document.getElementById('initialLoader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'initialLoader';
      loader.style.display = 'flex';
      loader.style.alignItems = 'center';
      loader.style.gap = '10px';
      loader.style.padding = '10px 12px';
      loader.style.border = '1px solid #e5e7eb';
      loader.style.borderRadius = '10px';
      loader.style.background = '#ffffff';
      loader.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
      loader.style.width = 'fit-content';
      loader.style.margin = '12px 0';

      const dot = document.createElement('div');
      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.borderRadius = '50%';
      dot.style.background = '#10b981';
      dot.style.opacity = '0.8';

      const text = document.createElement('div');
      text.id = 'initialLoaderText';
      text.style.color = '#374151';
      text.style.fontSize = '0.95rem';
      text.textContent = 'Mogens forbereder sig';

      loader.appendChild(dot);
      loader.appendChild(text);

      const chatContainer = document.querySelector('.chat-container');
      const chatHeader = document.querySelector('.chat-header');
      if (chatContainer) {
        if (chatHeader && chatHeader.parentNode === chatContainer) {
          chatHeader.after(loader);
        } else {
          chatContainer.prepend(loader);
        }
      }

      let dots = 0;
      initialLoaderInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        const t = document.getElementById('initialLoaderText');
        if (t) t.textContent = 'Mogens forbereder sig' + '.'.repeat(dots);
      }, 500);
    } else {
      loader.style.display = 'flex';
    }
  } catch (e) {
    // Ignorer fejl
  }
}

function hideInitialLoader() {
  try {
    if (initialLoaderInterval) {
      clearInterval(initialLoaderInterval);
      initialLoaderInterval = null;
    }
    const loader = document.getElementById('initialLoader');
    if (loader) loader.remove();
  } catch (e) {
    // Ignorer fejl
  }
}

// Helper: Detekter mobil/tablet (simple heuristik)
function isMobileDevice() {
  try {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    return /android|iphone|ipad|ipod|iemobile|opera mini/i.test(ua) || isTouch;
  } catch (e) {
    return false;
  }
}

// Funktion: Opdater patientens status baseret på evaluation feedback
async function updateMogensStatusFromEvaluation(newStatus, newAttitude = null) {
  console.log(`🔍 updateMogensStatusFromEvaluation kaldt med: newStatus=${newStatus}, newAttitude=${newAttitude}`);
  
  if (newStatus >= 1 && newStatus <= 5) {
    const oldStatus = mogensStatus;
    
    // Tjek om status faktisk ændrer sig
    if (newStatus === oldStatus) {
      console.log(`ℹ️ Status ${newStatus} er uændret - ingen opdatering nødvendig`);
      return;
    }
    
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
      mogensStatusElement.innerText = `${(patientConfig && patientConfig.name) || 'Patient'}s nuværende attitude: \n\n ${statusText}`;
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
    await updateAreaByStatus(mogensStatus);
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

// Funktion: Skift billede med fade out/in effekt
function changeImageWithFade(newImagePath, imageElement, fadeDuration = 500) {
  return new Promise((resolve) => {
    if (!imageElement || !newImagePath) {
      resolve();
      return;
    }
    
    // Fade out
    imageElement.style.transition = `opacity ${fadeDuration/2}ms ease-in-out`;
    imageElement.style.opacity = '0';
    
    setTimeout(() => {
      // Skift billede
      imageElement.src = newImagePath;
      
      // Fade in
      setTimeout(() => {
        imageElement.style.opacity = '1';
        setTimeout(resolve, fadeDuration/2);
      }, 50); // Kort forsinkelse for at sikre billedet er indlæst
    }, fadeDuration/2);
  });
}

// Funktion: Opdater område baseret på Mogens' status
async function updateAreaByStatus(status) {
  const mogensProfile = document.querySelector('.mogens-profile');
  const mogensPortrait = document.querySelector('.mogens-portrait');
  
  console.log(`🔍 Søger efter DOM elementer...`);
  console.log(`🔍 mogensProfile:`, mogensProfile);
  console.log(`🔍 mogensPortrait:`, mogensPortrait);
  
  if (!mogensProfile) {
    console.error('❌ .mogens-profile element ikke fundet');
    return;
  }
  
  const newStatusClass = `status-${status}`;
  const statusImages = (patientConfig && patientConfig.status_images) || 
                      (config && config.characters && config.characters[activeCharacter] && config.characters[activeCharacter].status_images);
  const newImagePath = statusImages && statusImages[status.toString()] ? statusImages[status.toString()] : null;
  
  // Tjek om status-klasse ændrer sig
  if (currentStatusClass === newStatusClass) {
    console.log(`ℹ️ Status-klasse ${newStatusClass} er uændret`);
  } else {
    // Fjern alle status-klasser
    mogensProfile.classList.remove('status-1', 'status-2', 'status-3', 'status-4', 'status-5');
    
    // Tilføj ny status-klasse
    mogensProfile.classList.add(newStatusClass);
    currentStatusClass = newStatusClass;
    
    console.log(`🔄 Status-klasse ændret til: ${newStatusClass}`);
  }
  
  // Tjek om billede ændrer sig
  if (mogensPortrait && newImagePath) {
    if (currentImagePath === newImagePath) {
      console.log(`ℹ️ Billede ${newImagePath} er uændret - ingen skift nødvendig`);
    } else {
      console.log(`🖼️ Skifter billede fra ${currentImagePath} til: ${newImagePath}`);
      
      try {
        await changeImageWithFade(newImagePath, mogensPortrait, 600);
        currentImagePath = newImagePath;
        console.log(`✅ Billede skiftet til status ${status} med fade-effekt`);
      } catch (error) {
        console.error('❌ Fejl ved skift af billede:', error);
        // Fallback: skift direkte uden fade
        mogensPortrait.src = newImagePath;
        currentImagePath = newImagePath;
      }
    }
  } else if (mogensPortrait && !newImagePath) {
    console.warn(`⚠️ Ingen billede fundet for status ${status}`);
    console.warn(`⚠️ Tilgængelige keys:`, statusImages ? Object.keys(statusImages) : 'undefined');
  } else {
    console.warn('⚠️ .mogens-portrait element ikke fundet');
  }
  
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
  // Først prøv patientConfig, derefter fallback til config.characters
  let descriptions = null;
  
  if (patientConfig && patientConfig.status_descriptions) {
    descriptions = patientConfig.status_descriptions;
  } else if (config && config.characters && config.characters[activeCharacter] && config.characters[activeCharacter].status_descriptions) {
    descriptions = config.characters[activeCharacter].status_descriptions;
  }
  
  if (!descriptions) {
    console.warn(`⚠️ Ingen status_descriptions fundet for karakter: ${activeCharacter}`);
    return "Ukendt status";
  }
  
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
    
    // Tjek om vi er på FTP deployment (samme logik som i loadConfig)
    const isLocalServer = window.location.protocol === 'file:' || 
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';

    let res;
    if (isLocalServer) {
      // På lokal server: Prøv lokal API først, derefter Render
      try {
        res = await fetch(apiUrl('/api/evaluate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(10000) // 10 sek timeout for evaluering
        });
      } catch (fetchErr) {
        console.log(`[${requestId}] ⚠️ Lokal server ikke tilgængelig til evaluering, prøver Render...`);
        if (!API_BASE) {
          API_BASE = 'https://sdcc-tale-rsbot.onrender.com';
          try {
            res = await fetch(apiUrl('/api/evaluate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
              signal: AbortSignal.timeout(15000) // 15 sek timeout for Render evaluering
            });
          } catch (renderErr) {
            console.error(`[${requestId}] ❌ Render server også utilgængelig til evaluering:`, renderErr);
            throw renderErr;
          }
        } else {
          throw fetchErr;
        }
      }
    } else {
      // På FTP: Gå direkte til Render server
      console.log(`[${requestId}] 🌐 FTP deployment detekteret, bruger Render til evaluering...`);
      if (!API_BASE) {
        API_BASE = 'https://sdcc-tale-rsbot.onrender.com';
      }
      res = await fetch(apiUrl('/api/evaluate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000) // 15 sek timeout for Render evaluering
      });
    }
    
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
      
      // Tjek om denne besked er markeret
      const isHighlighted = msg.highlighted || false;
      const highlightClass = isHighlighted ? 'user-message-highlighted' : '';
      
      // Bestem styling baseret på score
      let style = '';
      if (isHighlighted) {
        let backgroundColor = '';
        if (scoreClass === 'score-excellent') {
          backgroundColor = '#059669'; // Mørkegrøn for 8-10
        } else if (scoreClass === 'score-good') {
          backgroundColor = '#10b981'; // Grøn for 6-7
        } else if (scoreClass === 'score-average') {
          backgroundColor = '#f59e0b'; // Orange for 4-5
        } else if (scoreClass === 'score-poor') {
          backgroundColor = '#ef4444'; // Rød for 1-3
        }
        
        style = `style="background: ${backgroundColor}; color: white; padding: 0.5rem 0.75rem; border-radius: 8px; border-left: 3px solid ${backgroundColor}; transition: all 0.3s ease;"`;
      }
      
      chatHTML += `<span class="user-message ${highlightClass}" ${style}>${msg.sender}: ${msg.text}</span><span class="score-bubble ${scoreClass} clickable" data-feedback="${msg.feedback}" title="Klik for at se feedback (Score: ${score}/10)">${score}</span>\n\n`;
      // Debug: console.log('🔍 Tilføjet HTML for brugerbesked med score:', score, 'klasse:', scoreClass, 'highlighted:', isHighlighted);
    } else if (msg.sender === "Dig") {
      // Brugerbesked uden feedback endnu
      chatHTML += `<span class="user-message">${msg.sender}: ${msg.text}</span><span class="score-bubble loading" title="Venter på ${(patientConfig && patientConfig.name) || 'patientens'} svar...">⏳</span>\n\n`;
    } else {
      // Patientens beskeder uden score-kugle
      chatHTML += `${msg.sender}: ${msg.text}\n\n`;
    }
  });
  
  chatMessages.innerHTML = chatHTML;
  // Debug: console.log('🔍 updateChatDisplay - HTML sat, antal brugerbeskeder med feedback:', dialog.filter(m => m.sender === "Dig" && m.feedback).length);
  
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
  // Debug: console.log('🔍 addScoreBubbleClickListeners kaldt, fundet', scoreBubbles.length, 'score-bobler');
  
  scoreBubbles.forEach((bubble) => {
    bubble.addEventListener('click', function() {
      // Debug: console.log('🔍 Score-boble klikket:', this);
      const feedback = this.getAttribute('data-feedback');
      if (feedback) {
        // Debug: console.log('🔍 Feedback fundet:', feedback);
        
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
  // Debug: console.log('🔍 highlightUserMessage kaldt med:', clickedBubble);
  
  // Fjern alle tidligere markeringer fra dialog arrayet
  dialog.forEach(msg => {
    if (msg.sender === "Dig") {
      msg.highlighted = false;
    }
  });
  
  // Find den klikkede besked - prøv forskellige metoder
  let userMessage = clickedBubble.previousElementSibling;
  
  // Hvis previousElementSibling ikke virker, prøv at finde parent og søg
  if (!userMessage || !userMessage.classList.contains('user-message')) {
    const parent = clickedBubble.parentElement;
    if (parent) {
      const allSpans = parent.querySelectorAll('span');
      for (let i = 0; i < allSpans.length; i++) {
        if (allSpans[i] === clickedBubble && i > 0) {
          userMessage = allSpans[i - 1];
          break;
        }
      }
    }
  }
  
  if (userMessage && userMessage.classList.contains('user-message')) {
    // Find den tilsvarende besked i dialog arrayet
    const messageText = userMessage.textContent;
    const correspondingMessage = dialog.find(msg => 
      msg.sender === "Dig" && msg.text && messageText.includes(msg.text)
    );
    
    if (correspondingMessage) {
      // Markér beskeden i dialog arrayet
      correspondingMessage.highlighted = true;
      
      // Opdater chat display for at vise markeringen
      updateChatDisplay();
    }
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
    // For FTP deployment: Prøv først lokal config.json direkte
    console.log('🔄 Indlæser konfiguration...');
    
    // Tjek om vi er på en lokal server eller FTP
    const isLocalServer = window.location.protocol === 'file:' || 
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    if (isLocalServer) {
      // På lokal server: Prøv API først, derefter lokal config
      let response;
      try {
        response = await fetch(apiUrl('/api/config'), { 
          signal: AbortSignal.timeout(3000) // 3 sek timeout
        });
      } catch (err) {
        console.log('Lokal server ikke tilgængelig, bruger lokal config...');
        response = null;
      }

      if (!response || !response.ok) {
        await loadLocalConfig();
        return;
      }

      try {
        config = await response.json();
        console.log('✅ Konfiguration indlæst fra lokal server');
      } catch (e) {
        console.log('JSON parse fejlede, bruger lokal config...');
        await loadLocalConfig();
        return;
      }
    } else {
      // På FTP: Brug direkte lokal config.json
      console.log('🌐 FTP deployment detekteret, bruger lokal config...');
      await loadLocalConfig();
      return;
    }
    
    // Sæt aktiv patient
    patientConfig = (config && config.characters && config.characters[activeCharacter]) ? config.characters[activeCharacter] : null;
    
    console.log(`🎭 Søger efter karakter: ${activeCharacter}`);
    console.log(`📋 Tilgængelige karakterer:`, config.characters ? Object.keys(config.characters) : 'Ingen');
    console.log(`👤 PatientConfig sat:`, patientConfig ? patientConfig.name : 'Ikke fundet');
    
    console.log('✅ Konfiguration og status_images indlæst korrekt');
    
    // Opdater UI med konfigurationen
    updateUIWithConfig();
    
    // Sæt initial status - vent lidt for at sikre DOM er klar
    setTimeout(async () => {
      // Initialiser tracking variabler
      currentStatusClass = `status-${mogensStatus}`;
      const statusImages = (patientConfig && patientConfig.status_images) || 
                          (config && config.characters && config.characters[activeCharacter] && config.characters[activeCharacter].status_images);
      currentImagePath = statusImages && statusImages[mogensStatus.toString()] ? statusImages[mogensStatus.toString()] : null;
      
      await updateAreaByStatus(mogensStatus);
      console.log(`📊 ${(patientConfig && patientConfig.name) || 'Patient'}'s initiale status: ${mogensStatus}/5`);
    }, 500);
  } catch (error) {
    console.error('❌ Fejl ved indlæsning af konfiguration:', error);
    console.log('Forsøger at bruge lokal config...');
    await loadLocalConfig();
  }
}

// Funktion: Indlæs lokal config fil som fallback
async function loadLocalConfig() {
  try {
    console.log(`📁 Indlæser lokal ${configFileName}...`);
    const response = await fetch(`./${configFileName}`, {
      signal: AbortSignal.timeout(5000) // 5 sek timeout
    });
    
    if (response.ok) {
      config = await response.json();
      console.log('✅ Lokal konfiguration indlæst');
      
      // Sæt aktiv patient
      patientConfig = (config && config.characters && config.characters[activeCharacter]) ? config.characters[activeCharacter] : null;
      
      console.log(`🎭 Søger efter karakter: ${activeCharacter}`);
      console.log(`📋 Tilgængelige karakterer:`, config.characters ? Object.keys(config.characters) : 'Ingen');
      console.log(`👤 PatientConfig sat:`, patientConfig ? patientConfig.name : 'Ikke fundet');
      
      console.log('✅ Lokal konfiguration og status_images indlæst korrekt');
      
      // Opdater UI med konfigurationen
      updateUIWithConfig();
      
      // Sæt initial status - vent lidt for at sikre DOM er klar
      setTimeout(async () => {
        // Initialiser tracking variabler
        currentStatusClass = `status-${mogensStatus}`;
        const statusImages = (patientConfig && patientConfig.status_images) || 
                            (config && config.characters && config.characters[activeCharacter] && config.characters[activeCharacter].status_images);
        currentImagePath = statusImages && statusImages[mogensStatus.toString()] ? statusImages[mogensStatus.toString()] : null;
        
        await updateAreaByStatus(mogensStatus);
        console.log(`📊 ${(patientConfig && patientConfig.name) || 'Patient'}'s initiale status: ${mogensStatus}/5`);
      }, 100); // Reduceret fra 500ms til 100ms
    } else {
      throw new Error(`Lokal ${configFileName} ikke fundet`);
    }
  } catch (error) {
    console.error('❌ Fejl ved indlæsning af lokal konfiguration:', error);
    console.log('🔄 Bruger minimal fallback konfiguration...');
    
    // Bruger en minimal fallback config
    config = {
      characters: {
        mogens: {
          name: "Mogens Mortensen",
          audio_files: {
            welcome: "audio/mogens_velkomst.mp3",
            waiting: ["audio/mogens_ny_wait1.mp3", "audio/mogens_ny_wait2.mp3"]
          },
          status_descriptions: {
            "1": "Meget kritisk overfor dig",
            "2": "Kritisk og tøvende", 
            "3": "Lidt åben og spørgende",
            "4": "Tæt på accept og samarbejdsvillig",
            "5": "Positiv og indvilger i målinger"
          },
          status_images: {
            "1": "images/mogens_lvl1.png",
            "2": "images/mogens_lvl2.png", 
            "3": "images/mogens_lvl3.png",
            "4": "images/mogens_lvl4.png",
            "5": "images/mogens_lvl5.png"
          }
        }
      },
      audio: {
        welcome_volume: 0.8,
        waiting_volume: 0.6,
        fade_out_duration: 300,
        fade_out_steps: 10,
        play_delay: 300
      },
      ui: {
        title: "Chat med Mogens – SDCC Læring",
        header: { title: "SDCC Læring", subtitle: "Steno Diabetes Center Copenhagen" }
      }
    };
    
    patientConfig = config.characters[activeCharacter];
    updateUIWithConfig();
    
    // Sæt initial status hurtigere for fallback
    setTimeout(async () => {
      currentStatusClass = `status-${mogensStatus}`;
      currentImagePath = config.characters[activeCharacter].status_images[mogensStatus.toString()];
      await updateAreaByStatus(mogensStatus);
      console.log(`📊 ${patientConfig.name}'s initiale status: ${mogensStatus}/5 (fallback)`);
    }, 100);
    
    console.log('⚠️ Bruger minimal fallback konfiguration');
  }
}

// Funktion: Genindlæs konfiguration (hot reload)
async function reloadConfig() {
  try {
    // Genindlæs config på serveren (kun hvis server er tilgængelig)
    if (API_BASE) {
      try {
        await fetch(apiUrl('/api/reload-config'), { method: 'POST' });
      } catch (err) {
        console.log('Server reload ikke tilgængelig, genindlæser lokal config...');
      }
    }
    
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
      mogensStatusElement.innerText = `${(patientConfig && patientConfig.name) || 'Patient'}s nuværende attitude: \n\n ${statusText}`;
      ///mogensStatusElement.innerText = `Mogens' nuværende attitude: ${statusText} (Status: ${mogensStatus}/5)`;
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

  // Info button functionality
  document.getElementById('infoButton').addEventListener('click', function() {
    showPatientInfo();
  });

  // Close modal when clicking X
  document.getElementById('infoModalClose').addEventListener('click', function() {
    hidePatientInfo();
  });

  // Close modal when clicking outside
  document.getElementById('infoModal').addEventListener('click', function(event) {
    if (event.target === this) {
      hidePatientInfo();
    }
  });
  
  // Initialiser performance dashboard
  updatePerformanceDashboard();
  
  // Global click listener til at fjerne tekst-markering når man klikker på noget andet
  document.addEventListener('click', function(event) {
    // Tjek om klikket element er en score-boble
    if (!event.target.classList.contains('score-bubble')) {
      // Fjern alle markeringer fra dialog arrayet
      let hasHighlightedMessages = false;
      dialog.forEach(msg => {
        if (msg.sender === "Dig" && msg.highlighted) {
          msg.highlighted = false;
          hasHighlightedMessages = true;
        }
      });
      
      // Opdater chat display hvis der var markeringer
      if (hasHighlightedMessages) {
        updateChatDisplay();
      }
      
      // Fjern aktiv klasse fra score-bobler
      const scoreBubbles = document.querySelectorAll('.score-bubble.clickable');
      scoreBubbles.forEach(bubble => bubble.classList.remove('active'));
    }
  });
  
  console.log('🚀 SDCC Talebot initialiseret med performance tracking');
  console.log('📊 Alle transaktioner logges med ID og timing');
  console.log('⚡ Optimeret med parallel processing og hurtigere modeller');
});

// Patient info modal functions
function showPatientInfo() {
  const modal = document.getElementById('infoModal');
  const content = document.getElementById('infoModalContent');
  
  if (!patientConfig) {
    console.error('Patient config ikke tilgængelig');
    return;
  }
  
  // Build patient information HTML
  let html = `
    <div class="info-section">
      <h4>Grundlæggende Information</h4>
      <ul class="info-list">
        <li><strong>Navn:</strong> ${patientConfig.name}</li>
        <li><strong>Alder:</strong> ${patientConfig.age} år</li>
        <li><strong>Sygdom:</strong> ${patientConfig.condition}</li>
        <li><strong>BMI:</strong> ${patientConfig.health_profile.BMI}</li>
      </ul>
    </div>
    
    <div class="info-section">
      <h4>Sundhedsprofil</h4>
      <ul class="info-list">
        <li><strong>Diagnose:</strong> ${patientConfig.health_profile.diagnosis_years} år</li>
        <li><strong>HbA1c:</strong> ${patientConfig.health_profile.HbA1c}</li>
        <li><strong>Nuværende behandling:</strong> ${patientConfig.health_profile.current_treatment.join(', ')}</li>
        <li><strong>Tidligere behandling:</strong> ${patientConfig.health_profile.previous_treatment.join(', ')}</li>
      </ul>
    </div>
    
    <div class="info-section">
      <h4>Symptomer</h4>
      <ul class="info-list">
        ${patientConfig.health_profile.symptoms.map(symptom => `<li>${symptom}</li>`).join('')}
      </ul>
    </div>
    
    <div class="info-section">
      <h4>Komplikationer</h4>
      <ul class="info-list">
        ${patientConfig.health_profile.complications.map(complication => `<li>${complication}</li>`).join('')}
      </ul>
    </div>
    
    <div class="info-section">
      <h4>Baggrund</h4>
      <p>${patientConfig.background}</p>
    </div>
  `;
  
  content.innerHTML = html;
  modal.style.display = 'block';
}

function hidePatientInfo() {
  const modal = document.getElementById('infoModal');
  modal.style.display = 'none';
}
