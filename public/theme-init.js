// Sets the colour theme before the page paints, so there is no flash of the wrong colours.
// Loaded from a file (not inline) because the Content-Security-Policy does not allow inline scripts.
// Keep in step with src/lib/theme.ts.
(function () {
  var theme = 'system'
  try { theme = localStorage.getItem('ledgerly-theme') || 'system' } catch (error) { /* storage blocked */ }
  var dark = theme === 'dark' || (theme !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0f1613' : '#245c48')
})()
