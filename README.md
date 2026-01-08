# x-iq

a chrome extension that displays ai-estimated iq scores for users on your x timeline.

## how it works

x-iq analyzes each user's bio and recent tweets using gemini to estimate their iq. the score appears as a color-coded badge near the user's avatar.

the prompt is tuned for crypto twitter — it ignores the usual ct slang and aesthetics, focusing on actual reasoning quality, protocol understanding, and independent thinking.

## iq color scale

- red — below 85
- orange — 85-99
- green — 100-114
- blue — 115-129
- purple — 130+

## features

- iq badges next to avatars
- hide low iq toggle with adjustable threshold
- caches results so each user is only analyzed once
- shows average iq of your timeline in the popup

## setup

1. get a [gemini api key](https://aistudio.google.com/apikey)

2. clone and build:

```bash
git clone <repo-url>
cd xiq
npm install
npm run build
```

3. load in chrome:
   - go to `chrome://extensions/`
   - enable developer mode
   - click "load unpacked" and select the `dist` folder

4. click the extension icon, enter your api key, and enable it.
