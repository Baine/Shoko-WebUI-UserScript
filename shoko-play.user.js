// ==UserScript==
// @name         Shoko Play with Companion
// @namespace    https://github.com/<user>/Shoko-WebUI-UserScript
// @version      1.2.0
// @description  Adds play buttons to Shoko WebUI that open shows/episodes via the Shoko Companion (shoko: URL scheme)
// @match        *://*/webui/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

;(function () {
  'use strict'

  function getHost () {
    var h = window.location.host
    if (!window.location.port && (h === 'localhost' || h === '127.0.0.1')) h += ':8111'
    return h
  }

  function injectCSS () {
    var s = document.createElement('style')
    s.textContent =
      '.shoko-play-btn{' +
      'position:absolute;z-index:30;border:none;border-radius:50%;' +
      'background:transparent;color:#00e5ff;cursor:pointer;' +
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

  function processAll () {
    document.querySelectorAll('div.bg-panel-background-poster-overlay').forEach(function (overlay) {
      if (overlay.querySelector('.shoko-play-btn')) return

      var link = overlay.closest('a[href*="/series/"]')
      if (link) {
        var m = (link.getAttribute('href') || '').match(/\/series\/(\d+)/)
        var seriesId = m ? +m[1] : null
        if (seriesId) {
          var btn = document.createElement('button')
          btn.className = 'shoko-play-btn shoko-center-btn'
          btn.title = 'Play series with Shoko Companion'
          btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:1.5rem;height:1.5rem;fill:currentColor"><path d="M8,5.14L19.4,11.14L8,17.14V5.14Z"></path></svg>'
          btn.addEventListener('click', function (e) {
            e.preventDefault()
            e.stopPropagation()
            window.location.href = 'shoko://' + getHost() + '/play?playlist=s' + seriesId
          })
          overlay.appendChild(btn)
        }
        return
      }

      var cardRow = overlay.closest('div[class*="gap-x-6"]')
      if (cardRow) {
        var details = cardRow.querySelector('div[class*="max-h-52"]')
        if (details) {
          var a = details.querySelector("a[href*='anidb.net/episode/']")
          if (a) {
            var m = (a.getAttribute('href') || '').match(/\/episode\/(\d+)/)
            var anidbEpId = m ? +m[1] : null
            if (anidbEpId) {
              var btn = document.createElement('button')
              btn.className = 'shoko-play-btn shoko-right-btn'
              btn.title = 'Play episode with Shoko Companion'
              btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:1.5rem;height:1.5rem;fill:currentColor"><path d="M8,5.14L19.4,11.14L8,17.14V5.14Z"></path></svg>'
              btn.addEventListener('click', function (e) {
                e.preventDefault()
                e.stopPropagation()
                window.location.href = 'shoko://' + getHost() + '/play?playlist=e' + anidbEpId
              })
              overlay.appendChild(btn)
            }
          }
        }
      }
    })
  }

  var _debounceTimer = null
  function init () {
    injectCSS()
    processAll()
    new MutationObserver(function () {
      if (_debounceTimer) clearTimeout(_debounceTimer)
      _debounceTimer = setTimeout(processAll, 250)
    }).observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
