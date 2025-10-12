// ───────────────────────────────────────────────────────────────────────────────
// Particles Worker — иерархические орбиты с толщиной поддерева,
// авто-масштаб, плавные переходы. Новые узлы появляются сразу на орбитах.
// ───────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {"none"|"adjacent"|"all-siblings"} LinkMode
 *  - "none"        — не рисовать связи
 *  - "adjacent"    — соединять соседних по индексу
 *  - "all-siblings"— соединять каждую пару
 */

/**
 * @typedef {"uniform"|"golden"} AngleDistribution
 *  - "uniform" — равномерно по индексу
 *  - "golden"  — «золотой угол» для лучшего заполнения круга
 */

/**
 * @typedef {Object} ParticlesConfig
 * @property {boolean} debug               Включить console-логи
 * @property {number}  viewMargin          Доля от половины min(side) для сцены (0..1)
 * @property {number}  leafBandWidth       Полная ширина «полосы» для листа (узел без детей)
 * @property {number}  firstBandOffset     Отступ от родителя до ВНУТРЕННЕЙ кромки первой орбиты
 * @property {number}  interBandGap        Зазор между соседними орбитами детей
 * @property {number}  minScale            Нижний предел масштаба
 * @property {number}  maxScale            Верхний предел масштаба
 * @property {number}  lerpPos             Интерполяция позиции (0..1) при перестройках
 * @property {number}  lerpRadius          Интерполяция радиуса орбиты (0..1) при перестройках
 * @property {number}  angleSpeedBase      Базовая угловая скорость (рад/кадр)
 * @property {number}  angleDepthAttenuation  Затухание скорости по глубине: base/(d+1)^a
 * @property {AngleDistribution} angleDistribution Стартовое распределение углов
 * @property {boolean} drawOrbits          Рисовать орбиты
 * @property {number[]} orbitDash          Штрих-паттерн орбит (напр. [8,10])
 * @property {number}  orbitAlpha          Прозрачность линий орбит (0..1)
 * @property {LinkMode} linkMode           Режим связей между детьми
 * @property {number[]} linkDash           Штрих-паттерн связей
 * @property {number}  linkMaxDist         Максимальная длина связи
 * @property {number}  linkBaseAlpha       Базовая непрозрачность связи
 * @property {number}  particleRingThickness Толщина «энергетических колец»
 * @property {number}  coreSize            Размер ядра
 * @property {number}  nodeSizeBase        База размера обычной точки
 * @property {number}  nodeSizePerDepth    Надбавка к размеру на уровень глубины
 */

/** @type {ParticlesConfig} */
const CONFIG = {
  debug: false,

  viewMargin: 0.9,

  // геометрия упаковки
  leafBandWidth: 18,
  firstBandOffset: 44,
  interBandGap: 22,

  // масштаб
  minScale: 0.2,
  maxScale: 1,

  // плавность/углы
  lerpPos: 0.12,
  lerpRadius: 0.18,
  angleSpeedBase: 0.12,
  angleDepthAttenuation: 1,
  angleDistribution: "uniform",

  // орбиты/связи
  drawOrbits: true,
  orbitDash: [8, 10],
  orbitAlpha: 0.22,

  linkMode: "adjacent",
  linkDash: [5, 5],
  linkMaxDist: 180,
  linkBaseAlpha: 0.4,

  // частицы
  particleRingThickness: 2,
  coreSize: 10,
  nodeSizeBase: 5,
  nodeSizePerDepth: 2,
}

/** лог с учётом CONFIG.debug */
/** @param {...any} a */
function dlog(...a) {
  if (CONFIG.debug) console.log(...a)
}

/**
 * @typedef {Object} Particle
 * @property {number} x                    // текущая позиция для рендера
 * @property {number} y
 * @property {number} tx                   // целевая позиция (пересчёт)
 * @property {number} ty
 * @property {number} orbitRadius          // сглаженный локальный радиус (до центра полосы)
 * @property {number} targetOrbitRadius    // целевой локальный радиус (центр полосы)
 * @property {number} bandHalf             // половина ширины «полосы»
 * @property {number} angle                // угол относительно родителя
 * @property {number} speed                // угловая скорость
 * @property {number} depth                // глубина (root=0)
 * @property {boolean} isCore
 * @property {string|null} parentPath
 */

class ParticlesWorker {
  /**
   * @param {OffscreenCanvas} canvas
   * @param {number} width
   * @param {number} height
   */
  constructor(canvas, width, height) {
    this.canvas = canvas
    /** @type {OffscreenCanvasRenderingContext2D} */
    this.ctx = /** @type any */ (canvas.getContext("2d"))
    if (!this.ctx) throw new Error("2D context failed")

    /** @type {Map<string, Particle>} */ this.particles = new Map()
    /** @type {Map<string, string[]>} */ this.childrenOf = new Map()
    /** @type {Set<string>} */ this.justAdded = new Set() // ← новые пути для моментальной расстановки

    this.isRunning = false
    this.screenWidth = width
    this.screenHeight = height
    this.broadcastChannel = null

    this.globalScale = 1
    this.center = { x: width / 2, y: height / 2 }

    this.setupCanvas()
    this.setupBroadcastChannel()
    this.startAnimation()
  }

  /** @type {OffscreenCanvas|undefined} */ canvas
  /** @type {OffscreenCanvasRenderingContext2D|undefined} */ ctx
  /** @type {Map<string, Particle>} */ particles
  /** @type {Map<string, string[]>} */ childrenOf
  /** @type {Set<string>} */ justAdded
  /** @type {boolean} */ isRunning
  /** @type {number} */ screenWidth
  /** @type {number} */ screenHeight
  /** @type {BroadcastChannel|null} */ broadcastChannel
  /** @type {number} */ globalScale
  /** @type {{x:number,y:number}} */ center

  setupCanvas() {
    if (!this.canvas) return
    this.canvas.width = this.screenWidth
    this.canvas.height = this.screenHeight
    this.center.x = this.canvas.width / 2
    this.center.y = this.canvas.height / 2
  }

  setupBroadcastChannel() {
    this.broadcastChannel = new BroadcastChannel("actor-force")
    this.broadcastChannel.onmessage = (event) => {
      const { data } = event
      if (!Object.hasOwn(data, "meta")) return
      const { path } = data
      if (!path.startsWith("0")) return
      for (const patch of data.patches) {
        if (patch.path === "/" && patch.op === "add") this.addParticle(path)
        else if (patch.path === "/" && patch.op === "remove") this.removeParticle(path)
      }
    }
  }

  /** @param {string} path */
  addParticle(path) {
    if (!this.canvas) return
    const parentPath = this.getParent(path)
    const depth = path === "0" ? 0 : path.split("/").length - 1

    const existed = this.particles.get(path)
    if (!existed) {
      const angle = this.initialAngleFor(path)
      /** @type {Particle} */
      const p = {
        x: this.center.x,
        y: this.center.y,
        tx: this.center.x,
        ty: this.center.y,
        orbitRadius: 0,
        targetOrbitRadius: 0,
        bandHalf: 0,
        angle,
        speed: this.speedForDepth(depth),
        depth,
        isCore: path === "0",
        parentPath,
      }
      this.particles.set(path, p)
      this.justAdded.add(path) // ← помечаем для моментальной расстановки
    } else {
      existed.depth = depth
      existed.parentPath = parentPath
      existed.speed = this.speedForDepth(depth)
    }

    this.rebuildTree()
    this.recomputeTargets()
    this.snapNewlyAdded() // ← сразу ставим все новые точки на их орбиты
    if (!this.isRunning) this.startAnimation()
  }

  /** @param {string} path */
  removeParticle(path) {
    this.particles.delete(path)
    this.justAdded.delete(path)
    this.rebuildTree()
    this.recomputeTargets()
    if (this.particles.size === 0 && this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      if (this.isRunning) this.stopAnimation()
    }
  }

  rebuildTree() {
    this.childrenOf.clear()
    this.childrenOf.set("0", [])
    for (const [path] of this.particles) if (!this.childrenOf.has(path)) this.childrenOf.set(path, [])

    for (const [path, p] of this.particles) {
      if (path === "0") continue
      const parent = p.parentPath ?? "0"
      if (!this.childrenOf.has(parent)) this.childrenOf.set(parent, [])
      this.childrenOf.get(parent)?.push(path)
    }

    for (const [, arr] of this.childrenOf) {
      arr.sort((a, b) => {
        const as = a.split("/").map(Number),
          bs = b.split("/").map(Number)
        const n = Math.min(as.length, bs.length)
        for (let i = 0; i < n; i++) {
          if (as[i] !== bs[i]) return (as[i] || 0) - (bs[i] || 0)
        }
        return as.length - bs.length
      })
    }
  }

  /** целевые локальные радиусы и глобальный масштаб */
  recomputeTargets() {
    for (const [, p] of this.particles) {
      p.targetOrbitRadius = 0
      p.bandHalf = 0
    }

    /** @param {string} parentPath */
    const packLocal = (parentPath) => {
      const kids = this.childrenOf.get(parentPath) || []
      if (kids.length === 0) return CONFIG.leafBandWidth

      let offset = CONFIG.firstBandOffset
      for (const k of kids) {
        const bandWidth = packLocal(k)
        const child = this.particles.get(k)
        if (!child) continue
        child.targetOrbitRadius = offset + bandWidth / 2
        child.bandHalf = bandWidth / 2
        offset += bandWidth + CONFIG.interBandGap
      }
      return offset
    }
    packLocal("0")

    // оценка максимального разлёта от корня
    let maxExtent = 0
    /** @param {string} parentPath @param {number} accum */
    const dfs = (parentPath, accum) => {
      const kids = this.childrenOf.get(parentPath) || []
      for (const k of kids) {
        const ch = this.particles.get(k)
        if (!ch) continue
        const local = ch.targetOrbitRadius + ch.bandHalf
        const next = accum + local
        if (next > maxExtent) maxExtent = next
        dfs(k, next)
      }
    }
    dfs("0", 0)

    const allowed = Math.min(this.screenWidth, this.screenHeight) * 0.5 * CONFIG.viewMargin
    const scale = allowed / Math.max(1, maxExtent)
    this.globalScale = Math.max(CONFIG.minScale, Math.min(CONFIG.maxScale, scale))
  }

  /** Моментальная расстановка только что добавленных узлов на их орбиты */
  snapNewlyAdded() {
    if (this.justAdded.size === 0) return

    // 1) сначала выставим целевые центры для ВСЕХ (tx,ty) из targetOrbitRadius — сверху вниз
    /** @param {string} parentPath */
    const placeUsingTargets = (parentPath) => {
      const parent = this.particles.get(parentPath)
      if (!parent) return
      const px = parentPath === "0" ? this.center.x : parent.tx
      const py = parentPath === "0" ? this.center.y : parent.ty
      const kids = this.childrenOf.get(parentPath) || []
      for (const k of kids) {
        const ch = this.particles.get(k)
        if (!ch) continue
        const R = ch.targetOrbitRadius * this.globalScale
        ch.tx = px + Math.cos(ch.angle) * R
        ch.ty = py + Math.sin(ch.angle) * R
        placeUsingTargets(k)
      }
    }

    // корень: целевой центр — геометрический центр
    const root = this.particles.get("0")
    if (root) {
      root.tx = this.center.x
      root.ty = this.center.y
    }
    placeUsingTargets("0")

    // 2) для только что добавленных — мгновенно приравниваем текущие к целевым
    for (const path of this.justAdded) {
      const p = this.particles.get(path)
      if (!p) continue
      p.orbitRadius = p.targetOrbitRadius
      p.x = p.tx
      p.y = p.ty
    }
    this.justAdded.clear()
  }

  /** один кадр */
  paint() {
    if (!this.ctx || !this.canvas) return
    const t = Date.now() * 0.001

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (!this.particles.has("0")) return

    // углы
    for (const [, p] of this.particles) if (!p.isCore) p.angle += p.speed

    // раскладка вокруг целевых центров родителей
    /** @param {string} parentPath */
    const placeAroundTarget = (parentPath) => {
      const parent = this.particles.get(parentPath)
      if (!parent) return
      const px = parent.tx,
        py = parent.ty
      const kids = this.childrenOf.get(parentPath) || []
      for (const k of kids) {
        const ch = this.particles.get(k)
        if (!ch) continue
        ch.orbitRadius += (ch.targetOrbitRadius - ch.orbitRadius) * CONFIG.lerpRadius
        const R = ch.orbitRadius * this.globalScale
        ch.tx = px + Math.cos(ch.angle) * R
        ch.ty = py + Math.sin(ch.angle) * R
        placeAroundTarget(k)
      }
    }

    const root = this.particles.get("0")
    if (root) {
      root.tx = this.center.x
      root.ty = this.center.y
    }
    placeAroundTarget("0")

    // интерполяция к целям (для существующих узлов при перестройках)
    for (const [, p] of this.particles) {
      p.x += (p.tx - p.x) * CONFIG.lerpPos
      p.y += (p.ty - p.y) * CONFIG.lerpPos
    }

    if (CONFIG.drawOrbits) this.drawAllOrbits()
    this.drawLinks()
    this.drawParticles(t)
  }

  /** орбиты — радиус из фактической геометрии (центр-к-центру) */
  drawAllOrbits() {
    if (!this.ctx) return
    const ctx = this.ctx
    ctx.lineWidth = 1

    for (const [parent, kids] of this.childrenOf) {
      if (kids.length === 0) continue
      const par = this.particles.get(parent)
      if (!par) continue
      const px = par.x,
        py = par.y

      ctx.setLineDash(CONFIG.orbitDash)
      ctx.strokeStyle = `hsla(200,50%,60%,${CONFIG.orbitAlpha})`

      for (const k of kids) {
        const ch = this.particles.get(k)
        if (!ch) continue
        const R = Math.hypot(ch.x - px, ch.y - py)
        ctx.beginPath()
        ctx.arc(px, py, Math.max(1, R), 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.setLineDash([])
    }
  }

  drawLinks() {
    if (!this.ctx) return
    if (CONFIG.linkMode === "none") return
    const ctx = this.ctx

    for (const [, kids] of this.childrenOf) {
      if (kids.length < 2) continue

      /** @type {[Particle,Particle][]} */
      const pairs = []
      if (CONFIG.linkMode === "adjacent") {
        for (let i = 0; i < kids.length; i++) {
          const kidA = kids[i]
          const kidB = kids[(i + 1) % kids.length]
          if (!kidA || !kidB) continue
          const a = this.particles.get(kidA),
            b = this.particles.get(kidB)
          if (a && b) pairs.push([a, b])
        }
      } else {
        for (let i = 0; i < kids.length; i++)
          for (let j = i + 1; j < kids.length; j++) {
            const kidA = kids[i]
            const kidB = kids[j]
            if (!kidA || !kidB) continue
            const a = this.particles.get(kidA),
              b = this.particles.get(kidB)
            if (a && b) pairs.push([a, b])
          }
      }

      for (const [a, b] of pairs) {
        const dx = a.x - b.x,
          dy = a.y - b.y
        const dist = Math.hypot(dx, dy)
        if (dist > CONFIG.linkMaxDist) continue
        const alpha = CONFIG.linkBaseAlpha * (1 - dist / CONFIG.linkMaxDist)
        ctx.strokeStyle = `hsla(210,80%,70%,${alpha})`
        ctx.lineWidth = 1
        ctx.setLineDash(CONFIG.linkDash)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }

  /** @param {number} time */
  drawParticles(time) {
    if (!this.ctx) return
    const ctx = this.ctx
    for (const [path, p] of this.particles) {
      const hue = 200 + ((path.charCodeAt(0) * 20) % 40)
      const base = p.isCore ? CONFIG.coreSize : CONFIG.nodeSizeBase + p.depth * CONFIG.nodeSizePerDepth
      const pulse = Math.sin(time * 2 + path.charCodeAt(0)) * 0.3 + 0.7
      const sz = Math.max(1, base * pulse)

      const g1 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 3)
      g1.addColorStop(0, `hsla(${hue},100%,80%,0.9)`)
      g1.addColorStop(0.35, `hsla(${hue},80%,60%,0.55)`)
      g1.addColorStop(0.8, `hsla(${hue},50%,40%,0.18)`)
      g1.addColorStop(1, `hsla(${hue},40%,20%,0)`)
      ctx.fillStyle = g1
      ctx.beginPath()
      ctx.arc(p.x, p.y, sz * 3, 0, Math.PI * 2)
      ctx.fill()

      const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz)
      g2.addColorStop(0, `hsl(${hue},100%,95%)`)
      g2.addColorStop(0.55, `hsl(${hue},90%,70%)`)
      g2.addColorStop(1, `hsl(${hue},80%,50%)`)
      ctx.fillStyle = g2
      ctx.beginPath()
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2)
      ctx.fill()

      for (let i = 1; i <= 3; i++) {
        const rt = time * (1 + i * 0.5)
        const rr = Math.max(1, sz * (1.5 + i * 0.8) + Math.sin(rt) * 5)
        const ra = ((0.3 - i * 0.08) * (Math.sin(rt) + 1)) / 2
        ctx.strokeStyle = `hsla(${hue},70%,60%,${Math.max(0, ra)})`
        ctx.lineWidth = CONFIG.particleRingThickness
        ctx.beginPath()
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  startAnimation() {
    dlog("🎬 start")
    this.isRunning = true
    const tick = () => {
      if (!this.isRunning) return
      this.paint()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  stopAnimation() {
    dlog("⏹ stop")
    this.isRunning = false
  }

  destroy() {
    dlog("💥 destroy")
    this.stopAnimation()
    this.particles.clear()
    this.childrenOf.clear()
    this.justAdded.clear()
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }
    this.canvas = undefined
    this.ctx = undefined
  }

  /** @param {string} path */
  getParent(path) {
    if (path === "0") return null
    const i = path.lastIndexOf("/")
    return i === -1 ? "0" : path.slice(0, i)
  }

  /** @param {number} depth */
  speedForDepth(depth) {
    return CONFIG.angleSpeedBase / Math.pow(depth + 1, Math.max(0, CONFIG.angleDepthAttenuation))
  }

  /** @param {string} path */
  initialAngleFor(path) {
    const parent = this.getParent(path)
    const kids = parent ? this.childrenOf.get(parent) || [] : []
    const idx = kids.length
    if (CONFIG.angleDistribution === "golden") {
      const golden = Math.PI * (3 - Math.sqrt(5))
      return (idx * golden) % (Math.PI * 2)
    }
    const n = Math.max(1, idx + 1)
    return (idx / n) * Math.PI * 2
  }
}

/** @type {ParticlesWorker|null} */
let particlesWorker = null

// ───────────────────────────────────────────────────────────────────────────────
// Сообщения из main-потока
// ───────────────────────────────────────────────────────────────────────────────
self.onmessage = function (e) {
  const { type, canvas, width, height, visible } = e.data

  if (type === "init") {
    particlesWorker = new ParticlesWorker(canvas, width, height)
    self.postMessage({ type: "worker-ready" })
  } else if (type === "destroy") {
    if (particlesWorker) {
      particlesWorker.destroy()
      particlesWorker = null
    }
  } else if (type === "visibility-change") {
    if (!particlesWorker) return
    if (!visible) particlesWorker.isRunning = false
    else particlesWorker.startAnimation()
  } else if (type === "resize") {
    if (!particlesWorker || !particlesWorker.canvas || !particlesWorker.ctx) return
    const w = width,
      h = height
    particlesWorker.ctx.clearRect(0, 0, particlesWorker.canvas.width, particlesWorker.canvas.height)
    particlesWorker.canvas.width = w
    particlesWorker.canvas.height = h
    particlesWorker.screenWidth = w
    particlesWorker.screenHeight = h
    particlesWorker.center.x = w / 2
    particlesWorker.center.y = h / 2
    particlesWorker.recomputeTargets()
    // при ресайзе новые узлы не добавляются, снап не нужен
    particlesWorker.paint()
  } else if (type === "add") {
    if (particlesWorker) particlesWorker.addParticle(e.data.path)
  } else if (type === "remove") {
    if (particlesWorker) particlesWorker.removeParticle(e.data.path)
  }
}
