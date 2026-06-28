// ==UserScript==
// @name         Shoko Play with Companion
// @namespace    https://github.com/<user>/Shoko-WebUI-UserScript
// @version      1.1.0
// @description  Adds play buttons to Shoko WebUI that open shows/episodes via the Shoko Companion (shoko: URL scheme)
// @match        *://*/webui/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

;(function () {
  'use strict'

  // ========================================================================
  // CONFIGURATION
  // ========================================================================
  var CONFIG = {
    serverHost: '',
    serverSubPath: '',
    showSeriesPlayButton: true,
    showEpisodePlayButton: true,
    playIcon: 'M8,5.14L19.4,11.14L8,17.14V5.14Z',
    buttonColor: '#00e5ff',
    observerDebounce: 250,
  }

  // ========================================================================
  // UTILITY
  // ========================================================================

  function getHost () {
    if (CONFIG.serverHost) return CONFIG.serverHost
    if (window.location && window.location.hostname) {
      var h = window.location.hostname
      if (window.location.port) h = h + ':' + window.location.port
      return h
    }
    return null
  }

  function buildShokoUrl (playlistValue) {
    var host = getHost()
    if (!host) return null
    var hasPort = /:\d+$/.test(host)
    if (!hasPort && (host === 'localhost' || host === '127.0.0.1')) host += ':8111'
    var sub = CONFIG.serverSubPath ? '/' + CONFIG.serverSubPath.replace(/^\/+|\/+$/g, '') : ''
    return 'shoko://' + host + sub + '/play?playlist=' + playlistValue
  }

  function createPlayButton (shokoUrl, title, extraClass) {
    var btn = document.createElement('button')
    btn.className = 'shoko-play-btn ' + (extraClass || 'shoko-center-btn')
    btn.title = title || 'Play with Shoko Companion'
    btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:1.5rem;height:1.5rem;fill:currentColor"><path d="' + CONFIG.playIcon + '"></path></svg>'
    btn.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      if (shokoUrl) window.location.href = shokoUrl
    })
    return btn
  }

  // ========================================================================
  // CSS
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
      '.shoko-center-btn{top:50%;left:50%;transform:translate(-50%,-50%);font-size:0;}' +
      '.shoko-center-btn:hover{transform:translate(-50%,-50%) scale(1.2);}' +
      '.shoko-right-btn{top:50%;right:.5rem;transform:translateY(-50%);}' +
      '.shoko-right-btn:hover{transform:translateY(-50%) scale(1.2);}'
    document.head.appendChild(s)
  }

  // ========================================================================
  // DOM HELPERS
  // ========================================================================

  function seriesIdFromLink (link) {
    if (!link) return null
    var href = link.getAttribute('href') || ''
    var m = href.match(/\/series\/(\d+)/)
    return m ? +m[1] : null
  }

  function anidbEpisodeIdFrom (parent) {
    if (!parent) return null
    var a = parent.querySelector("a[href*='anidb.net/episode/']")
    if (!a) return null
    var m = (a.getAttribute('href') || '').match(/\/episode\/(\d+)/)
    return m ? +m[1] : null
  }

  // ========================================================================
  // CORE: inject into ALL overlay divs
  // ========================================================================

  function processAll () {
    // Every poster/episode card has an overlay div with this class.
    // Just inject the play button directly into them.
    document.querySelectorAll('div.bg-panel-background-poster-overlay').forEach(function (overlay) {
      if (overlay.querySelector('.shoko-play-btn')) return

      // Strategy: walk up to find the nearest parent card and determine
      // what type of content is being overlaid (series vs episode).

      // 1. Check if the overlay's direct or nearest ancestor is a Link to /series/
      //    This covers: collection posters, collection list items, dashboard cards
      var link = overlay.closest('a[href*="/series/"]')
      if (link) {
        var seriesId = seriesIdFromLink(link)
        if (seriesId) {
          var shokoUrl = buildShokoUrl('s' + seriesId)
          if (shokoUrl) {
            var btn = createPlayButton(shokoUrl, 'Play series with Shoko Companion', 'shoko-center-btn')
            overlay.appendChild(btn)
          }
        }
        return
      }

      // 2. If no series link, this is likely an episode card.
      //    Walk up to find the card row (gap-x-6) and look for AniDB episode link in EpisodeDetails.
      var cardRow = overlay.closest('div[class*="gap-x-6"]')
      if (cardRow) {
        var details = cardRow.querySelector('div[class*="max-h-52"]')
        if (details) {
          var anidbEpId = anidbEpisodeIdFrom(details)
          if (anidbEpId) {
            var shokoUrl = buildShokoUrl('e' + anidbEpId)
            if (shokoUrl) {
              var btn = createPlayButton(shokoUrl, 'Play episode with Shoko Companion', 'shoko-right-btn')
              overlay.appendChild(btn)
            }
          }
        }
      }
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

    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(scheduleProcess).observe(document.body, {
        childList: true,
        subtree: true,
      })
    }

    setInterval(scheduleProcess, 2000)
    console.log('[Shoko Play] loaded')
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
