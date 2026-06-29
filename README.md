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

## Browser Extension

Install one of these browser extensions before adding the userscript:

| Browser | Extension | Link |
|---------|-----------|------|
| Chrome | [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Chrome | [Violentmonkey](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) | [Chrome Web Store](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) |
| Firefox | [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/) | [Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |
| Firefox | [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/) | [Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/violentmonkey/) |
| Edge | [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/ivlginbbkgialkfenajdfjopkflbbmih) | [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/ivlginbbkgialkfenajdfjopkflbbmih) |
| Edge | [Violentmonkey](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/ffbbgdaaoppeehfcdbibdiidnjhfkkno) | [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/ffbbgdaaoppeehfcdbibdiidnjhfkkno) |

## Installation

### 1. Install the userscript extension

Install one of the extensions listed above for your browser.

### 2. Add the userscript

1. Open your extension's dashboard (usually via the Tampermonkey/Violentmonkey icon in your toolbar)
2. Click **Create a new script** or **+ Add a new script**
3. Paste the contents of [`shoko-play.user.js`](shoko-play.user.js)
4. Save the script

### 3. Configure the server host

Open the installed script and edit the `CONFIG` object at the top:

```javascript
var CONFIG = {
  // Set to your ShokoServer host, e.g. "box.net" or "192.168.1.100:8111"
  // Leave empty ('') to auto-detect from the current page hostname
  serverHost: '',

  // Optional reverse proxy sub-path, e.g. "/proxy/v2/client"
  serverSubPath: '',

  // Enable/disable play buttons
  showSeriesPlayButton: true,
  showEpisodePlayButton: true,
  // ...
}
```

## Features

### Play buttons appear on:

| Location | Target | Playlist DSL |
|----------|--------|--------------|
| **Collection** – Poster view | Series / Group | `s&lt;shokoSeriesId&gt;` |
| **Collection** – List view | Series / Group | `s&lt;shokoSeriesId&gt;` |
| **Series detail** – Episode listing | Individual episodes | `e&lt;anidbEpisodeId&gt;` |
| **Series detail** – Overview (Next Up) | Next-up episode | `e&lt;anidbEpisodeId&gt;` |
| **Dashboard** – Next Up / Continue Watching | Series | `s&lt;shokoSeriesId&gt;` |
| **Dashboard** – Recently Imported (Episodes) | Series | `s&lt;shokoSeriesId&gt;` |
| **Dashboard** – Recently Imported (Series) | Series | `s&lt;shokoSeriesId&gt;` |
| **Dashboard** – Recommended Anime (in collection) | Series | `s&lt;shokoSeriesId&gt;` |

Play buttons are hidden by default and only appear when hovering over a card.

## Disclaimer

**This project is provided without warranty of any kind, express or implied.** Use at your own risk.

## How it works

The userscript injects play buttons into the WebUI DOM. When clicked, each button opens a `shoko:` URL which triggers the Shoko Companion app (via the registered `shoko://` URL scheme handler). The companion then handles playback through mpv.

Example URL: `shoko://share.local:8111/play?playlist=s4510`

## Disclaimer

**This project is provided without warranty of any kind, express or implied.** Use at your own risk.

## Generated with

This script was generated with AI assistance using:
- [opencode](https://github.com/anomalyco/opencode) – code generation agent
- [llama.cp](https://github.com/Mozilla-Ocho/llama.cpp) – inference runtime
- [unsloth/Qwen3.6-35B-A3B-GGUF:Q8_K_XL](https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF) on Hugging Face – model used

## License

MIT
