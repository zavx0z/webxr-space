// Воркер для отрисовки частиц - весь код в одном файле

class ParticlesWorker {
  /**
   * @param {OffscreenCanvas} canvas
   * @param {number} width
   * @param {number} height
   */
  constructor(canvas, width, height) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    if (!this.ctx) {
      throw new Error("Failed to get 2D context from canvas")
    }
    this.particles = new Map()
    this.isRunning = false
    this.screenWidth = width
    this.screenHeight = height

    this.setupCanvas()
    this.setupBroadcastChannel()
    this.startAnimation()
  }

  /**
   * Настройка canvas с размерами экрана
   */
  setupCanvas() {
    // Настройка canvas - используем переданные размеры экрана
    this.canvas.width = this.screenWidth
    this.canvas.height = this.screenHeight
  }

  /**
   * Настройка подписки на BroadcastChannel для получения событий акторов
   */
  setupBroadcastChannel() {
    new BroadcastChannel("actor-force").onmessage = (event) => {
      const { data } = event
      if (!Object.hasOwn(data, "meta")) return
      const { path } = data
      if (!path.startsWith("0")) return

      for (const patch of data.patches) {
        if (patch.path === "/" && patch.op === "add") {
          this.addParticle(path)
        } else if (patch.path === "/" && patch.op === "remove") {
          this.removeParticle(path)
        }
      }
    }
  }

  /**
   * Добавляет частицу по пути
   * @param {string} path - Путь актора
   */
  addParticle(path) {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2

    let particle

    if (path === "0") {
      // Ядро в центре
      particle = {
        x: centerX,
        y: centerY,
        orbitRadius: 0,
        angle: 0,
        speed: 0,
        hierarchyLevel: 0,
        isCore: true,
      }
    } else if (path.startsWith("0/")) {
      // Дети на орбитах вокруг ядра
      const childNumber = parseInt(path.split("/")[1] || "0")
      const orbitRadius = 80 + childNumber * 20 // Разные орбиты для разных детей
      const angle = (childNumber * Math.PI * 2) / 8 // Равномерное распределение

      particle = {
        x: centerX + Math.cos(angle) * orbitRadius,
        y: centerY + Math.sin(angle) * orbitRadius,
        orbitRadius: orbitRadius,
        angle: angle,
        speed: 0.3 + Math.random() * 0.4, // Скорость вращения
        hierarchyLevel: 1,
        isCore: false,
      }
    } else {
      // Другие частицы - случайное размещение
      particle = {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        orbitRadius: 0,
        angle: 0,
        speed: 0,
        hierarchyLevel: 0,
        isCore: false,
      }
    }

    this.particles.set(path, particle)
  }

  /**
   * Удаляет частицу по пути
   * @param {string} path - Путь актора
   */
  removeParticle(path) {
    this.particles.delete(path)
  }

  /**
   * Отрисовка всех частиц на canvas
   */
  paint() {
    // Очищаем canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Проверяем наличие частиц
    if (this.particles.size === 0) {
      return
    }

    // Рисуем частицы
    this.particles.forEach((particle, path) => {
      // Голубое свечение для всех частиц
      const hue = 200 + ((path.charCodeAt(0) * 20) % 40) // Голубой спектр 200-240
      this.ctx.fillStyle = `hsl(${hue}, 70%, 60%)`

      // Размер частицы зависит от типа
      const size = particle.isCore ? 12 : 5 + particle.hierarchyLevel * 3

      // Орбитальное движение
      const centerX = this.canvas.width / 2
      const centerY = this.canvas.height / 2

      if (particle.isCore) {
        // Ядро остается в центре
        particle.x = centerX
        particle.y = centerY
      } else if (particle.orbitRadius > 0) {
        // Дети вращаются вокруг ядра
        particle.angle += particle.speed * 0.01
        particle.x = centerX + Math.cos(particle.angle) * particle.orbitRadius
        particle.y = centerY + Math.sin(particle.angle) * particle.orbitRadius
      }

      // Пульсация для футуристичного эффекта
      const time = Date.now() * 0.001
      const pulse = Math.sin(time * 2 + path.charCodeAt(0)) * 0.3 + 0.7
      const animatedSize = Math.max(1, size * pulse)

      // Создаем радиальный градиент для свечения
      const gradient = this.ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        animatedSize * 3
      )
      gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, 0.9)`)
      gradient.addColorStop(0.3, `hsla(${hue}, 80%, 60%, 0.6)`)
      gradient.addColorStop(0.7, `hsla(${hue}, 60%, 40%, 0.3)`)
      gradient.addColorStop(1, `hsla(${hue}, 40%, 20%, 0)`)

      // Внешнее свечение
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, animatedSize * 3, 0, Math.PI * 2)
      this.ctx.fill()

      // Внутреннее ядро частицы
      const coreGradient = this.ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        animatedSize
      )
      coreGradient.addColorStop(0, `hsl(${hue}, 100%, 95%)`)
      coreGradient.addColorStop(0.5, `hsl(${hue}, 90%, 70%)`)
      coreGradient.addColorStop(1, `hsl(${hue}, 80%, 50%)`)

      this.ctx.fillStyle = coreGradient
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, animatedSize, 0, Math.PI * 2)
      this.ctx.fill()

      // Добавляем энергетические кольца
      for (let i = 1; i <= 3; i++) {
        const ringTime = time * (1 + i * 0.5)
        const ringRadius = Math.max(1, animatedSize * (1.5 + i * 0.8) + Math.sin(ringTime) * 5)
        const ringAlpha = ((0.3 - i * 0.08) * (Math.sin(ringTime) + 1)) / 2

        this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${ringAlpha})`
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, ringRadius, 0, Math.PI * 2)
        this.ctx.stroke()
      }
    })

    // Рисуем орбиты детей
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2
    const uniqueOrbits = new Set()

    this.particles.forEach((particle) => {
      if (!particle.isCore && particle.orbitRadius > 0) {
        uniqueOrbits.add(particle.orbitRadius)
      }
    })

    uniqueOrbits.forEach((orbitRadius) => {
      this.ctx.strokeStyle = `hsla(200, 50%, 60%, 0.3)`
      this.ctx.lineWidth = 1
      this.ctx.setLineDash([10, 10])
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2)
      this.ctx.stroke()
      this.ctx.setLineDash([])
    })

    // Рисуем энергетические связи между частицами на одной орбите
    const particlesArray = Array.from(this.particles.entries())
    for (let i = 0; i < particlesArray.length; i++) {
      for (let j = i + 1; j < particlesArray.length; j++) {
        const [path1, particle1] = /**@type{[any, any]} */ (particlesArray[i])
        const [path2, particle2] = /**@type{[any, any]} */ (particlesArray[j])

        // Связываем только частицы на одной орбите
        if (Math.abs(particle1.orbitRadius - particle2.orbitRadius) < 10) {
          const distance = Math.sqrt(Math.pow(particle1.x - particle2.x, 2) + Math.pow(particle1.y - particle2.y, 2))

          // Рисуем связь только если частицы близко
          if (distance < 100) {
            const alpha = (1 - distance / 100) * 0.4
            const time = Date.now() * 0.001

            // Пульсирующая связь
            const pulse = Math.sin(time * 3 + path1.charCodeAt(0)) * 0.2 + 0.8

            this.ctx.strokeStyle = `hsla(210, 80%, 70%, ${alpha * pulse})`
            this.ctx.lineWidth = 1
            this.ctx.setLineDash([5, 5])
            this.ctx.beginPath()
            this.ctx.moveTo(particle1.x, particle1.y)
            this.ctx.lineTo(particle2.x, particle2.y)
            this.ctx.stroke()
            this.ctx.setLineDash([])
          }
        }
      }
    }
  }

  /**
   * Запуск анимационного цикла
   */
  startAnimation() {
    this.isRunning = true

    const animate = () => {
      if (this.isRunning) {
        this.paint()
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  /**
   * Остановка анимационного цикла
   */
  stopAnimation() {
    this.isRunning = false
  }

  /**
   * Уничтожение воркера и очистка ресурсов
   */
  destroy() {
    this.stopAnimation()
    this.particles.clear()
  }
}
/** @type {ParticlesWorker | null} */
let particlesWorker = null

/**
 * Обработчик сообщений от основного потока
 * @param {MessageEvent} e - Событие сообщения
 */
self.onmessage = function (e) {
  const { type, canvas, width, height } = e.data

  if (type === "init") {
    // Инициализируем воркер с переданным canvas и размерами
    particlesWorker = new ParticlesWorker(canvas, width, height)

    // Отправляем сообщение о готовности воркера
    self.postMessage({ type: "worker-ready" })
  } else if (type === "destroy") {
    // Очищаем ресурсы
    if (particlesWorker) {
      particlesWorker.destroy()
    }
  }
}
