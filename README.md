# Little Star Explorer

[Open the public website](https://little-star-explorer.samofas2011.chatgpt.site/offline/index.html) — no sign-in required. Spanish is the default; English is available from the language selector.

Source repository: https://github.com/samofas2011-ux/little-star-explorer (private). Hosting is provided by Sites; pushing to GitHub alone does not automatically redeploy the website.

A bilingual, touch-friendly sky atlas for children (Spanish by default, with an English switch), with 88 constellations and 5,044 catalog stars to apparent magnitude 6. It is an educational whole-sky atlas, not a real-time view calculated for a location or date.

## Offline edition

See [OFFLINE.md](OFFLINE.md) for Spanish and English tablet installation instructions. Download `public/explorador-estrellas-offline.zip` for a self-contained HTML file plus an installable tablet folder. The tablet edition caches the atlas with a scoped service worker and opens from the home screen without internet after the initial installation.

Build the offline bundle after editing `public/explorer.html` with `python3 scripts/package-offline.py`. All data, translations, and stories are embedded locally. On iPad, use the home-screen installation instead of the Files HTML preview. Offline read-aloud depends on installed device voices.

## Put it on your website

Upload `public/explorer.html` to your web host, keeping the filename `explorer.html`. Open that page's address in Safari or Chrome on the tablet. The entire atlas, styling, and star catalog are embedded in this single file. No installation, API key, or account is required for your own hosted copy.

You can also embed the uploaded file in an existing page:

```html
<iframe src="/explorer.html" title="Little Star Explorer"
  style="width:100%;height:100dvh;min-height:650px;border:0"></iframe>
```

The map works without external requests after the file loads. Read-aloud uses the device's available speech voices; voice availability and offline speech depend on the tablet. Progress is stored only in browser local storage when available. Links to educational sources open external pages.

Download links automatically use the current page address. The Sites website is now public, so a child can open the website directly without signing in. The standalone file can also be hosted elsewhere.

## Controls

- One-finger drag pans; two-finger pinch zooms. Plus/minus and reset buttons provide alternatives.
- Tap a star to show its name/catalog number, approximate color, and apparent magnitude.
- Explore all 12 zodiac figures with bilingual illustrated buttons; select one to see its star pattern and a larger traditional figure.
- Choose or search all 88 constellations; switch lines, names, and faint stars on/off.
- Use read-aloud, next, surprise, and discovery prompts. Explored constellations are marked locally.
- Keyboard: focus the sky and use arrow keys or +/−; constellation selection and controls use native keyboard interaction.

## Data and scope

Star positions, magnitudes, color indices, names, and constellation line figures are from Olaf Frohn's [d3-celestial](https://github.com/ofrohn/d3-celestial) catalog. Its BSD notice is embedded in the HTML and reproduced in `public/data/LICENSE.txt`. Both parts of Serpens are merged into one of the 88 constellation entries. English and Spanish meanings are clarified for children. Spanish search ignores accents; either language can also search the Latin catalog names. The constellation overview links to the [IAU](https://iauarchive.eso.org/public/themes/constellations/).

The map uses a stereographic sky projection with back-side clipping. Star sizes and colors aid learning and are illustrative, not physical stellar sizes or calibrated color measurements. It does not include every star in the universe, planets, horizon visibility, location/time calculations, or 3D distances. Connect-the-dots figures are conventional drawings, not official constellation boundaries.

## Development and verification

`npm install`, `npm run dev`, and `npm run build` run the Sites wrapper. The portable HTML works independently of that wrapper.

Run `node tests/atlas.test.cjs` for bilingual catalog coverage, all 88 projection views in each language, narrow/wide canvas sizes, selection, accent-insensitive search, language persistence, and local voice selection in a simulated DOM. Run `node tests/offline.test.cjs` for service-worker installation, cached offline navigation, scope, and rejection of unexpected sign-in pages. These checks do not replace testing touch gestures and speech on the child's actual tablet.
