// Sets the colour palette and mode before the page paints, so there is no flash of the wrong colours.
// Loaded from a file (not inline) because the Content-Security-Policy does not allow inline scripts.
// Keep in step with src/lib/theme.ts.
(function () {
  var theme = 'system'
  var palette = null
  var created = null
  try {
    theme = localStorage.getItem('ledgerly-theme') || 'system'
    palette = localStorage.getItem('ledgerly-palette')
    for (var i = 0; i < localStorage.length && !created; i++) {
      var key = localStorage.key(i)
      if (key && /^sb-.*-auth-token$/.test(key)) {
        var saved = JSON.parse(localStorage.getItem(key) || 'null')
        created = (saved && saved.user && saved.user.created_at) || (saved && saved.currentSession && saved.currentSession.user && saved.currentSession.user.created_at) || null
        break
      }
    }
  } catch (error) { /* storage blocked */ }
  // Accounts created before 2026-11-28 10:00 UTC keep Classic unless they chose; everyone else starts in Aurora.
  if (palette !== 'aurora' && palette !== 'classic') palette = created && Date.parse(created) < Date.parse('2026-11-28T10:00:00Z') ? 'classic' : 'aurora'
  var dark = theme === 'dark' || (theme !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  var root = document.documentElement
  root.setAttribute('data-theme', dark ? 'dark' : 'light')
  root.setAttribute('data-palette', palette)
  var meta = document.querySelector('meta[name="theme-color"]')
  var colors = { classic: ['#245c48', '#0f1613'], aurora: ['#4f46e5', '#0a0919'] }
  if (meta) meta.setAttribute('content', colors[palette][dark ? 1 : 0])
})()
