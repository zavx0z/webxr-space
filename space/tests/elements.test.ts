import {describe, expect, test} from "bun:test"
import {Event, createDocument} from "@zavx0z/dom"
import {
  Object3D,
  SphereGeometry,
  ThinFilmMaterial,
} from "@zavx0z/engine"
import {
  XRAnimationElement,
  XRAssetElement,
  XRDisplayElement,
  XRGeometryElement,
  XRGroupElement,
  XRHUDElement,
  XRLightElement,
  XRLineElement,
  XRLineSegmentsElement,
  XRMaterialElement,
  XRMeshElement,
  XRObjectElement,
  XRSpaceElement,
  XRTextElement,
  XRViewPointElement,
  createSpaceElementFactories,
  readSpaceTree,
} from "../src/index.ts"

const createSpaceDocument = () => createDocument({
  elementFactories: createSpaceElementFactories(),
})

describe("Пространственные элементы одного Document", () => {
  test("[SPC-001] создаёт точные пространственные типы в одном Document", () => {
    const document = createSpaceDocument()
    const space = document.createElement("xr-space")
    const viewPoint = document.createElement("xr-view-point")
    const mesh = document.createElement("xr-mesh")
    const group = document.createElement("xr-group")
    const line = document.createElement("xr-line")
    const lineSegments = document.createElement("xr-line-segments")
    const spatialText = document.createElement("xr-text")
    const light = document.createElement("xr-light")
    const animation = document.createElement("xr-animation")
    const asset = document.createElement("xr-asset")
    const geometry = document.createElement("xr-geometry")
    const material = document.createElement("xr-material")
    const display = document.createElement("xr-display")
    const hud = document.createElement("xr-hud")

    expect(space).toBeInstanceOf(XRSpaceElement)
    expect((space as XRSpaceElement).background).toBe("#000000")
    ;(space as XRSpaceElement).background = "#123456"
    expect((space as XRSpaceElement).background).toBe("#123456")
    expect(viewPoint).toBeInstanceOf(XRViewPointElement)
    expect(mesh).toBeInstanceOf(XRMeshElement)
    expect(group).toBeInstanceOf(XRGroupElement)
    expect(line).toBeInstanceOf(XRLineElement)
    expect(lineSegments).toBeInstanceOf(XRLineSegmentsElement)
    expect(spatialText).toBeInstanceOf(XRTextElement)
    expect(light).toBeInstanceOf(XRLightElement)
    expect(animation).toBeInstanceOf(XRAnimationElement)
    expect(asset).toBeInstanceOf(XRAssetElement)
    expect(geometry).toBeInstanceOf(XRGeometryElement)
    expect(material).toBeInstanceOf(XRMaterialElement)
    expect(display).toBeInstanceOf(XRDisplayElement)
    expect(hud).toBeInstanceOf(XRHUDElement)
    for (const element of [
      space,
      viewPoint,
      group,
      mesh,
      line,
      lineSegments,
      spatialText,
      light,
      animation,
      asset,
      geometry,
      material,
      display,
      hud,
    ]) {
      expect(element.ownerDocument).toBe(document)
    }
  })

  test("[SPC-006] Object владеет полным transform, а resource leaves — typed factories", () => {
    const document = createSpaceDocument()
    const group = document.createElement("xr-group") as XRGroupElement
    const geometry = document.createElement("xr-geometry") as XRGeometryElement
    const material = document.createElement("xr-material") as XRMaterialElement
    const geometryFactory = () => new SphereGeometry({radius: 4})
    const materialFactory = () => new ThinFilmMaterial()
    group.x = 1
    group.y = 2
    group.z = 3
    group.quaternionX = 0.1
    group.quaternionY = 0.2
    group.quaternionZ = 0.3
    group.quaternionW = 0.9
    group.scaleX = 2
    group.scaleY = 3
    group.scaleZ = 4
    group.visible = false
    group.name = "owner"
    group.factory = () => new Object3D()
    geometry.factory = geometryFactory
    material.factory = materialFactory

    expect(group).toBeInstanceOf(XRObjectElement)
    expect(group).toMatchObject({
      x: 1,
      y: 2,
      z: 3,
      quaternionX: 0.1,
      quaternionY: 0.2,
      quaternionZ: 0.3,
      quaternionW: 0.9,
      scaleX: 2,
      scaleY: 3,
      scaleZ: 4,
      visible: false,
      name: "owner",
    })
    expect(geometry.factory).toBe(geometryFactory)
    expect(material.factory).toBe(materialFactory)
  })

  test("[SPC-003] Mesh принимает одну Geometry, один Material и вложенные Mesh", () => {
    const document = createSpaceDocument()
    const mesh = document.createElement("xr-mesh") as XRMeshElement
    const geometry = document.createElement("xr-geometry") as XRGeometryElement
    const material = document.createElement("xr-material") as XRMaterialElement
    const nested = document.createElement("xr-mesh") as XRMeshElement

    mesh.append(geometry, material, nested)
    expect(mesh.geometry).toBe(geometry)
    expect(mesh.material).toBe(material)
    expect(() => mesh.append(document.createElement("xr-geometry"))).toThrow(
      "at most one Geometry",
    )
    expect(mesh.geometry).toBe(geometry)
  })

  test("[SPC-004] читает один Space с ViewPoint, Display и HUD", () => {
    const document = createSpaceDocument()
    const space = document.createElement("xr-space") as XRSpaceElement
    const viewPoint = document.createElement("xr-view-point") as XRViewPointElement
    const display = document.createElement("xr-display") as XRDisplayElement
    const hud = document.createElement("xr-hud") as XRHUDElement
    display.id = "main"
    display.viewportWidth = 960
    display.viewportHeight = 680
    display.worldUnitsPerPixel = 0.5
    hud.id = "hud"
    space.append(viewPoint, display, hud)
    document.append(space)

    const tree = readSpaceTree(document)
    expect(tree.space).toBe(space)
    expect(tree.viewPoint).toBe(viewPoint)
    expect(tree.displays[0]).toMatchObject({
      id: "main",
      viewport: {width: 960, height: 680},
      worldUnitsPerPixel: 0.5,
    })
    expect(tree.hud).toMatchObject({id: "hud"})
  })

  test("[SPC-007] duplicate Display id отклоняется до runtime projection", () => {
    const document = createSpaceDocument()
    const space = document.createElement("xr-space") as XRSpaceElement
    const viewPoint = document.createElement("xr-view-point") as XRViewPointElement
    const first = document.createElement("xr-display") as XRDisplayElement
    const second = document.createElement("xr-display") as XRDisplayElement
    first.id = "duplicate"
    second.id = "duplicate"
    space.append(viewPoint, first, second)
    document.append(space)

    expect(() => readSpaceTree(document)).toThrow("Duplicate Display id: duplicate")
  })

  test("[SPC-002] отклоняет не пространственного ребёнка Space", () => {
    const document = createSpaceDocument()
    const space = document.createElement("xr-space") as XRSpaceElement
    const div = document.createElement("div")

    expect(() => space.append(div)).toThrow("only spatial elements")
    expect(space.childNodes).toHaveLength(0)
  })

  test("[SPC-004] переносит один UI Element между Display и HUD без замены", () => {
    const document = createSpaceDocument()
    const display = document.createElement("xr-display") as XRDisplayElement
    const hud = document.createElement("xr-hud") as XRHUDElement
    const button = document.createElement("button")
    let clicks = 0
    button.textContent = "Состояние"
    button.addEventListener("click", () => {
      clicks += 1
    })

    display.append(button)
    hud.append(button)
    expect(button.parentNode).toBe(hud)
    expect(button.ownerDocument).toBe(document)
    expect(button.textContent).toBe("Состояние")
    button.dispatchEvent(new Event("click"))
    expect(clicks).toBe(1)
  })
})
