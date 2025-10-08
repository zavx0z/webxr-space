import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight, PCFSoftShadowMap } from "three"
import { VRButton } from "three/addons/webxr/VRButton.js"

console.log("WebXR 3D Gallery starting...")

// Инициализация сцены
const scene = new Scene()
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new WebGLRenderer({ antialias: true })

// Настройка рендерера
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x222222)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = PCFSoftShadowMap
renderer.xr.enabled = true

// Добавление рендерера в DOM
document.body.appendChild(renderer.domElement)

// Добавление VR кнопки
document.body.appendChild(VRButton.createButton(renderer))

// Освещение
const ambientLight = new AmbientLight(0x404040, 0.6)
scene.add(ambientLight)

const directionalLight = new DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(10, 10, 5)
directionalLight.castShadow = true
scene.add(directionalLight)

// Позиция камеры
camera.position.set(0, 1.6, 0)

// Анимационный цикл
function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera)
  })
}

// Обработка изменения размера окна
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Запуск анимации
animate()

console.log("WebXR 3D Gallery initialized!")
