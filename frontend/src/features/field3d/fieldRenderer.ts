import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ParcelBoundary } from '../parcel/geometry'
import { computeParcelSectors, fieldFootprint } from './fieldGeometry'

export type CameraCommand = 'left' | 'right' | 'in' | 'out' | 'reset'

export function mountField(
  container: HTMLDivElement,
  boundary: ParcelBoundary,
  onFailure: () => void,
  onSectorToggle?: (sectorId: number) => void,
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.setClearColor('#e8eddb', 0)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight('#fff8e8', '#5d7044', 2.5))
  const light = new THREE.DirectionalLight('#fff5d9', 3)
  light.position.set(-5, 8, 5)
  scene.add(light)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  camera.position.set(10, 10, 12)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.4, 0)
  controls.minDistance = 7
  controls.maxDistance = 42
  controls.maxPolarAngle = Math.PI / 2.2
  controls.minPolarAngle = 0.12
  controls.enablePan = false
  controls.update()
  controls.saveState()

  const ring = fieldFootprint(boundary)
  const { points, pointSectors, sectors } = computeParcelSectors(ring, boundary.properties.area.value)

  const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)))
  const groundGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelSize: 0.06,
    bevelThickness: 0.06,
    bevelSegments: 2,
    steps: 1,
  })
  groundGeometry.rotateX(-Math.PI / 2)
  groundGeometry.translate(0, -0.5, 0)
  const groundMesh = new THREE.Mesh(groundGeometry, [
    new THREE.MeshStandardMaterial({ color: '#9d784d', roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: '#735534', roughness: 1 }),
  ])
  scene.add(groundMesh)

  const outline = new THREE.BufferGeometry().setFromPoints([...ring, ring[0]].map(([x, z]) => new THREE.Vector3(x, 0.08, z)))
  scene.add(new THREE.Line(outline, new THREE.LineBasicMaterial({ color: '#466843' })))

  // Sector plot pads on the parcel surface so the farmer can see & click active vs resting zones
  const sectorPads: THREE.Mesh[] = sectors.map((sector) => {
    const padGeo = new THREE.RingGeometry(0.45, 0.68, 24)
    padGeo.rotateX(-Math.PI / 2)
    const padMat = new THREE.MeshBasicMaterial({
      color: '#5f8d4e',
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    })
    const pad = new THREE.Mesh(padGeo, padMat)
    pad.position.set(sector.center[0], 0.075, sector.center[1])
    pad.userData = { sectorId: sector.id }
    scene.add(pad)
    return pad
  })

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(7.7, 8.0, 0.15, 64),
    new THREE.MeshStandardMaterial({ color: '#d8e0c4', roughness: 1 }),
  )
  base.position.y = -0.85
  scene.add(base)

  const stem = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.035, 0.05, 1, 5),
    new THREE.MeshStandardMaterial({ color: '#4b7a3d' }),
    144,
  )
  const leaves = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#69a54a', roughness: 0.9 }),
    144 * 4,
  )
  const tops = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#d4b65b', roughness: 0.9 }),
    144,
  )
  scene.add(stem, leaves, tops)

  const transform = new THREE.Object3D()
  let frame = 0
  let waveFrame = 0
  let disposed = false
  let currentCrop = 'maize'
  let currentStage = 2
  let currentSectors: boolean[] = [true, true, true, true]

  function draw() {
    frame = 0
    if (!disposed) renderer.render(scene, camera)
  }
  function refresh() {
    if (!disposed && !frame) frame = requestAnimationFrame(draw)
  }
  controls.addEventListener('change', refresh)

  function applyMatrices(crop: string, stage: number, activeSectors: boolean[], growthProgress = 1, pulseSector = -1) {
    const broad = crop === 'bean' || crop === 'lentil' || crop === 'potato' || crop === 'soybean'
    const baseHeight = [0, 0.18, 0.65, 1.1, 0.13][stage] * (crop === 'potato' ? 0.52 : crop === 'maize' ? 1.55 : 0.9)
    let stemIndex = 0
    let leafIndex = 0
    let topIndex = 0

    sectorPads.forEach((pad, idx) => {
      const isActive = activeSectors[idx] ?? true
      const mat = pad.material as THREE.MeshBasicMaterial
      mat.color.set(isActive ? '#4f7f3f' : '#9a7b56')
      const isPulsing = pulseSector === idx || (pulseSector === 99 && isActive)
      const pulseScale = isPulsing ? 1 + Math.sin(growthProgress * Math.PI) * 0.45 : 1
      pad.scale.set(pulseScale, 1, pulseScale)
      mat.opacity = isPulsing ? 0.65 : isActive ? 0.26 : 0.18
    })

    points.forEach(([x, z], index) => {
      const sectorId = pointSectors[index] ?? 0
      if (!(activeSectors[sectorId] ?? true)) return
      const animatedSector = pulseSector === -1 || pulseSector === 99 || pulseSector === sectorId
      const stagger = Math.min(1, Math.max(0.08, growthProgress * 1.25 - (index % 12) * 0.02))
      const factor = animatedSector ? stagger : 1
      const height = baseHeight * factor

      if (crop !== 'fallow' && stage > 0) {
        transform.position.set(x, height / 2 + 0.1, z)
        transform.rotation.set(0, 0, 0)
        transform.scale.set(1, Math.max(height, 0.01), 1)
        transform.updateMatrix()
        stem.setMatrixAt(stemIndex++, transform.matrix)
      }

      if (stage > 0 && stage < 4 && crop !== 'fallow') {
        for (let side = 0; side < 4; side++) {
          const direction = side % 2 === 0 ? -1 : 1
          transform.position.set(x + direction * (broad ? 0.12 : 0.16) * factor, 0.15 + height * (0.22 + side * 0.16), z)
          transform.rotation.set(0, side * 0.8, direction * -0.42)
          transform.scale.set((broad ? 0.23 : 0.29) * factor, 0.035 * factor, (broad ? 0.13 : 0.065) * factor)
          transform.updateMatrix()
          leaves.setMatrixAt(leafIndex++, transform.matrix)
        }
      }

      if (crop !== 'fallow' && (stage === 0 || stage === 3)) {
        transform.position.set(x, stage === 0 ? 0.12 : height + 0.1, z)
        transform.rotation.set(0, 0, 0)
        transform.scale.set(
          (stage === 0 ? 0.055 : 0.09) * factor,
          (stage === 0 ? 0.04 : broad ? 0.08 : 0.19) * factor,
          0.065 * factor,
        )
        transform.updateMatrix()
        tops.setMatrixAt(topIndex++, transform.matrix)
      }
    })

    stem.count = stemIndex
    leaves.count = leafIndex
    tops.count = topIndex
    ;(tops.material as THREE.MeshStandardMaterial).color.set(
      crop === 'quinoa' ? '#cf7352' : crop === 'bean' || crop === 'lentil' || crop === 'potato' || crop === 'soybean' ? '#e5b2b3' : '#d4b65b',
    )
    stem.instanceMatrix.needsUpdate = true
    leaves.instanceMatrix.needsUpdate = true
    tops.instanceMatrix.needsUpdate = true
    stem.computeBoundingSphere()
    leaves.computeBoundingSphere()
    tops.computeBoundingSphere()
    refresh()
  }

  function update(crop: string, stage: number, activeSectors: boolean[] = currentSectors, animateSector = -1) {
    currentCrop = crop
    currentStage = stage
    currentSectors = activeSectors
    cancelAnimationFrame(waveFrame)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.querySelector('.journey-shell.motion-off') !== null
    if (animateSector === -1 || reduced) {
      applyMatrices(crop, stage, activeSectors, 1, -1)
      return
    }
    const start = performance.now()
    const duration = 520
    function step(now: number) {
      if (disposed) return
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      applyMatrices(currentCrop, currentStage, currentSectors, eased, animateSector)
      if (t < 1) waveFrame = requestAnimationFrame(step)
      else applyMatrices(currentCrop, currentStage, currentSectors, 1, -1)
    }
    waveFrame = requestAnimationFrame(step)
  }

  // Allow clicking directly on the 3D parcel ground to toggle/plant the nearest agricultural sector
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let downPos: [number, number] | null = null
  const onPointerDown = (event: PointerEvent) => {
    downPos = [event.clientX, event.clientY]
  }
  const onPointerUp = (event: PointerEvent) => {
    if (!downPos || !onSectorToggle || !points.length) return
    if (Math.hypot(event.clientX - downPos[0], event.clientY - downPos[1]) > 6) return
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObject(groundMesh, false)
    if (hits.length > 0) {
      const pt = hits[0].point
      let bestSector = 0
      let bestDist = Infinity
      sectors.forEach((sec) => {
        const d = Math.hypot(pt.x - sec.center[0], pt.z - sec.center[1])
        if (d < bestDist) {
          bestDist = d
          bestSector = sec.id
        }
      })
      onSectorToggle(bestSector)
    }
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)

  function command(action: CameraCommand) {
    if (action === 'reset') controls.reset()
    else {
      const offset = camera.position.clone().sub(controls.target)
      if (action === 'left' || action === 'right') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), action === 'left' ? -0.3 : 0.3)
      else offset.multiplyScalar(action === 'in' ? 0.86 : 1.16)
      offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length())))
      camera.position.copy(controls.target).add(offset)
      controls.update()
    }
    refresh()
  }

  let fitted = false
  const resize = new ResizeObserver(() => {
    const size = container.getBoundingClientRect()
    if (!size.width || !size.height) return
    camera.aspect = size.width / size.height
    if (!fitted) {
      camera.position
        .set(10, 10, 12)
        .normalize()
        .multiplyScalar(20 * Math.max(1, 1 / Math.sqrt(camera.aspect)))
      controls.update()
      controls.saveState()
      fitted = true
    }
    camera.updateProjectionMatrix()
    renderer.setSize(size.width, size.height, false)
    refresh()
  })
  resize.observe(container)

  const lost = (event: Event) => {
    event.preventDefault()
    onFailure()
  }
  renderer.domElement.addEventListener('webglcontextlost', lost)

  return {
    update,
    command,
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      cancelAnimationFrame(waveFrame)
      resize.disconnect()
      controls.removeEventListener('change', refresh)
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          geometries.add(obj.geometry)
          ;(Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((value) => materials.add(value))
        }
      })
      geometries.forEach((value) => value.dispose())
      materials.forEach((value) => value.dispose())
      stem.dispose()
      leaves.dispose()
      tops.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
