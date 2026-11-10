const periods = ['dawn', 'day', 'sunset', 'night']
const root = document.documentElement
let mode = 'auto'
try { mode = localStorage.getItem('writing-room-light') || 'auto' } catch {}

// Beijing-time colour stops interpolate continuously, including across midnight.
const palette = [
  [0, '#181918', '#b8a38c', '#181918'],
  [6, '#181918', '#b8a38c', '#181918'],
  [7, '#b39a80', '#b8a38c', '#b6a184'],
  [8.5, '#f5e8ce', '#b8a38c', '#f1e4cb'],
  [12, '#f5f1e8', '#b8a38c', '#f5e9d0'],
  [16, '#e3c9a7', '#b8a38c', '#c5ae8b'],
  [18, '#89644c', '#b8a38c', '#554638'],
  [19, '#3a3029', '#b8a38c', '#292722'],
  [20, '#181918', '#b8a38c', '#181918'],
  [24, '#181918', '#b8a38c', '#181918']
]
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
function mixHex(a, b, t) {
  const start = rgb(a), end = rgb(b)
  return '#' + start.map((value, i) => Math.round(value + (end[i] - value) * t).toString(16).padStart(2, '0')).join('')
}

function sync() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).format(new Date()).split(':').map(Number)
  const hour = parts[0] + parts[1] / 60 + parts[2] / 3600
  const local = hour < 6 || hour >= 20 ? 'night' : hour < 8.5 ? 'dawn' : hour < 16 ? 'day' : 'sunset'
  root.dataset.roomTime = periods.includes(mode) ? mode : local
  const sample = ({ dawn: 8, day: 12, sunset: 18, night: 24 })[mode] ?? hour
  const upper = palette.findIndex(stop => stop[0] > sample)
  const end = upper < 0 ? palette.length - 1 : upper
  const start = Math.max(0, end - 1)
  const fraction = (sample - palette[start][0]) / (palette[end][0] - palette[start][0])
  const t = fraction * fraction * (3 - 2 * fraction)
  const wall = mixHex(palette[start][1], palette[end][1], t)
  root.style.setProperty('--wall', wall)
  const heroWall = mixHex(palette[start][3], palette[end][3], t)
  root.style.setProperty('--hero-wall', heroWall)
  const heroRGB = rgb(heroWall)
  const heroLight = heroRGB.reduce((sum, value, i) => sum + value * [.299, .587, .114][i], 0) > 150
  root.style.setProperty('--hero-ink', heroLight ? '#30271f' : '#e5ddce')
  root.style.setProperty('--hero-muted', heroLight ? '#655744' : '#b1a99b')
  root.style.setProperty('--desk', mixHex(palette[start][2], palette[end][2], t))
  const [r, g, b] = rgb(wall)
  const light = .299 * r + .587 * g + .114 * b > 150
  root.style.setProperty('--room-ink', light ? '#30271f' : '#f6ead7')
  root.style.setProperty('--room-muted', light ? '#594839' : '#decbb7')
  root.style.setProperty('--lace-blend', light ? 'multiply' : 'screen')
  root.style.setProperty('--lace-filter', light ? 'saturate(.25)' : 'invert(1) saturate(0)')
  root.style.setProperty('--lace-opacity', light ? '.62' : '.22')
  document.querySelectorAll('[data-room-control]').forEach(control => { control.value = mode })
}
sync()
document.addEventListener('change', event => {
  if (!event.target.matches('[data-room-control]')) return
  mode = event.target.value
  try { localStorage.setItem('writing-room-light', mode) } catch {}
  sync()
})
document.addEventListener('visibilitychange', sync)
window.addEventListener('pageshow', sync)
setInterval(sync, 30000)
