# SDCC Talebot - Umbraco Embed Konvertering

## Oversigt over ændringer

Dette projekt er nu konverteret til at kunne køre embedded i Umbraco CMS ved hjælp af JSONP teknologi for at undgå CORS-problemer.

## Nye filer oprettet

### 1. JSONP Config filer
- **config_mogens.js** - JSONP version af config.json for Mogens karakter
- **config_bodil.js** - JSONP version af config_bodil.json for Bodil karakter

Disse filer wrapper JSON data i JavaScript callbacks for at undgå CORS-problemer når de loades fra en ekstern server.

### 2. Umbraco HTML fil
- **UMBRACO_COMPLETE_HTML.html** - Komplet HTML der kan indsættes direkte i Umbraco HTML element

Denne fil indeholder:
- Link til CSS stylesheet
- Inline JSONP callbacks definition
- Script tags til at loade JSONP config filer
- Komplet HTML struktur
- Link til hovedscript

### 3. Support filer
- **init-callbacks.js** - Separat fil med JSONP callbacks (valgfri, bruges kun hvis du ikke vil have inline callbacks)
- **UMBRACO_SETUP_GUIDE.md** - Detaljeret guide til opsætning i Umbraco
- **UMBRACO_BESKRIVELSE.md** - Denne fil

## Ændringer til eksisterende filer

### script.js
`loadConfig()` funktionen er opdateret til at:
1. **FØRST** tjekke om JSONP data er tilgængelig i `window.configMogensData` eller `window.configBodilData`
2. Bruge JSONP data hvis tilgængelig (Umbraco embedded mode)
3. Fallback til normal JSON loading hvis JSONP ikke findes (lokal udvikling)

Dette betyder at script.js nu virker i **begge** modes:
- ✅ Standalone (index.html med JSON filer)
- ✅ Embedded i Umbraco (JSONP filer)

## Hvordan det virker

### JSONP Teknik
JSONP (JSON with Padding) er en teknik til at loade data på tværs af domæner uden CORS:

**Normal JSON** (CORS problemer i Umbraco):
```json
{
  "characters": {
    "mogens": { ... }
  }
}
```

**JSONP format** (ingen CORS problemer):
```javascript
window.configMogensDataCallback({
  "characters": {
    "mogens": { ... }
  }
});
```

### Loading rækkefølge i Umbraco
1. **CSS** loades først
2. **JSONP callbacks** defineres (inline i HTML)
3. **JSONP config filer** loades og kalder callbacks
4. **HTML content** renderes
5. **Hovedscript** loades sidst og læser fra `window.configMogensData`

## Brug

### For lokal udvikling
Fortsæt som normalt:
```bash
npm start
# eller åbn index.html direkte
```

### For Umbraco deployment
1. Upload alle filer til server
2. Kopier indhold fra `UMBRACO_COMPLETE_HTML.html`
3. Indsæt i Umbraco HTML element
4. Se fuld guide i `UMBRACO_SETUP_GUIDE.md`

## Filer struktur

```
SDCC_tale_rsbot/
├── index.html                    (Standalone version)
├── script.js                     (Opdateret med JSONP support)
├── style.css                     (Uændret)
├── config.json                   (Original - bruges lokalt)
├── config_bodil.json            (Original - bruges lokalt)
├── config_mogens.js             (NY - JSONP version)
├── config_bodil.js              (NY - JSONP version)
├── UMBRACO_COMPLETE_HTML.html   (NY - Embed fil)
├── UMBRACO_SETUP_GUIDE.md       (NY - Setup guide)
├── UMBRACO_BESKRIVELSE.md       (NY - Denne fil)
├── init-callbacks.js            (NY - Callbacks)
├── server.js                    (Backend - uændret)
├── images/                      (Uændret)
├── audio/                       (Uændret)
└── assets/                      (Uændret)
```

## Fordele ved denne løsning

✅ **Ingen CORS problemer** - JSONP omgår CORS restrictions
✅ **Kompatibel** - Virker både standalone og embedded
✅ **Minimal kodeændring** - Kun loadConfig() er ændret
✅ **Nem opdatering** - Ændringer i JSON kan let konverteres til JSONP
✅ **Performance** - Ingen ekstra HTTP requests, data er inline

## Konvertering af nye changes

Hvis du opdaterer config.json eller config_bodil.json, skal du også opdatere JSONP versioner:

1. Åbn den opdaterede JSON fil
2. Wrap indholdet i en callback:
```javascript
window.configMogensDataCallback({
  // Indsæt JSON indhold her
});
```
3. Gem som .js fil i stedet for .json

## Teknisk note

Script.js detekterer automatisk hvilken mode den kører i:
- **Umbraco mode**: Bruger `window.configMogensData` (sat af JSONP callbacks)
- **Lokal mode**: Fetcher `config.json` som normalt

Ingen manuel konfiguration nødvendig! 🎉

## Support

For spørgsmål eller problemer, se:
- `UMBRACO_SETUP_GUIDE.md` for setup hjælp
- `README.md` for generel dokumentation
- Backend dokumentation i `server.js` kommentarer





