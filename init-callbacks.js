// init-callbacks.js
// Initialiserer JSONP callbacks til config loading
(function() {
    'use strict';
    
    console.log('🔧 Initialiserer JSONP callbacks...');
    
    // Global variabler til at holde config data
    window.configMogensData = null;
    window.configBodilData = null;
    
    // Callback for Mogens config
    window.configMogensDataCallback = function(data) {
        window.configMogensData = data;
        console.log('✓ Mogens config loaded via JSONP callback');
    };
    
    // Callback for Bodil config
    window.configBodilDataCallback = function(data) {
        window.configBodilData = data;
        console.log('✓ Bodil config loaded via JSONP callback');
    };
    
    console.log('✅ JSONP callbacks klar til brug');
})();





