import {ImageMaterial, Matrix4, Mesh, TexturedPlaneGeometry} from "@zavx0z/engine"
import type {RenderViewport} from "@zavx0z/renderer"
import {RendererWebGpuDocumentPlane, type RendererWebGpuDocumentPlaneOptions} from "./document-plane.ts"

/** Internal texture source, resolved by the owning Renderer without a URL or image loader. */
export class DisplayRasterMaterial extends ImageMaterial {
  constructor() { super({src: "", fit: "cover"}) }
}

/**
Физический дисплей с прямым рисованием существующего графа содержимого.
Поверхность для текстуры создаётся только при выборе растрового режима.
Номинальная матрица сохраняется независимо от наличия GPU-текстуры.
*/
export class RendererWebGpuDisplayPlane extends RendererWebGpuDocumentPlane {
  #surface: Mesh | null = null
  #rasterSize: RenderViewport

  constructor(options: RendererWebGpuDocumentPlaneOptions & {rasterSize: RenderViewport}) {
    super(options)
    this.#rasterSize = validateRasterSize(options.rasterSize)
  }

  get rasterSurface(): Mesh | null { return this.#surface }
  get surface(): Mesh {
    if (this.#surface === null) {
      this.#surface = new Mesh(new TexturedPlaneGeometry(), new DisplayRasterMaterial())
      this.#surface.frustumCulled = false
      this.#surface.name = "display-pixel-matrix"
      this.add(this.#surface)
      this.syncSurface()
    }
    return this.#surface
  }
  get rasterMaterial(): DisplayRasterMaterial { return this.surface.material as DisplayRasterMaterial }
  get rasterSize(): RenderViewport { return this.#rasterSize }
  setRasterSize(value: RenderViewport): void { this.#rasterSize = validateRasterSize(value) }

  override configure(viewport: RenderViewport, units: number, unitsY: number = units): void {
    super.configure(viewport, units, unitsY)
    this.syncSurface()
  }

  /** Derived orthographic raster projection of this plane, not an independently owned camera. */
  rasterProjection(): Matrix4 {
    const width = this.viewport.width * this.worldUnitsPerPixel
    const height = this.viewport.height * this.worldUnitsPerPixelY
    const inverse = new Matrix4().copy(this.matrixWorld).invert()
    return new Matrix4().set(
      2 / width, 0, 0, 0,
      0, 2 / height, 0, 0,
      0, 0, -1 / 2000000, 0.5,
      0, 0, 0, 1,
    ).multiply(inverse)
  }

  private syncSurface(): void {
    const surface = this.#surface
    if (surface === null) return
    const width = this.viewport.width * this.worldUnitsPerPixel
    const height = this.viewport.height * this.worldUnitsPerPixelY
    surface.scale.set(width, height, 1)
    const material = surface.material as DisplayRasterMaterial
    material.boxAspect = width / height
    surface.updateMatrix()
  }
}

function validateRasterSize(value: RenderViewport): RenderViewport {
  if (![value.width, value.height].every(v => Number.isSafeInteger(v) && v > 0)) {
    throw new RangeError("Display raster dimensions must be positive integers")
  }
  return Object.freeze({...value})
}
