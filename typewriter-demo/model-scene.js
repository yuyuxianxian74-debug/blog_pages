import * as THREE from 'three'
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js'

const machine = document.querySelector('.machine')
const windowElement = machine.querySelector('.paper-feed-window')
const sheet = windowElement.querySelector('.typing-page')
const canvas = document.createElement('canvas')
canvas.className = 'machine-model'
canvas.setAttribute('aria-label', '奶油色复古打字机三维模型')
machine.prepend(canvas)

export const modelReady = (async () => {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, .01, 20)
  scene.add(new THREE.HemisphereLight(0xfff6e7, 0x726351, 2.1))
  const light = new THREE.DirectionalLight(0xffecd0, 3.4)
  light.position.set(-.55, .9, .45)
  light.castShadow = true
  light.shadow.mapSize.set(1024, 1024)
  Object.assign(light.shadow.camera, { left: -.5, right: .5, top: .5, bottom: -.5, near: .1, far: 3 })
  light.shadow.bias = -.0004
  scene.add(light)
  const fill = new THREE.DirectionalLight(0xe3edff, .8)
  fill.position.set(.4, .3, -.4)
  scene.add(fill)

  const { scene: model } = await new GLTFLoader().loadAsync('../models/typewriter-cream.glb')
  model.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true
      object.receiveShadow = true
    }
  })
  scene.add(model)
  model.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(model)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  const anchor = model.getObjectByName('PaperSpawnPoint')
  if (!anchor) throw new Error('GLB 缺少 PaperSpawnPoint 出纸节点')
  const platen = model.getObjectByName('Platen')
  const startRotation = platen?.rotation.x ?? 0
  const paperWidth = anchor.userData.paperWidthMeters || .21
  const paperHeight = paperWidth * 1.2
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2), new THREE.ShadowMaterial({ opacity: .24 })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = bounds.min.y - .001
  shadow.receiveShadow = true
  scene.add(shadow)
  light.target.position.copy(center)
  scene.add(light.target)
  let viewportWidth = 0
  let viewportHeight = 0

  function project(point) {
    const projected = anchor.localToWorld(point).project(camera)
    return new THREE.Vector2((projected.x + 1) * viewportWidth / 2, (1 - projected.y) * viewportHeight / 2)
  }

  function resize() {
    viewportWidth = machine.clientWidth
    viewportHeight = machine.clientHeight
    if (!viewportWidth || !viewportHeight) return
    renderer.setSize(viewportWidth, viewportHeight, false)
    camera.aspect = viewportWidth / viewportHeight
    const radius = size.length() / 2
    const distance = radius / Math.sin(camera.fov * Math.PI / 360) * 1.06
    camera.position.copy(center).add(new THREE.Vector3(-.32, .59, 1).normalize().multiplyScalar(distance))
    camera.lookAt(center)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    const origin = project(new THREE.Vector3())
    const right = project(new THREE.Vector3(paperWidth / 2, 0, 0)).sub(project(new THREE.Vector3(-paperWidth / 2, 0, 0)))
    const down = origin.clone().sub(project(new THREE.Vector3(0, paperHeight, 0)))
    const width = right.length()
    const height = down.length()
    const transform = `matrix(${right.x / width},${right.y / width},${down.x / height},${down.y / height},0,0)`
    Object.assign(windowElement.style, {
      left: origin.x - width / 2 + 'px', right: 'auto',
      top: origin.y - height + 'px', bottom: 'auto',
      width: width + 'px', height: height + 'px',
      aspectRatio: 'auto', transform, transformOrigin: 'bottom center'
    })
    machine.dataset.paperTransform = transform
    renderer.render(scene, camera)
  }

  let visible = true
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }).observe(machine)
  const observer = new ResizeObserver(resize)
  observer.observe(machine)
  machine.classList.add('model-loaded')
  resize()

  function render() {
    if (!visible || document.hidden) return
    const animation = sheet.getAnimations().find(item => item.playState === 'running')
    if (platen && animation) {
      const progress = animation.effect.getComputedTiming().progress ?? 0
      platen.rotation.x = startRotation - progress * paperHeight / (platen.userData.radiusMeters || .0165)
    }
    renderer.render(scene, camera)
  }
  renderer.setAnimationLoop(render)
  window.addEventListener('pagehide', () => renderer.setAnimationLoop(null))
  window.addEventListener('pageshow', event => {
    // A cached page reuses its resources and renders on resize.
    if (event.persisted) {
      resize()
      renderer.setAnimationLoop(render)
    }
  })
  return model
})().catch(error => {
  canvas.remove()
  machine.dataset.modelError = error.message
  console.error('打字机模型加载失败', error)
  throw error
})


