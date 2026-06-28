// ==UserScript==
// @name         Shoko Play with Companion
// @namespace    https://github.com/<user>/Shoko-WebUI-UserScript
// @version      1.1.0
// @description  Adds play buttons to Shoko WebUI that open shows/episodes via the Shoko Companion (shoko: URL scheme)
// @match        *://*/webui/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 * Shoko Play with Companion
 *
 * Adds play buttons throughout the Shoko WebUI that generate shoko: URLs
 * for the Shoko Companion app. The companion handles playback via mpv.
 *
 * Supported URL targets:
 *   - Series (groups & single series): shoko:play?playlist=s<seriesId>
 *   - Episodes (episode listing, dashboard): shoko:play?playlist=e<anidbEpisodeId>
 *
 * Configuration: Edit the CONFIG object below to match your server setup.
 */

;(function () {
  'use strict'

  // ========================================================================
  // CONFIGURATION
  // ========================================================================
  var CONFIG = {
    // Server host used by the Shoko Companion to reach ShokoServer.
    // Leave empty ('') to auto-detect from the current page hostname.
    // The companion probes HTTPS first, then HTTP.
    serverHost: '',

    // Optional sub-path if WebUI is behind a reverse proxy.
    // Examples: '/proxy/v2/client', '/tunnel/mount'
    // Leave empty if server is at root.
    serverSubPath: '',

    // Show play buttons on series cards (collection, dashboard)
    showSeriesPlayButton: true,

    // Show play buttons on individual episode cards
    showEpisodePlayButton: true,

    // Play button icon (Material Design Icons SVG path).
    // Default: solid play triangle.
    playIcon: 'M8,5.14L19.4,11.14L8,17.14V5.14Z',

    // Button accent colour
    buttonColor: '#00e5ff',

    // MutationObserver debounce interval (ms) – reduces re-renders
    observerDebounce: 250,
  }

  // ========================================================================
  // UTILITY
  // ========================================================================

  /** Resolve the server host string. */
  function getHost () {
    if (CONFIG.serverHost) return CONFIG.serverHost

    // Auto-detect from the page origin (includes port if non-default)
    if (window.location && window.location.hostname) {
      var h = window.location.hostname
      if (window.location.port) h = h + ':' + window.location.port
      return h
    }

    return null
  }

  /** Build a shoko: URL for the play action. */
  function buildShokoUrl (playlistValue) {
    var host = getHost()
    if (!host) {
      console.warn('[Shoko Play] serverHost is not set and could not be auto-detected. ' +
        'Set CONFIG.serverHost in the userscript.')
      return null
    }

    // Append default port if no port is specified and host is localhost/loopback
    // ShokoServer defaults to HTTP on port 8111.
    var hasPort = /:\d+$/.test(host)
    if (!hasPort && (host === 'localhost' || host === '127.0.0.1')) {
      host = host + ':8111'
    }

    var sub = CONFIG.serverSubPath
      ? '/' + CONFIG.serverSubPath.replace(/^\/+|\/+$/g, '')
      : ''

    // Format: shoko://host[/subPath]/play?playlist=...
    // No inner http/https – the companion probes HTTPS then HTTP automatically.
    return 'shoko://' + host + sub + '/play?playlist=' + playlistValue
  }

  /** Create a play button element. */
  function createPlayButton (shokoUrl, title) {
    var btn = document.createElement('button')
    btn.className = 'shoko-play-btn'
    btn.title = title || 'Play with Shoko Companion'
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" style="width:1.5rem;height:1.5rem;fill:currentColor"><path d="' +
      CONFIG.playIcon + '"></path></svg>'

    btn.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      if (shokoUrl) window.location.href = shokoUrl
    })

    return btn
  }

  // ========================================================================
  // CSS (injected once)
  // ========================================================================

  var _cssInjected = false
  function injectCSS () {
    if (_cssInjected) return
    _cssInjected = true

    var s = document.createElement('style')
    s.textContent =
      '.shoko-play-btn{' +
      'position:absolute;z-index:30;border:none;border-radius:50%;' +
      'background:transparent;color:' + CONFIG.buttonColor + ';cursor:pointer;' +
      'display:flex;align-items:center;justify-content:center;outline:none;' +
      'transition:transform .15s ease,color .15s ease,background .15s ease;' +
      '}' +
      '.shoko-play-btn:hover{color:#fff;background:rgba(0,0,0,.35);transform:scale(1.2);}' +
      /* centre overlay button – always hidden, shown via group-hover */
      '.shoko-center-btn{top:50%;left:50%;transform:translate(-50%,-50%);font-size:0;}' +
      '.shoko-center-btn:hover{transform:translate(-50%,-50%) scale(1.2);}' +
      /* right-side overlay button – always hidden, shown via group-hover */
      '.shoko-right-btn{top:50%;right:.5rem;transform:translateY(-50%);}' +
      '.shoko-right-btn:hover{transform:translateY(-50%) scale(1.2);}'

    document.head.appendChild(s)
  }

  // ========================================================================
  // DOM HELPERS
  // ========================================================================

  /**
   * Extract Shoko series ID from a URL like /webui/collection/series/1234
   * Returns number or null.
   */
  function seriesIdFromLink (link) {
    if (!link) return null
    var href = link.getAttribute('href') || link.getAttribute('data-href') || ''
    var m = href.match(/\/series\/(\d+)/)
    return m ? +m[1] : null
  }

  /**
   * Extract AniDB episode ID from an AniDB link like https://anidb.net/episode/123456
   */
  function anidbEpisodeIdFrom (parent) {
    if (!parent) return null
    var a = parent.querySelector("a[href*='anidb.net/episode/']")
    if (!a) return null
    var m = (a.getAttribute('href') || '').match(/\/episode\/(\d+)/)
    return m ? +m[1] : null
  }

  /** Check if an element has been tagged as already processed. */
  function isProcessed (el) {
    return el.getAttribute('data-shoko-played') === '1'
  }

  /** Mark an element as processed. */
  function markProcessed (el) {
    el.setAttribute('data-shoko-played', '1')
  }

  // ========================================================================
  // CARD PROCESSORS
  // ========================================================================

  // --------------------------------------------------------------------------
  // 1. Collection – Poster view
  //    Rendered by PosterViewItem.tsx
  //    Structure:
  //      <div style="width:12.938rem">              ← card wrapper
  //        <Link>
  //          <BackgroundImagePlaceholderDiv        ← poster (has group class, h-76)
  //            <div class="...overlay...">          ← hover overlay (pencil button)
  //          </BackgroundImagePlaceholderDiv>
  //          <Link><!-- title --></Link>
  //        </Link>
  //      </div>
  // --------------------------------------------------------------------------
  function processPosterViewItem (poster) {
    if (isProcessed(poster)) return
    if (!CONFIG.showSeriesPlayButton) return
    markProcessed(poster)

    // Find the <Link> wrapping the poster
    var wrapper = poster.closest('a') || poster.parentElement
    if (!wrapper) return

    var seriesId = seriesIdFromLink(wrapper)
    if (!seriesId) return

    var shokoUrl = buildShokoUrl('s' + seriesId)
    if (!shokoUrl) return

    var btn = createPlayButton(shokoUrl, 'Play series with Shoko Companion')
    btn.className += ' shoko-center-btn'

    // Inject into the poster so it appears in the hover overlay area
    poster.appendChild(btn)
  }

  // --------------------------------------------------------------------------
  // 2. Collection – List view
  //    Rendered by ListViewItem.tsx
  //    Structure:
  //      <div class="flex.h-full...">                  ← card wrapper
  //        <div class="flex.gap-x-3">
  //          <Link>
  //            <BackgroundImagePlaceholderDiv         ← poster (h-[13.438rem])
  //              <div class="...overlay...">           ← hover overlay
  //              <div class="...series-count...">      ← "N Series" badge
  //            </BackgroundImagePlaceholderDiv>
  //          </Link>
  //          <div><!-- info --></div>
  //        </div>
  //      </div>
  // --------------------------------------------------------------------------
  function processListViewItem (card) {
    if (isProcessed(card)) return
    if (!CONFIG.showSeriesPlayButton) return
    markProcessed(card)

    var link = card.querySelector('a[href*="/series/"]')
    var seriesId = seriesIdFromLink(link)
    if (!seriesId) return

    var shokoUrl = buildShokoUrl('s' + seriesId)
    if (!shokoUrl) return

    var btn = createPlayButton(shokoUrl, 'Play series with Shoko Companion')
    btn.className += ' shoko-center-btn'

    // The poster container is the BackgroundImagePlaceholderDiv
    var poster = card.querySelector('div[class*="13.438rem"]')
    if (poster) {
      poster.appendChild(btn)
    }
  }

  // --------------------------------------------------------------------------
  // 3. Series detail – Episode cards
  //    Rendered by EpisodeSummary.tsx on /series/:seriesId/episodes
  //    Structure:
  //      <div class="z-10.flex.items-center.gap-x-6">    ← card row
  //        <BackgroundImagePlaceholderDiv                 ← thumbnail (h-65)
  //          <div class="absolute...left-col...">          ← selection checkbox
  //          <div class="absolute...right-col...">         ← watched/hidden buttons
  //          <div class="absolute...hover-overlay...">     ← hover button layer
  //        </BackgroundImagePlaceholderDiv>
  //        <EpisodeDetails>                                ← metadata panel
  //          ... "Copy ShokoID" button, "AniDB" link ...
  //        </EpisodeDetails>
  //      </div>
  // --------------------------------------------------------------------------
  function processEpisodeCard (row) {
    if (isProcessed(row)) return
    if (!CONFIG.showEpisodePlayButton) return

    var thumb = row.querySelector('div[class*="h-65"]')
    var details = row.querySelector('div[class*="max-h-52"]')
    if (!thumb || !details) return

    // EpisodeDetails contains the AniDB link with the episode ID
    var anidbEpId = anidbEpisodeIdFrom(details)
    if (!anidbEpId) return

    // Only show button if the episode has files linked (Size > 0)
    // EpisodeDetails shows "X File(s)" text when Size > 0
    var hasFiles = /File[s]?\b/.test(details.textContent)
    if (!hasFiles) return

    markProcessed(row)

    var shokoUrl = buildShokoUrl('e' + anidbEpId)
    if (!shokoUrl) return

    var btn = createPlayButton(shokoUrl, 'Play episode with Shoko Companion')
    btn.className += ' shoko-right-btn'

    // Inject into the hover overlay layer inside the thumbnail
    var overlay = thumb.querySelector('div[class*="poster-overlay"]')
    if (overlay) {
      overlay.appendChild(btn)
    } else {
      thumb.appendChild(btn)
    }
  }

  // --------------------------------------------------------------------------
  // 4. Series overview – Next-Up episode card
  //    Uses EpisodeSummary.tsx with nextUp={true} inside /series/:seriesId/overview
  //    Same DOM structure as #3, but located in the overview tab.
  // --------------------------------------------------------------------------
  function processOverviewNextUp (container) {
    if (isProcessed(container)) return

    var thumb = container.querySelector('div[class*="h-65"]')
    var details = container.querySelector('div[class*="max-h-52"]')
    if (!thumb || !details) return

    // Must be inside a series page but NOT in the episodes sub-page
    var inSeries = container.closest('[class*="series"]')
    var inEpisodes = container.closest('[class*="episodes"]')
    if (!inSeries || inEpisodes) return

    var anidbEpId = anidbEpisodeIdFrom(details)
    var seriesId = seriesIdFromLink(container.querySelector('a'))

    // Fallback: play the series if we can't find the episode ID
    var epId = anidbEpId || seriesId
    if (!epId) return

    var prefix = anidbEpId ? 'e' : 's'
    var shokoUrl = buildShokoUrl(prefix + epId)
    if (!shokoUrl) return

    markProcessed(container)

    var btn = createPlayButton(shokoUrl, 'Play next-up with Shoko Companion')
    btn.className += ' shoko-center-btn'

    var overlay = thumb.querySelector('div[class*="poster-overlay"]')
    if (overlay) {
      overlay.appendChild(btn)
    } else {
      thumb.appendChild(btn)
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Check if an element is inside a panel with a specific title text.
   * ShokoPanel renders the title as <span className="flex text-xl font-semibold">{title}</span>
   */
  function insidePanelWithTitle (el, titleText) {
    if (!el) return false
    // Walk up to find the panel (ShokoPanel is a div.flex.flex-col.gap-y-6)
    var panel = el.closest('div.flex.flex-col.gap-y-6')
    if (!panel) return false
    // Check if any span in the panel has the title text
    var spans = panel.querySelectorAll('span.flex.text-xl.font-semibold')
    for (var i = 0; i < spans.length; i++) {
      if (spans[i].textContent.trim() === titleText) return true
    }
    return false
  }

  // --------------------------------------------------------------------------
  // 5. Dashboard – episode cards (Next Up, Continue Watching, Recently Imported)
  //    Rendered by DashboardEpisode.tsx
  //    Structure:
  //      <Link to="/series/:shokoId">                        ← wraps everything
  //        <div class="group.flex.w-115...">                 ← card wrapper
  //          <BackgroundImagePlaceholderDiv                   ← thumbnail
  //          <div><!-- title --></div>
  //          <div><!-- subtitle --></div>
  //        </div>
  //      </Link>
  // --------------------------------------------------------------------------
  function processDashboardEpisode (item) {
    // item is the <a> element itself
    if (isProcessed(item)) return
    if (!CONFIG.showSeriesPlayButton) return

    var seriesId = seriesIdFromLink(item)
    if (!seriesId) { console.log('[Shoko Play] dashboard-episode NO seriesId'); return }

    var shokoUrl = buildShokoUrl('s' + seriesId)
    console.log('[Shoko Play] dashboard-episode seriesId=' + seriesId + ' url=' + shokoUrl)
    if (!shokoUrl) return

    var btn = createPlayButton(shokoUrl, 'Play series with Shoko Companion')
    btn.className += ' shoko-center-btn'

    // DashboardEpisode structure: <a> → <div.flex.w-full> → <BackgroundImagePlaceholderDiv relative>
    var innerWrapper = item.querySelector('div.flex.w-full')
    if (!innerWrapper) innerWrapper = item

    // BackgroundImagePlaceholderDiv with overlayOnHover has the overlay div
    var overlay = innerWrapper.querySelector('div.bg-panel-background-poster-overlay')
    if (overlay) {
      console.log('[Shoko Play] dashboard-episode overlay found')
      overlay.appendChild(btn)
    } else {
      var wrapper = innerWrapper.querySelector('.relative')
      if (wrapper) {
        console.log('[Shoko Play] dashboard-episode no overlay, creating fallback')
        var newOverlay = document.createElement('div')
        newOverlay.className =
          'pointer-events-none z-50 flex h-full items-center justify-center ' +
          'bg-panel-background-poster-overlay opacity-0 transition-opacity ' +
          'group-hover:pointer-events-auto group-hover:opacity-100'
        newOverlay.appendChild(btn)
        wrapper.appendChild(newOverlay)
      }
    }

    markProcessed(item)
  }

  // --------------------------------------------------------------------------
  // 6. Dashboard – series cards (Recommended Anime, Recently Imported)
  //    Rendered by SeriesPoster.tsx
  //    NOTE: Upcoming Anime also uses SeriesPoster – skip those.
  // --------------------------------------------------------------------------
  function processDashboardSeries (card) {
    // card is the <a> element itself
    if (isProcessed(card)) return
    if (!CONFIG.showSeriesPlayButton) return

    var seriesId = seriesIdFromLink(card)
    if (!seriesId) { console.log('[Shoko Play] dashboard-series NO seriesId'); return }

    // Skip Upcoming Anime panel
    if (insidePanelWithTitle(card, 'Upcoming Anime')) {
      console.log('[Shoko Play] dashboard-series SKIPPED (Upcoming Anime)')
      markProcessed(card)
      return
    }

    var shokoUrl = buildShokoUrl('s' + seriesId)
    console.log('[Shoko Play] dashboard-series seriesId=' + seriesId + ' url=' + shokoUrl)
    if (!shokoUrl) return

    var btn = createPlayButton(shokoUrl, 'Play series with Shoko Companion')
    btn.className += ' shoko-center-btn'

    // BackgroundImagePlaceholderDiv with overlayOnHover has the overlay div
    var overlay = card.querySelector('div.bg-panel-background-poster-overlay')
    if (overlay) {
      console.log('[Shoko Play] dashboard-series overlay found')
      overlay.appendChild(btn)
    } else {
      // Fallback: create an overlay div with hover visibility
      var wrapper = card.querySelector('.relative')
      if (wrapper) {
        console.log('[Shoko Play] dashboard-series no overlay, creating fallback')
        var newOverlay = document.createElement('div')
        newOverlay.className =
          'pointer-events-none z-50 flex h-full items-center justify-center ' +
          'bg-panel-background-poster-overlay opacity-0 transition-opacity ' +
          'group-hover:pointer-events-auto group-hover:opacity-100'
        newOverlay.appendChild(btn)
        wrapper.appendChild(newOverlay)
      }
    }

    markProcessed(card)
  }

  // ========================================================================
  // DISPATCHER
  // ========================================================================

  function processAll () {
    // 1. Collection poster view items
    //    Look for BackgroundImagePlaceholderDiv with poster dimensions
    document.querySelectorAll('div.h-76').forEach(processPosterViewItem)

    // 2. Collection list view items
    //    Card wrappers containing a link to /series/
    document.querySelectorAll('div[class*="h-full"]').forEach(function (el) {
      if (el.querySelector('a[href*="/series/"]')) {
        processListViewItem(el)
      }
    })

    // 3. Episode cards (series episodes page)
    //    Rows with a thumbnail (h-65) and details panel (max-h-52)
    document.querySelectorAll('div[class*="gap-x-6"]').forEach(function (row) {
      if (row.querySelector('div[class*="h-65"]') &&
          row.querySelector('div[class*="max-h-52"]')) {
        processEpisodeCard(row)
      }
    })

    // 4. Series overview next-up
    document.querySelectorAll('div[class*="p-4"], div[class*="p-6"]').forEach(processOverviewNextUp)

    // 5. Dashboard episode cards – <a> tags with w-115 class
    //    DashboardEpisode: <a class="group flex w-115 shrink-0 flex-col justify-center">
    document.querySelectorAll('a[class*="w-115"]').forEach(function (el) {
      var href = el.getAttribute('href') || ''
      if (!href.match(/\/series\/\d+/)) return
      console.log('[Shoko Play] dashboard-episode href=' + href + ' classList=' + el.className)
      processDashboardEpisode(el)
    })

    // 6. Dashboard series cards – <a> tags with w-56 class
    //    SeriesPoster: <a class="w-56 flex flex-col shrink-0 group">
    //    Exclude Upcoming Anime panel
    document.querySelectorAll('a[class*="w-56"]').forEach(function (el) {
      var href = el.getAttribute('href') || ''
      if (!href.match(/\/series\/\d+/)) return

      // Skip Upcoming Anime panel
      if (insidePanelWithTitle(el, 'Upcoming Anime')) return

      console.log('[Shoko Play] dashboard-series href=' + href + ' classList=' + el.className)
      processDashboardSeries(el)
    })
  }

  // ========================================================================
  // INIT
  // ========================================================================

  var _debounceTimer = null

  function scheduleProcess () {
    if (_debounceTimer) clearTimeout(_debounceTimer)
    _debounceTimer = setTimeout(processAll, CONFIG.observerDebounce)
  }

  function init () {
    injectCSS()
    processAll()

    // Watch for React re-renders / route changes
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(scheduleProcess).observe(document.body, {
        childList: true,
        subtree: true,
      })
    }

    // Also poll periodically as a safety net
    setInterval(scheduleProcess, 2000)

    console.log('[Shoko Play] loaded – host=' + (getHost() || 'auto'))
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
