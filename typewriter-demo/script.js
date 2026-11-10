const hero = document.querySelector('.hero')
let seed = 12891
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const dust = document.querySelector('.room-dust')
const context = dust.getContext('2d')
const motes = Array.from({ length: 22 }, () => [random(), random(), random()])
let roomVisible = true
function updateLight() {
  const room = hero.getBoundingClientRect()
  if (document.hidden || !roomVisible || !room.width || !room.height) return
  const night = document.documentElement.dataset.roomTime === 'night'
  const lightAt = (x, y) => night
    ? Math.max(0, 1 - Math.hypot((x - .48) * 3, (y - .76) * 3))
    : Math.max(0, 1 - Math.abs(x - (.24 + y * .54)) * 5) * (1 - y * .5)

  const surfaces = hero.querySelectorAll('.typing-page')
  const pages = Array.from(surfaces)
  const samples = pages.map(surface => {
    const bounds = surface.getBoundingClientRect()
    return lightAt((bounds.left + bounds.width / 2 - room.left) / room.width,
      (bounds.top + bounds.height / 2 - room.top) / room.height)
  })
  pages.forEach((surface, index) => surface.style.setProperty('--room-glint', (samples[index] * .19).toFixed(3)))
  if (!context) return
  const width = Math.round(room.width)
  const height = Math.round(room.height)
  if (dust.width !== width || dust.height !== height) { dust.width = width; dust.height = height }
  context.clearRect(0, 0, width, height)
  if (reducedMotion.matches || night) return
  const time = performance.now() / 1000
  for (const [offset, seed, size] of motes) {
    const y = (offset + time * (.008 + size * .007)) % 1
    const x = .24 + y * .54 + (seed - .5) * .26 + Math.sin(time * .6 + seed * 12) * .02
    context.fillStyle = `rgba(255, 251, 225, ${lightAt(x, y) * .75})`
    context.beginPath()
    context.arc(x * width, y * height, .65 + size, 0, Math.PI * 2)
    context.fill()
  }
}
new IntersectionObserver(([entry]) => { roomVisible = entry.isIntersecting }).observe(hero)
setInterval(updateLight, 85)




