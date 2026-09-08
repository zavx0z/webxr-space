import {ImageMaterial, Matrix4, Mesh, TexturedPlaneGeometry} from "@zavx0z/engine"
import type {RenderViewport} from "@zavx0z/renderer"
import {RendererWebGpuDocumentPlane, type RendererWebGpuDocumentPlaneOptions} from "./document-plane.ts"

/** Internal texture source, resolved by the owning Renderer without a URL or image loader. */
export class DisplayRasterMaterial extends ImageMaterial {
  constructor() { super({src: "", fit: "cover"}) }
}

/**
One physical display and its finite pixel matrix. The existing content graph
is rendered to a GPU attachment, then sampled on the surface. No extra semantic
Document, Canvas, Space, Renderer or ViewPoint is created.
*/
export class RendererWebGpuDisplayPlane extends RendererWebGpuDocumentPlane {
  readonly surface: Mesh
  readonly rasterMaterial = new DisplayRasterMaterial()
  #rasterSize: RenderViewport

  constructor(options: RendererWebGpuDocumentPlaneOptions & {rasterSize: RenderViewport}) {
    super(options)
    this.#rasterSize = validateRasterSize(options.rasterSize)
    this.surface = new Mesh(new TexturedPlaneGeometry(), this.rasterMaterial)
    this.surface.frustumCulled = false
    this.surface.name = "display-pixel-matrix"
    this.add(this.surface)
    this.syncSurface()
  }

  get rasterSize(): RenderViewport { return this.#rasterSize }
  setRasterSize(value: RenderViewport): void { this.#rasterSize = validateRasterSize(value) }

  override configure(viewport: RenderViewport, units: number): void {
    super.configure(viewport, units)
    this.syncSurface()
  }

  /** Derived orthographic raster projection of this plane, not an independently owned camera. */
  rasterProjection(): Matrix4 {
    const width = this.viewport.width * this.worldUnitsPerPixel
    const height = this.viewport.height * this.worldUnitsPerPixel
    const inverse = new Matrix4().copy(this.matrixWorld).invert()
    return new Matrix4().set(
      2 / width, 0, 0, 0,
      0, 2 / height, 0, 0,
      0, 0, -1 / 2000000, 0.5,
      0, 0, 0, 1,
    ).multiply(inverse)
  }

  private syncSurface(): void {
    this.surface.scale.set(this.viewport.width * this.worldUnitsPerPixel, this.viewport.height * this.worldUnitsPerPixel, 1)
    this.rasterMaterial.boxAspect = this.viewport.width / this.viewport.height
    this.surface.updateMatrix()
  }
}

function validateRasterSize(value: RenderViewport): RenderViewport {
  if (![value.width, value.height].every(v => Number.isSafeInteger(v) && v > 0)) {
    throw new RangeError("Display raster dimensions must be positive integers")
  }
  return Object.freeze({...value})
}
