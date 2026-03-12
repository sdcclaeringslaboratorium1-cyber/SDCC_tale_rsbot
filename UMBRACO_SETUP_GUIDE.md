# UMBRACO Setup Guide - SDCC Talebot

## Oversigt
Denne guide forklarer hvordan du embeder SDCC Talebot i Umbraco CMS ved hjælp af JSONP til at undgå CORS-problemer.

## Filer der skal uploades til server

### 1. JavaScript filer
- `config_mogens.js` - JSONP config fil for Mogens karakter
- `config_bodil.js` - JSONP config fil for Bodil karakter
- `script.js` - Hovedscript med al funktionalitet
- `init-callbacks.js` - JSONP callback initialisering (valgfri, bruges kun hvis du ikke bruger inline callbacks)

### 2. CSS filer
- `style.css` - Alle styling regler

### 3. HTML fil
- `UMBRACO_COMPLETE_HTML.html` - Komplet HTML til Umbraco HTML element

### 4. Assets (billeder, lyd)
- `images/` mappe med alle patient billeder
- `audio/` mappe med alle lydfiler

## Upload struktur på server

Upload alle filer til:
```
https://kompetenceudvikling.videncenterfordiabetes.dk/chatbotDDM13/
```

Struktur:
```
chatbotDDM13/
├── config_mogens.js
├── config_bodil.js
├── script.js
├── init-callbacks.js (valgfri)
├── style.css
├── images/
│   ├── mogens_lvl1.png
│   ├── mogens_lvl2.png
│   ├── mogens_lvl3.png
│   ├── mogens_lvl4.png
│   ├── mogens_lvl5.png
│   ├── bodil_lvl1.png
│   ├── bodil_lvl2.png
│   ├── bodil_lvl3.png
│   ├── bodil_lvl4.png
│   └── bodil_lvl5.png
└── audio/
    ├── mogens_velkomst.mp3
    ├── mogensintrowait.mp3
    ├── mogens_ny_wait1.mp3
    ├── mogens_ny_wait2.mp3
    ├── bodil_velkomst.mp3
    ├── bodilintrowait.mp3
    ├── bodil_wait1.mp3
    └── bodil_wait2.mp3
```

## Trin-for-trin setup i Umbraco

### Trin 1: Upload filer til serveren
1. Upload alle ovenstående filer til din server struktur
2. Sørg for at alle stier er korrekte og tilgængelige

### Trin 2: Opret HTML element i Umbraco
1. Log ind i Umbraco CMS
2. Naviger til den side hvor du vil indsætte talebotten
3. Tilføj et **HTML element** til siden
4. Kopier hele indholdet fra `UMBRACO_COMPLETE_HTML.html`
5. Indsæt det i HTML elementet

### Trin 3: Test implementeringen
1. Gem og publicer siden
2. Åbn siden i en browser
3. Tjek at:
   - CSS loader korrekt
   - JSONP callbacks initialiseres
   - Config data loader
   - Script fungerer
   - Billeder og lyd loader

## Vigtige noter

### JSONP vs. JSON
- Vi bruger JSONP (JavaScript med callbacks) i stedet for JSON
- Dette undgår CORS-problemer i Umbraco
- Callbacks skal defineres FØR JSONP-filerne loader

### Rækkefølge af scripts
Rækkefølgen er kritisk:
1. CSS først
2. JSONP callbacks (inline i HTML)
3. JSONP config filer
4. HTML content
5. Hovedscript sidst

### Karakter valg

#### Metode 1: Forced karakter i HTML (Anbefalet til Umbraco)
I `UMBRACO_COMPLETE_HTML.html` er der et script der tvinger karakter valget:

```html
<script>
  // Tving karakter valg til Mogens (eller skift til 'bodil')
  window.FORCE_CHARACTER = 'mogens';
</script>
```

**For at skifte til Bodil**, ændre bare linjen til:
```javascript
window.FORCE_CHARACTER = 'bodil';
```

#### Metode 2: URL parameter (Kun standalone version)
For at vælge karakter via URL, tilføj `?character=mogens` eller `?character=bodil`:
```
https://din-side.dk/talebot?character=mogens
https://din-side.dk/talebot?character=bodil
```

**Note**: I Umbraco embedded mode virker `window.FORCE_CHARACTER` bedst, da du ofte ikke har kontrol over URL parameteren.

## Fejlfinding

### Problem: Config data loader ikke
**Løsning:** Tjek at JSONP callbacks er defineret FØR config filerne loader

### Problem: CORS fejl
**Løsning:** Sørg for at du bruger JSONP format (.js filer) ikke JSON format (.json filer)

### Problem: Billeder vises ikke
**Løsning:** Tjek at alle stier i config_mogens.js og config_bodil.js peger på korrekte server URL'er

### Problem: Lyd afspiller ikke
**Løsning:** 
- Tjek at lydfilerne er uploadet korrekt
- Tjek browser console for fejl
- Prøv en anden browser (ikke MS Edge)

## Backend setup (valgfri)

Hvis du vil bruge OpenAI og ElevenLabs funktionalitet, skal du have en backend server kørende:

1. Deploy `server.js` til en Node.js server (fx Render.com)
2. Opdater API_BASE URL i script.js til at pege på din backend
3. Tilføj miljøvariabler for API nøgler:
   - `OPENAI_API_KEY`
   - `ELEVENLABS_API_KEY`

## Support

For teknisk support, kontakt udvikleren eller se projektets README.md for mere information.

