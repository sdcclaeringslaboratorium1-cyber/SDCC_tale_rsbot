# Mikromedicinsk Escape Room - "Hvad er der galt med Mogens?"

En interaktiv webapp til læring om diabetes og blodsukkerregulering, hvor brugeren klikker sig ind i kroppen på patienten Mogens.

## 🎯 Funktioner

- **Interaktive hotspots** på hovedbilledet med hover-effekter
- **Popup modal** med detaljerede organ-visninger
- **Responsive design** til desktop og mobile enheder
- **Touch/swipe support** til mobile enheder
- **Keyboard navigation** (Escape for at lukke modal)
- **Dynamisk data** fra JSON fil

## 📁 Projektstruktur

```
mikromedicinsk_escape/
├── index.html          # HTML struktur
├── style.css           # CSS styling og layout
├── script.js           # JavaScript funktionalitet
├── data.json           # Dynamisk data (koordinater, titler, info)
├── images/             # Billeder (placeholder)
│   ├── mogens_base.png
│   ├── organ_pancreas.png
│   ├── organ_liver.png
│   ├── insulin_pen.png
│   └── glucose_meter.png
└── README.md           # Denne fil
```

## 🖼️ Billeder der skal tilføjes

Du skal tilføje følgende billeder til `images/` mappen:

1. **`mogens_base.png`** - Hovedbillede af Mogens (patient)
2. **`organ_pancreas.png`** - Detaljeret billede af pancreassen
3. **`organ_liver.png`** - Detaljeret billede af leveren
4. **`insulin_pen.png`** - Billede af insulinpen
5. **`glucose_meter.png`** - Billede af blodsukkermåler

## 🎮 Sådan bruges appen

1. **Hovedscene**: Klik på de 4 hotspots på Mogens
2. **Popup modal**: Udforsk de detaljerede organ-visninger
3. **Sub-hotspots**: Klik på hotspots i modalen for mere information
4. **Navigation**: Brug Escape for at lukke modal, eller klik udenfor

## ⚙️ Tilpasning

### Tilføj nye hotspots
Rediger `data.json` og tilføj nye hotspots til eksisterende views:

```json
{
  "id": "ny_hotspot",
  "coords": [x, y, radius],
  "title": "Titel",
  "description": "Beskrivelse"
}
```

### Tilføj nye views
Tilføj nye views til `data.json`:

```json
"nytView": {
  "background": "images/nyt_billede.png",
  "title": "Titel",
  "infoText": "Info tekst",
  "hotspots": [...]
}
```

### Ændre koordinater
Koordinater er i formatet `[x, y, radius]` hvor:
- `x`: Afstand fra venstre kant i pixels
- `y`: Afstand fra top i pixels  
- `radius`: Radius af det klikbare område i pixels

## 🔧 Tekniske detaljer

- **HTML5** med semantisk struktur
- **CSS3** med flexbox, grid og animationer
- **Vanilla JavaScript** med ES6+ features
- **Responsive design** med mobile-first tilgang
- **Touch support** til mobile enheder
- **Accessibility** med keyboard navigation og focus states

## 🚀 Installation

1. Download alle filer
2. Tilføj billeder til `images/` mappen
3. Åbn `index.html` i en browser
4. Eller brug en lokal web server (anbefalet)

## 📱 Browser support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🎓 Læringsmål

Appen hjælper med at forstå:
- Pancreasens rolle i blodsukkerregulering
- Insulinets funktion og betydning
- Behandling med insulinpen
- Blodsukkermåling og overvågning

---

**Generér struktur med placeholder-billeder og én aktiv organdel (fx pancreas), så jeg kan udvide derfra.**






