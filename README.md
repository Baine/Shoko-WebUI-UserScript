# Shoko-WebUI-UserScript

Userscripts that enhance the [Shoko WebUI](https://github.com/ShokoAnime/Shoko-WebUI) with playback integration for [Shoko Companion](https://github.com/ShokoAnime/Shoko.Companion).

Adds a **Play** button overlay on series and episode cards throughout the WebUI, which triggers the Shoko Companion app to start playback via [mpv](https://mpv.io/).

## Requirements

| Component | Purpose |
|-----------|---------|
| [ShokoServer](https://github.com/ShokoAnime/ShokoServer) | The backend media server |
| [Shoko WebUI](https://github.com/ShokoAnime/Shoko-WebUI) | The web interface (accessed via browser) |
| [Shoko Companion](https://github.com/ShokoAnime/Shoko.Companion) | Desktop app that handles playback via mpv |
| Tampermonkey (or compatible userscript extension) | To run the userscript in your browser |

## Installation

### 1. Install the userscript extension

Install Tampermonkey or Violentmonkey for your browser.

### 2. Add the userscript

1. Open your extension's dashboard
2. Click **Create a new script** or **+ Add a new script**
3. Paste the contents of [`shoko-play.user.js`](shoko-play.user.js)
4. Save the script

### 3. Configure the server sub-path

Open the installed script and edit `serverSubPath` at the top:

```javascript
var serverSubPath = '' // e.g. '/proxy/v2/client'
```

## Features

### Play buttons appear on:

| Location | Target | Playlist DSL |
|----------|--------|--------------|
| **Collection** – Poster view | Series / Group | `s<shokoSeriesId>` |
| **Collection** – List view | Series / Group | `s<shokoSeriesId>` |
| **Series detail** – Episode listing | Individual episodes | `e<anidbEpisodeId>` |
| **Series detail** – Overview (Next Up) | Next-up episode | `e<anidbEpisodeId>` |
| **Dashboard** – Next Up / Continue Watching | Series | `s<shokoSeriesId>` |
| **Dashboard** – Recently Imported (Episodes) | Series | `s<shokoSeriesId>` |
| **Dashboard** – Recently Imported (Series) | Series | `s<shokoSeriesId>` |
| **Dashboard** – Recommended Anime (in collection) | Series | `s<shokoSeriesId>` |

Play buttons are hidden by default and only appear when hovering over a card.

## How it works

The userscript injects play buttons into the WebUI DOM. When clicked, each button opens a `shoko:` URL which triggers the Shoko Companion app (via the registered `shoko://` URL scheme handler). The companion then handles playback through mpv.

Example URL: `shoko://box.net:8111/play?playlist=s4510`

## Disclaimer

**This project is provided without warranty of any kind, express or implied.** Use at your own risk.

## License

MIT
