import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight, PCFSoftShadowMap } from "three"
import { VRButton } from "three/addons/webxr/VRButton.js"
import { Actor } from "./everywhere-everything/actor.js"

const meta = MetaFor("webxr")
  .context((t) => ({
    fov: t.number.required(75, { label: "" }),
    aspect: t.number.optional(),
    near: t.number.optional(0.1),
    far: t.number.optional(1000),
    antialias: t.boolean.optional(true),
    shadowMapEnable: t.boolean.optional(true),
    shadowMapType: t.enum(PCFSoftShadowMap).optional(PCFSoftShadowMap, { label: "" }),
    clearColor: t.number.required(0x222222),
    width: t.number.optional(),
    height: t.number.optional(),
  }))
  .states({
    "сбор данных из DOM": {
      "инициализация сцены": {
        aspect: { null: false },
        width: { null: false },
        height: { null: false },
      },
    },
    "инициализация сцены": {
      "настройка рендерера": {},
    },
    "настройка рендерера": {},
  })
  .core({
    /** @type {Scene|null} */
    scene: null,
    /** @type {PerspectiveCamera|null} */
    camera: null,
    /** @type {WebGLRenderer|null} */
    renderer: null,
  })
  .processes((process) => ({
    "сбор данных из DOM": process()
      .action(() => {
        const width = window.innerWidth
        const height = window.innerHeight
        return {
          width,
          height,
          aspect: width / height,
        }
      })
      .success(({ data, update }) => update(data))
      .error(() => {}),
    "инициализация сцены": process()
      .action(async ({ context, schema, core }) => {
        const { Scene, PerspectiveCamera } = await import("three")
        core.scene = new Scene()
        core.camera = new PerspectiveCamera(context.fov, context.aspect ?? schema.aspect.default, 0.1, 1000)
        core.renderer = new WebGLRenderer({ antialias: context.antialias ?? schema.antialias.default })
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setClearColor(context.clearColor)
        renderer.shadowMap.enabled = context.shadowMapEnable ?? schema.shadowMapEnable.default
        renderer.shadowMap.type = PCFSoftShadowMap
      })
      .success(({ data, update }) => update({}))
      .error(() => {}),
  }))
  .reactions()
  .view()

const actor = Actor.fromSchema(meta, "0")

console.log("WebXR 3D Gallery starting...", meta)

// Проверка поддержки WebXR
async function checkWebXRSupport() {
  if (!navigator.xr) {
    console.warn("WebXR не поддерживается в этом браузере")
    return false
  }

  try {
    const isSupported = await navigator.xr.isSessionSupported("immersive-vr")
    console.log("WebXR immersive-vr поддерживается:", isSupported)
    return isSupported
  } catch (error) {
    console.error("Ошибка проверки WebXR:", error)
    return false
  }
}

// Инициализация сцены
const scene = new Scene()
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new WebGLRenderer({ antialias: true })

// Настройка рендерера
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x222222)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = PCFSoftShadowMap

// Добавление рендерера в DOM
document.body.appendChild(renderer.domElement)

// Освещение
const ambientLight = new AmbientLight(0x404040, 0.6)
scene.add(ambientLight)

const directionalLight = new DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(10, 10, 5)
directionalLight.castShadow = true
scene.add(directionalLight)

// Позиция камеры
camera.position.set(0, 1.6, 0)

// WebXR инициализация
async function initWebXR() {
  const isSupported = await checkWebXRSupport()

  if (isSupported) {
    // Включаем WebXR только после проверки поддержки
    renderer.xr.enabled = true

    // Добавляем VR кнопку только если WebXR поддерживается
    const vrButton = VRButton.createButton(renderer)
    document.body.appendChild(vrButton)

    console.log("WebXR инициализирован успешно")
  } else {
    console.log("WebXR недоступен, работаем в обычном режиме")
  }
}

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

// Инициализация приложения
async function init() {
  await initWebXR()
  animate()
  console.log("WebXR 3D Gallery initialized!")
}

// Запуск приложения
// init()
