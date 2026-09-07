import {PlaneGeometry} from "@zavx0z/engine"

type RetainedPlane = {
  key: string
  geometry: PlaneGeometry
  references: number
}

/** Shares immutable scalar rectangle planes for the lifetime of their retained owners. */
export class RetainedPlaneGeometryPool {
  readonly #planes = new Map<string, RetainedPlane>()
  readonly #owners = new WeakMap<PlaneGeometry, RetainedPlane>()

  acquire(width: number, height: number): PlaneGeometry {
    const key = `${width}:${height}`
    let plane = this.#planes.get(key)
    if (plane === undefined) {
      plane = {key, geometry: new PlaneGeometry({width, height}), references: 0}
      this.#planes.set(key, plane)
      this.#owners.set(plane.geometry, plane)
    }
    plane.references += 1
    return plane.geometry
  }

  /** Returns true when the final owner releases the plane and its GPU buffers. */
  release(geometry: PlaneGeometry): boolean {
    const plane = this.#owners.get(geometry)
    if (plane === undefined) throw new Error("Scalar rectangle plane is not retained by this backend")
    plane.references -= 1
    if (plane.references > 0) return false
    this.#planes.delete(plane.key)
    this.#owners.delete(geometry)
    return true
  }
}
