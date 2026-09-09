/**
Базовый HUD одного Space и Document. Browser проецирует его содержимое
относительно камеры в общем цикле кадров и ввода приложения.

@packageDocumentation
*/
import type {Document} from "../src/document.ts"
import {SpatialElement} from "../space/spatial-element.ts"

/**
Корень интерфейса, следующего за камерой. Не создаёт отдельный Canvas или Renderer.

@property distance - Расстояние до плоскости HUD в миллиметрах, по умолчанию `1000`.
Свойство отражается в одноимённом атрибуте. Запись нечислового или бесконечного
значения вызывает `TypeError`; для подключения проекции требуется расстояние больше нуля.
*/
export class HUDElement extends SpatialElement {
  override get spaceChildKind(): "hud" {
    return "hud"
  }

  constructor(ownerDocument: Document) {
    super(ownerDocument, "hud")
  }

  get distance(): number {
    const value = this.getAttribute("distance")
    if (value === null) return 1000
    const distance = Number(value)
    return Number.isFinite(distance) ? distance : 1000
  }

  set distance(value: number) {
    if (!Number.isFinite(value)) throw new TypeError("HUD distance must be finite")
    this.setAttribute("distance", String(value))
  }
}
