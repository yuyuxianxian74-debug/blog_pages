import { modelReady } from './model-scene.js'
const hero = document.querySelector('.hero')
const machine = hero.querySelector('.machine')
const sheet = machine.querySelector('.typing-page')
const rollers = machine.querySelectorAll('.mechanical-carriage i')
const preference = matchMedia('(prefers-reduced-motion: reduce)')
const activePages = new Set()
const timers = new Set()
const feedDuration = 1180
let nextTrack = 0
let feed
let leaving = false

// Each point contains time, position, and local X/Y/Z rotation.
const tracks = [
  { source: 'roller', width: 10, bend: .13, peak: 1.8, points: [
    [0, 0, 0, 0, 0, 0, 0], [.65, 52, 50, 5, 18, 20, 12], [1.8, 64, 35, 55, 34, 80, 38],
    [3.1, 78, 40, 5, -18, 144, 54], [4.8, 108, 19, -110, 23, 221, 73]
  ] },
  { source: 'desk', width: 14, bend: .21, peak: 2.2, points: [
    [.8, 18, 87, 0, 70, -20, -12], [1.65, 29, 64, 100, 24, -62, 26],
    [2.7, 55, 49, 170, -30, 102, 65], [3.6, 112, 32, 120, 15, 230, 120]
  ] },
  { width: 5, bend: .06, peak: 4.5, points: [
    [0, -8, 23, -200, 15, 40, -22], [2.2, 24, 19, -185, 28, 80, 1],
    [4.5, 63, 28, -170, -12, 128, 28], [7, 108, 14, -215, 12, 178, 49]
  ] },
  { source: 'desk', width: 10, bend: .16, peak: 5.1, points: [
    [2.3, 75, 88, 0, 72, 24, 10], [3.25, 68, 66, 32, 38, 75, -18],
    [4.55, 54, 51, 20, -22, 160, -38], [5.7, 59, 56, -10, 35, 205, 2], [6.75, 105, 29, -75, 16, 285, 46]
  ] },
  { width: 15, bend: .23, peak: 5.45, points: [
    [4.6, -12, 75, 140, 28, -35, 23], [5.1, 25, 57, 180, -15, 58, 62],
    [5.8, 64, 30, 195, 30, 132, 112], [6.35, 113, 11, 155, -10, 216, 155]
  ] }
]

for (let index = 0; index < 9; index++) {
  const page = document.createElement('div')
  page.className = 'desk-sheet'
  page.setAttribute('aria-hidden', 'true')
  Object.assign(page.style, {
    left: 8 + index * 9 + '%',
    top: 88 + index % 3 * 3 + '%',
    transform: 'translate(-50%, -50%) rotate(' + (index * 19 % 55 - 27) + 'deg)'
  })
  hero.insertBefore(page, machine)
}

function later(callback, delay) {
  const timer = setTimeout(() => {
    timers.delete(timer)
    callback()
  }, delay)
  timers.add(timer)
}

function flightFrames(points, room) {
  const first = points[0][0]
  const last = points.at(-1)[0]
  const frames = []
  for (let index = 0; index < points.length - 1; index++) {
    const a = points[index]
    const b = points[index + 1]
    const previous = points[index - 1] ?? a
    const next = points[index + 2] ?? b
    const span = b[0] - a[0]
    // Time-weighted Hermite tangents give adjacent segments the same velocity.
    for (let step = 0; step < 16; step++) {
      const t = step / 16
      const values = a.slice(1).map((value, column) => {
        const j = column + 1
        const m = span * (b[j] - previous[j]) / (b[0] - previous[0])
        const n = span * (next[j] - value) / (next[0] - a[0])
        return value + (b[j] - value) * t * t * (3 - 2 * t) + m * t * (1 - t) ** 2 - n * t * t * (1 - t)
      })
      frames.push({ offset: (a[0] + t * span - first) / (last - first), transform: pose(values) })
    }
  }
  frames.push({ offset: 1, transform: pose(points.at(-1).slice(1)) })
  return frames

  function pose([x, y, z, pitch, yaw, roll]) {
    return `perspective(950px) translate3d(${x * room.width / 100}px,${y * room.height / 100}px,${z}px) rotateZ(${roll}deg) rotateY(${yaw}deg) rotateX(${pitch}deg)`
  }
}

function release(track) {
  const room = hero.getBoundingClientRect()
  const points = track.points.map(point => [...point])
  const first = points[0][0]
  const trackDuration = points.at(-1)[0] - first
  const duration = 5900 + nextTrack % tracks.length * 360
  const source = sheet.getBoundingClientRect()
  const width = sheet.offsetWidth
  const height = sheet.offsetHeight
  const x = (source.left + source.width / 2 - room.left) / room.width * 100
  const y = (source.top + source.height / 2 - room.top) / room.height * 100
  const [time, , , , , yaw] = points[1]
  points[0] = [first, x, y, 0, 0, 0, 0]
  points.splice(1, 0, [first + (time - first) * .32, x, y - 6, 8, 4, Math.sign(yaw) * 12, 3])

  const page = document.createElement('div')
  const face = document.createElement('div')
  page.className = 'typing-page released-sheet choreographed-sheet'
  page.setAttribute('aria-hidden', 'true')
  face.className = 'released-face'
  Object.assign(page.style, {
    left: -width / 2 + 'px', top: -height / 2 + 'px',
    width: width + 'px', height: height + 'px'
  })
  page.style.setProperty('--surface-width', width + 'px')
  if (track.width === 5) page.classList.add('distant-sheet')
  const peak = Math.min(.86, (track.peak + .15 - first) / trackDuration)

  for (const section of ['left', 'center', 'right']) {
    const panel = document.createElement('div')
    const surface = document.createElement('div')
    panel.className = 'paper-panel paper-panel-' + section
    surface.className = 'paper-surface'
    panel.append(surface)
    face.append(panel)
    if (section === 'center') continue
    const leading = section === 'right'
    const angle = Math.asin(track.bend * 4) * 180 / Math.PI * (leading ? 1 : -.55)
    const curlPeak = Math.min(.92, peak + (leading ? 0 : .06))
    panel.animate([
      { transform: 'rotateY(0deg)' },
      { offset: curlPeak, transform: `rotateY(${angle}deg)` },
      { offset: (curlPeak + 1) / 2, transform: `rotateY(${-angle * .38}deg)` },
      { transform: 'rotateY(0deg)' }
    ], { duration, easing: 'ease-in-out' })
  }

  page.append(face)
  hero.append(page)
  const frames = flightFrames(points, room)
  const angle = new DOMMatrixReadOnly(getComputedStyle(machine).transform)
  frames[0].transform += ' ' + (machine.dataset.paperTransform || `matrix(${angle.a}, ${angle.b}, ${angle.c}, ${angle.d}, 0, 0)`)
  const motion = page.animate(frames, { duration, fill: 'both' })
  const entry = { page, face, motion }
  entry.erosion = face.animate([
    { '--char-line': '-18%' }, { '--char-line': '116%' }
  ], { delay: duration - 1000, duration: 1000, easing: 'ease-in', fill: 'both' })
  activePages.add(entry)
  motion.onfinish = () => remove(entry)
}

function remove(entry) {
  entry.page.remove()
  activePages.delete(entry)
}

function startCycle() {
  if (preference.matches || leaving) return
  sheet.style.visibility = ''
  for (const knob of rollers) {
    knob.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
      { duration: feedDuration, easing: 'steps(6, end)' })
  }
  feed = sheet.animate([
    { transform: nextTrack ? 'translateY(100%)' : 'translateY(55%)', borderRadius: '0' },
    { offset: .55, transform: 'translateY(45%)', borderRadius: '0 18% 0 0 / 0 7% 0 0' },
    { transform: 'translateY(0)', borderRadius: '0' }
  ],
    { duration: feedDuration, easing: 'steps(6, end)', fill: 'both' })
  const currentFeed = feed
  currentFeed.onfinish = () => {
    release(tracks[nextTrack++ % tracks.length])
    sheet.style.visibility = 'hidden'
    currentFeed.cancel()
    if (leaving) {
      burn()
      return
    }
    startCycle()
  }
}

function burn() {
  const entries = [...activePages]
  for (const entry of entries) {
    entry.motion.onfinish = null
    entry.erosion.cancel()
    for (const animation of entry.page.getAnimations({ subtree: true })) {
      if (animation.playState === 'running') animation.updatePlaybackRate(.25)
    }
  }
  later(() => {
    for (const entry of entries) {
      for (const animation of entry.page.getAnimations({ subtree: true })) animation.pause()
      entry.face.animate([
        { '--char-line': '-18%' }, { '--char-line': '116%' }
      ], { duration: 760, easing: 'ease-in', fill: 'forwards' }).onfinish = () => remove(entry)
      const rect = entry.page.getBoundingClientRect()
      const room = hero.getBoundingClientRect()
      for (let index = 0; index < 4; index++) {
        const ash = document.createElement('i')
        ash.className = 'paper-ash'
        ash.style.left = rect.left - room.left + rect.width * (index + 1) / 5 + 'px'
        ash.style.top = rect.top - room.top + rect.height * .5 + 'px'
        hero.append(ash)
        ash.animate([
          { opacity: 0, transform: 'translateY(0)' },
          { opacity: .7, offset: .24 },
          { opacity: 0, transform: `translate(${(index - 1.5) * 12}px, -65px)` }
        ], { delay: 280 + index * 65, duration: 500, fill: 'both' }).onfinish = () => ash.remove()
      }
    }
  }, 200)
}

function stop() {
  for (const timer of timers) clearTimeout(timer)
  timers.clear()
  feed?.cancel()
  for (const entry of activePages) remove(entry)
  hero.querySelectorAll('.paper-ash').forEach(ash => ash.remove())
  sheet.style.visibility = ''
}

function updateScroll() {
  const remaining = hero.getBoundingClientRect().bottom
  if (!leaving && remaining < innerHeight * .58) {
    leaving = true
    for (const timer of timers) clearTimeout(timer)
    timers.clear()
    if (feed?.playState !== 'running') burn()
  } else if (leaving && remaining > innerHeight * .8) {
    stop()
    leaving = false
    startCycle()
  }
}
window.addEventListener('scroll', updateScroll, { passive: true })
preference.addEventListener('change', () => {
  stop()
  if (!preference.matches) startCycle()
})
window.addEventListener('pagehide', stop)
window.addEventListener('pageshow', event => { if (event.persisted) startCycle() })
await modelReady.catch(() => {})
updateScroll()
startCycle()



