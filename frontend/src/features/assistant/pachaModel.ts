import * as THREE from 'three'

export type PachaMood = 'welcome' | 'explain' | 'listen' | 'celebrate' | 'think' | 'travel' | 'curious' | 'point'

/** Procedural 3D model following the team's cream/green long-eared character. */
export function createPachaModel() {
  const root = new THREE.Group()
  const cream = new THREE.MeshStandardMaterial({ color: '#f4e9d6', roughness: .55 })
  const forest = new THREE.MeshStandardMaterial({ color: '#125337', roughness: .6 })
  const green = new THREE.MeshStandardMaterial({ color: '#147846', roughness: .5 })
  const mint = new THREE.MeshStandardMaterial({ color: '#65eda1', roughness: .33, emissive: '#173c23', emissiveIntensity: .15 })
  const leaf = new THREE.MeshStandardMaterial({ color: '#a0d74d', roughness: .7 })
  const blush = new THREE.MeshStandardMaterial({ color: '#e9b7a0', roughness: .6 })
  const sphere = new THREE.SphereGeometry(1, 32, 24)
  function oval(parent: THREE.Object3D, material: THREE.Material, position: number[], scale: number[]) {
    const mesh = new THREE.Mesh(sphere, material)
    mesh.position.set(position[0], position[1], position[2]); mesh.scale.set(scale[0], scale[1], scale[2]); parent.add(mesh)
    return mesh
  }
  oval(root, cream, [0, 1.12, 0], [.65, .78, .45])
  oval(root, forest, [0, 1.13, .38], [.44, .61, .11])
  oval(root, cream, [0, 1.13, .42], [.40, .57, .10])
  for (const side of [-1, 1]) {
    oval(root, forest, [side * .38, .43, .02], [.25, .36, .26])
    oval(root, cream, [side * .40, .22, .15], [.35, .23, .46])
    oval(root, green, [side * .38, .49, .06], [.25, .10, .27])
  }
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group(); arm.position.set(side * .65, 1.55, 0); root.add(arm)
    oval(arm, green, [side * .02, -.18, -.05], [.25, .41, .25])
    oval(arm, cream, [side * .14, -.42, .1], [.24, .31, .25])
    oval(arm, forest, [0, 0, .17], [.23, .25, .11])
    oval(arm, mint, [0, 0, .22], [.16, .18, .08])
    return arm
  })
  const chest = new THREE.Group(); chest.position.set(0, 1.20, .52); root.add(chest)
  oval(chest, green, [-.11, .03, 0], [.12, .22, .035]).rotation.z = .6
  oval(chest, leaf, [-.10, .04, .02], [.085, .17, .025]).rotation.z = .6
  oval(chest, green, [.11, .06, 0], [.13, .25, .035]).rotation.z = -.6
  oval(chest, leaf, [.11, .07, .02], [.095, .20, .025]).rotation.z = -.6
  const head = new THREE.Group(); head.position.y = 2.48; root.add(head)
  oval(head, forest, [0, 0, 0], [1.13, .97, .69])
  oval(head, cream, [0, .015, .03], [1.08, .92, .67])
  oval(head, forest, [0, .02, .57], [.92, .73, .19])
  oval(head, mint, [0, .025, .61], [.87, .68, .18])
  const eyes = [-1, 1].map((side) => {
    const eye = oval(head, forest, [side * .37, .12, .80], [.085, .18, .035]); eye.rotation.z = -.06; return eye
  })
  const brows = [-1, 1].map((side) => { const brow = oval(head, forest, [side * .37, .40, .77], [.12, .025, .025]); return brow })
  const nose = new THREE.Shape(); nose.moveTo(-.07, 0); nose.lineTo(.07, 0); nose.lineTo(0, -.08); nose.closePath()
  const noseMesh = new THREE.Mesh(new THREE.ShapeGeometry(nose), forest); noseMesh.position.set(0, -.10, .81); head.add(noseMesh)
  const mouthCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.21, -.24, .79), new THREE.Vector3(-.11, -.31, .82), new THREE.Vector3(0, -.25, .83), new THREE.Vector3(.11, -.31, .82), new THREE.Vector3(.21, -.24, .79)])
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 24, .025, 8, false), forest); head.add(mouth)
  oval(head, blush, [-.62, -.20, .74], [.095, .045, .025]); oval(head, blush, [.62, -.20, .74], [.095, .045, .025])
  const ears = [-1, 1].map((side) => {
    const ear = new THREE.Group(); ear.position.set(side * .67, .61, -.07); ear.rotation.z = side * -.22; head.add(ear)
    oval(ear, forest, [0, .82, 0], [.30, 1.02, .25]); oval(ear, cream, [0, .83, .02], [.265, .98, .235])
    for (const y of [.65, 1.2]) { oval(ear, green, [0, y, .02], [.285, .12, .245]); oval(ear, mint, [0, y + .015, .06], [.28, .085, .215]) }
    oval(ear, green, [0, .03, .12], [.34, .20, .24]); return ear
  })
  const sprout = new THREE.Group(); sprout.position.set(.87, 3.38, .19); sprout.rotation.z = -.35; root.add(sprout)
  oval(sprout, green, [0, .08, 0], [.025, .20, .025]); oval(sprout, leaf, [-.09, .24, 0], [.075, .14, .035]).rotation.z = .7; oval(sprout, leaf, [.09, .23, 0], [.075, .14, .035]).rotation.z = -.7

  function pose(time: number, mood: PachaMood, moving: boolean, delta = 1 / 60) {
    const t = moving ? time : 0
    const smooth = (value: number, target: number) => moving ? THREE.MathUtils.damp(value, target, 9, delta) : target
    const flying = mood === 'travel'
    root.rotation.y = smooth(root.rotation.y, flying ? Math.sin(t * 2) * .18 : mood === 'point' ? -.4 : mood === 'explain' ? -.18 : .06)
    root.rotation.z = smooth(root.rotation.z, flying ? Math.sin(t * 3) * .055 : 0)
    root.rotation.x = smooth(root.rotation.x, flying ? -.12 : 0)
    root.position.y = smooth(root.position.y, flying ? .12 + Math.sin(t * 5) * .045 : mood === 'celebrate' && moving ? Math.abs(Math.sin(t * 2.3)) * .07 : moving ? Math.sin(t * 1.8) * .025 : 0)
    head.rotation.z = smooth(head.rotation.z, mood === 'curious' ? .16 : mood === 'listen' ? -.07 : Math.sin(t * .9) * .012)
    head.rotation.y = smooth(head.rotation.y, mood === 'point' ? -.1 : 0)
    ears[0].rotation.z = smooth(ears[0].rotation.z, (flying ? .4 : .22) + Math.sin(t * 1.2) * (mood === 'think' ? .12 : .025))
    ears[1].rotation.z = smooth(ears[1].rotation.z, (flying ? -.4 : -.22) + Math.sin(t * 1.1 + 1) * .03)
    arms[0].rotation.z = smooth(arms[0].rotation.z, flying ? -1.2 : mood === 'explain' || mood === 'point' ? -.85 : .05)
    arms[1].rotation.z = smooth(arms[1].rotation.z, flying ? 1.2 : mood === 'welcome' || mood === 'celebrate' ? .85 + Math.sin(t * 3) * .16 : .05)
    brows.forEach((brow, index) => { brow.rotation.z = smooth(brow.rotation.z, mood === 'curious' ? (index ? -.4 : .35) : mood === 'think' ? (index ? .25 : -.25) : 0) })
    const blink = moving && t % 4.6 > 4.35 ? .12 : mood === 'celebrate' ? .55 : 1
    eyes.forEach((eye, index) => { eye.scale.y = .18 * blink * (mood === 'curious' && !index ? .7 : 1) })
    mouth.scale.y = smooth(mouth.scale.y, mood === 'think' ? .45 : mood === 'celebrate' ? 1.3 : mood === 'curious' ? .7 : 1)
  }

  function dispose() {
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>()
    root.traverse((object) => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); const values = Array.isArray(object.material) ? object.material : [object.material]; values.forEach((value) => materials.add(value)) } })
    geometries.forEach((value) => value.dispose()); materials.forEach((value) => value.dispose())
  }
  return { root, pose, dispose }
}

export function mountPacha(container: HTMLDivElement, state: { current: { paused: boolean; mood: PachaMood } }, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0, 0)
  container.appendChild(renderer.domElement)
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(31, 1, .1, 50)
  camera.position.set(2.1, 2.7, 10); camera.lookAt(0, 2.38, 0)
  scene.add(new THREE.HemisphereLight('#fff8e7', '#b6c8a3', 2.6))
  const key = new THREE.DirectionalLight('#fff7e4', 3.2); key.position.set(-3, 6, 5); scene.add(key)
  const rim = new THREE.DirectionalLight('#c1edc4', 1.7); rim.position.set(4, 3, -2); scene.add(rim)
  const model = createPachaModel(); scene.add(model.root)
  let frame = 0, started = performance.now(), previous = started, visible = true, disposed = false
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  function draw(now: number) {
    if (disposed) return
    const elapsed = (now - started) / 1000
    const moving = !state.current.paused && !reduced.matches && visible && !document.hidden && (elapsed < 5 || state.current.mood === 'think')
    model.pose(elapsed, state.current.mood, moving, Math.min((now - previous) / 1000, .05)); previous = now; renderer.render(scene, camera)
    frame = moving ? requestAnimationFrame(draw) : 0
  }
  function refresh() { if (disposed) return; cancelAnimationFrame(frame); started = performance.now(); frame = requestAnimationFrame(draw) }
  const resize = new ResizeObserver(() => { const { width, height } = container.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); refresh() }); resize.observe(container)
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh() }); intersection.observe(container)
  function lost(event: Event) { event.preventDefault(); onFailure() }
  renderer.domElement.addEventListener('webglcontextlost', lost)
  reduced.addEventListener('change', refresh); document.addEventListener('visibilitychange', refresh)
  refresh()
  return { refresh, dispose() { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect(); reduced.removeEventListener('change', refresh); document.removeEventListener('visibilitychange', refresh); renderer.domElement.removeEventListener('webglcontextlost', lost); model.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove() } }
}
