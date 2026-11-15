import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ParcelBoundary } from '../parcel/geometry'
import { fieldFootprint, plantingPoints } from './fieldGeometry'

export type CameraCommand = 'left' | 'right' | 'in' | 'out' | 'reset'
export function mountField(container: HTMLDivElement, boundary: ParcelBoundary, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.setClearColor('#e8eddb', 0)
  container.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight('#fff8e8', '#5d7044', 2.5))
  const light = new THREE.DirectionalLight('#fff5d9', 3); light.position.set(-5, 8, 5); scene.add(light)
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 100)
  camera.position.set(10, 10, 12)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, .4, 0); controls.minDistance = 7; controls.maxDistance = 42
  controls.maxPolarAngle = Math.PI / 2.2; controls.minPolarAngle = .12; controls.enablePan = false; controls.update(); controls.saveState()
  const ring = fieldFootprint(boundary), points = plantingPoints(ring)
  const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)))
  const groundGeometry = new THREE.ExtrudeGeometry(shape, { depth: .5, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 2, steps: 1 })
  groundGeometry.rotateX(-Math.PI / 2); groundGeometry.translate(0, -.5, 0)
  scene.add(new THREE.Mesh(groundGeometry, [new THREE.MeshStandardMaterial({ color: '#9d784d', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#735534', roughness: 1 })]))
  const outline = new THREE.BufferGeometry().setFromPoints([...ring, ring[0]].map(([x, z]) => new THREE.Vector3(x, .08, z)))
  scene.add(new THREE.Line(outline, new THREE.LineBasicMaterial({ color: '#466843' })))
  const base = new THREE.Mesh(new THREE.CylinderGeometry(7.7, 8.0, .15, 64), new THREE.MeshStandardMaterial({ color: '#d8e0c4', roughness: 1 }))
  base.position.y = -.85; scene.add(base)
  const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(.035, .05, 1, 5), new THREE.MeshStandardMaterial({ color: '#4b7a3d' }), 144)
  const leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#69a54a', roughness: .9 }), 144 * 4)
  const tops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#d4b65b', roughness: .9 }), 144)
  scene.add(stem, leaves, tops)
  const transform = new THREE.Object3D()
  let frame = 0, disposed = false
  function draw() { frame = 0; if (!disposed) renderer.render(scene, camera) }
  function refresh() { if (!disposed && !frame) frame = requestAnimationFrame(draw) }
  controls.addEventListener('change', refresh)
  function update(crop: string, stage: number) {
    const broad = crop === 'bean' || crop === 'lentil' || crop === 'potato'
    const height = [0, .18, .65, 1.1, .13][stage] * (crop === 'potato' ? .52 : crop === 'maize' ? 1.55 : .9)
    let leafIndex = 0
    stem.count = crop === 'fallow' || stage === 0 ? 0 : points.length
    tops.count = crop === 'fallow' || (stage !== 0 && stage !== 3) ? 0 : points.length
    points.forEach(([x, z], index) => {
      transform.position.set(x, height / 2 + .1, z); transform.rotation.set(0, 0, 0); transform.scale.set(1, Math.max(height, .01), 1); transform.updateMatrix(); stem.setMatrixAt(index, transform.matrix)
      if (stage > 0 && stage < 4 && crop !== 'fallow') for (let side = 0; side < 4; side++) {
        const direction = side % 2 === 0 ? -1 : 1
        transform.position.set(x + direction * (broad ? .12 : .16), .15 + height * (.22 + side * .16), z)
        transform.rotation.set(0, side * .8, direction * -.42)
        transform.scale.set(broad ? .23 : .29, .035, broad ? .13 : .065)
        transform.updateMatrix(); leaves.setMatrixAt(leafIndex++, transform.matrix)
      }
      transform.position.set(x, stage === 0 ? .12 : height + .1, z); transform.rotation.set(0, 0, 0)
      transform.scale.set(stage === 0 ? .055 : .09, stage === 0 ? .04 : broad ? .08 : .19, .065)
      transform.updateMatrix(); tops.setMatrixAt(index, transform.matrix)
    })
    leaves.count = leafIndex
    ;(tops.material as THREE.MeshStandardMaterial).color.set(crop === 'quinoa' ? '#cf7352' : crop === 'bean' || crop === 'lentil' || crop === 'potato' ? '#e5b2b3' : '#d4b65b')
    stem.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true; tops.instanceMatrix.needsUpdate = true
    // Positions are a bounded schematic grid, never measurements of plants or yield.
    stem.computeBoundingSphere(); leaves.computeBoundingSphere(); tops.computeBoundingSphere(); refresh()
  }
  function command(action: CameraCommand) {
    if (action === 'reset') controls.reset()
    else {
      const offset = camera.position.clone().sub(controls.target)
      if (action === 'left' || action === 'right') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), action === 'left' ? -.3 : .3)
      else offset.multiplyScalar(action === 'in' ? .86 : 1.16)
      offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length())))
      camera.position.copy(controls.target).add(offset); controls.update()
    }
    refresh()
  }
  let fitted = false
  const resize = new ResizeObserver(() => { const size = container.getBoundingClientRect(); if (!size.width || !size.height) return; camera.aspect = size.width / size.height; if (!fitted) { camera.position.set(10, 10, 12).normalize().multiplyScalar(20 * Math.max(1, 1 / Math.sqrt(camera.aspect))); controls.update(); controls.saveState(); fitted = true }; camera.updateProjectionMatrix(); renderer.setSize(size.width, size.height, false); refresh() }); resize.observe(container)
  const lost = (event: Event) => { event.preventDefault(); onFailure() }; renderer.domElement.addEventListener('webglcontextlost', lost)
  return { update, command, dispose() {
    disposed = true; cancelAnimationFrame(frame); resize.disconnect(); controls.removeEventListener('change', refresh); controls.dispose(); renderer.domElement.removeEventListener('webglcontextlost', lost)
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
    scene.traverse((obj) => { if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) { geometries.add(obj.geometry); (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((value) => materials.add(value)) } })
    geometries.forEach((value) => value.dispose()); materials.forEach((value) => value.dispose()); stem.dispose(); leaves.dispose(); tops.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
  } }
}
