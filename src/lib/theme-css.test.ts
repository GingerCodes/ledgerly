import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

/** The custom properties declared inside the first block that starts with `selector`. */
function block(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`No block for ${selector}`)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start))
  return new Map([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]))
}

const tokensCss = read('theme-tokens.css')
const indexCss = read('index.css')
const auroraCss = read('theme-aurora.css')

const classicLight = new Map([...block(tokensCss, ':root'), ...block(indexCss, ':root')])
const classicDark = new Map([...block(tokensCss, ":root[data-theme='dark']"), ...block(indexCss, ":root[data-theme='dark']")])
const auroraLight = block(auroraCss, ":root[data-palette='aurora']")
const auroraDark = block(auroraCss, ":root[data-palette='aurora'][data-theme='dark']")

describe('theme files', () => {
  it('define every colour token for every palette and mode, so no theme can miss one', () => {
    const colourTokens = [...classicLight.keys()].filter((name) => /^--(bg|ln|tx)-/.test(name))
    expect(colourTokens.length).toBeGreaterThan(100)
    for (const [label, tokens] of [['classic dark', classicDark], ['aurora light', auroraLight], ['aurora dark', auroraDark]] as const) {
      const missing = colourTokens.filter((name) => !tokens.has(name))
      expect(missing, `${label} is missing ${missing.slice(0, 5).join(', ')}`).toEqual([])
    }
  })

  it('give Aurora its own value for every semantic variable the Classic theme sets', () => {
    const semantic = ['--ink', '--muted', '--paper', '--canvas', '--line', '--green-text', '--gradient-primary', '--glow', '--card-accent', '--positive', '--positive-bg', '--shadow', '--topbar-bg', '--nav-bg', '--chart-1', '--chart-6', '--spark-color']
    for (const name of semantic) {
      expect(classicLight.has(name), `classic ${name}`).toBe(true)
      expect(auroraLight.has(name), `aurora light ${name}`).toBe(true)
      expect(auroraDark.has(name), `aurora dark ${name}`).toBe(true)
    }
  })
})

function luminance(hex: string): number {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}
const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

describe('Aurora contrast (WCAG AA, 4.5:1)', () => {
  for (const [label, tokens] of [['light', auroraLight], ['dark', auroraDark]] as const) {
    it(`keeps text readable in ${label} mode`, () => {
      const get = (name: string) => tokens.get(name)!
      const pairs: Array<[string, string, string]> = [
        ['text on card', get('--ink'), get('--paper')],
        ['text on page', get('--ink'), get('--canvas')],
        ['muted text on card', get('--muted'), get('--paper')],
        ['link text on card', get('--green-text'), get('--paper')],
        ['income on its pill', get('--positive'), get('--positive-bg')],
      ]
      for (const stop of get('--gradient-primary').match(/#[0-9a-f]{6}/gi) ?? []) pairs.push([`white on gradient ${stop}`, '#ffffff', stop])
      for (const [name, foreground, background] of pairs) {
        expect(contrast(foreground, background), `${label}: ${name}`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }
})
