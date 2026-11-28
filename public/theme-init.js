// Sets the colour palette and mode before the page paints, so there is no flash of the wrong colours.
// Loaded from a file (not inline) because the Content-Security-Policy does not allow inline scripts.
// Keep in step with src/lib/theme.ts.
(function () {
  var theme = 'system'
  var palette = 'classic'
  try {
    theme = localStorage.getItem('ledgerly-theme') || 'system'
    palette = localStorage.getItem('ledgerly-palette') || 'classic'
  } catch (error) { /* storage blocked */ }
  if (palette !== 'aurora') palette = 'classic'
  var dark = theme === 'dark' || (theme !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  var root = document.documentElement
  root.setAttribute('data-theme', dark ? 'dark' : 'light')
  root.setAttribute('data-palette', palette)
  var meta = document.querySelector('meta[name="theme-color"]')
  var colors = { classic: ['#245c48', '#0f1613'], aurora: ['#4f46e5', '#0a0919'] }
  if (meta) meta.setAttribute('content', colors[palette][dark ? 1 : 0])
})()
