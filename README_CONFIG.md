# Konfiguration af SDCC Talebot

## Oversigt

Du har nu et modulært setup hvor alle prompt-data og referencer er samlet i en `config.json` fil på GitHub. Dette gør det nemt at skabe flere chatbots med forskellige karakterer.

## Dit eksisterende setup:
✅ **På Render serveren:** `server.js` + `package.json` (for API-nøgler)
✅ **På GitHub:** `index.html`, `script.js`, `style.css`, `config.json`
✅ **Ny tilføjelse:** `config.json` med alle data og referencer

## Sådan opdaterer du setup'et:

1. **Tilføj `config.json` til dit eksisterende GitHub repository**
2. **Opdater URL'en i koden:**

```javascript
// I server.js linje 18, ændr til dit repository:
const response = await axios.get('https://raw.githubusercontent.com/DIN-BRUGERNAVN/DIT-REPO/main/config.json');

// I script.js linje 676, ændr til dit repository:
const response = await fetch('https://raw.githubusercontent.com/DIN-BRUGERNAVN/DIT-REPO/main/config.json');
```

## Fordele ved den nye struktur:

✅ **Modulær konfiguration** - alle data i én JSON-fil
✅ **Nem at skabe nye karakterer** - bare tilføj til `config.json`
✅ **Ingen redeployment nødvendig** - bare opdater JSON-filen på GitHub
✅ **Version control** - GitHub giver dig historik over ændringer
✅ **Sikkerhed** - API-nøgler forbliver på Render serveren
✅ **Skalerbar** - nemt at udvide med flere chatbots

## Sådan opdaterer du konfigurationen:

1. **Rediger `config.json` lokalt**
2. **Commit og push til GitHub**
3. **Serveren henter automatisk den nye konfiguration næste gang den starter**

## Fallback-sikkerhed:

Hvis GitHub ikke er tilgængelig, vil systemet:
1. **Server:** Vise fejl og stoppe (da konfiguration er kritisk)
2. **Frontend:** Bruge fallback-konfiguration fra script.js

## Hvad skal uploades til Render:

Du behøver kun at uploade disse 2 filer til Render:
1. **`server.js`** - Backend server kode (med API-nøgler)
2. **`package.json`** - Dependencies

Alt andet ligger på GitHub og hentes derfra!

## Eksempel på opdatering af dit eksisterende repository:

```bash
# I dit eksisterende GitHub repository
git add config.json
git commit -m "Tilføj konfigurationsfil med alle prompt-data"
git push origin main
```

Derefter opdaterer du URL'erne i `server.js` og `script.js` til dit repository.
