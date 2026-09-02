import {expect, test} from "bun:test"
import {join} from "node:path"
import {
  createDocument,
  Event,
  HTMLButtonElement,
} from "../../dom/src/index.ts"
import {
  createSpaceElementFactories,
  readSpaceTree,
  XRDisplayElement,
  XRHUDElement,
  XRSpaceElement,
  XRViewPointElement,
} from "../../space/src/index.ts"

const root = join(import.meta.dir, "../..")

const source = async (path: string): Promise<string> =>
  Bun.file(join(root, path)).text()

const createProjectionTree = () => {
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const space = document.createElement("xr-space") as XRSpaceElement
  const viewPoint = document.createElement("xr-view-point") as XRViewPointElement
  const display = document.createElement("xr-display") as XRDisplayElement
  const hud = document.createElement("xr-hud") as XRHUDElement
  display.id = "main"
  hud.id = "hud"
  space.append(viewPoint, display, hud)
  document.appendChild(space)
  return {display, document, hud, space, viewPoint}
}

test("[EXP-001] один Experience владеет ровно одним Document", async () => {
  const experience = await source("browser/src/experience.ts")
  expect(experience.match(/createDocument\(/gu)).toHaveLength(1)
  expect(experience).toContain("elementFactories: createSpaceElementFactories()")
  expect(experience).not.toContain("options.document")
})

test("[EXP-002] один Experience владеет ровно одним Canvas", async () => {
  const index = await source("browser/src/index.ts")
  const manifest = await Bun.file(join(root, "browser/package.json")).json() as {
    exports: Record<string, string>
  }
  expect(Object.keys(manifest.exports)).toEqual(["."])
  expect(index).toContain("createExperience")
  expect(index).not.toContain("createDocumentCanvasRuntime")
})

test("[EXP-003] один Experience владеет ровно одним Space и ViewPoint", async () => {
  const experience = await source("browser/src/experience.ts")
  const runtime = await source("browser/src/space-runtime.ts")
  expect(experience).toContain("readSpaceTree(document)")
  expect(experience.match(/createRuntime\(/gu)).toHaveLength(1)
  expect(runtime.match(/const space = seams\.createSpace\(\)/gu)).toHaveLength(1)
  expect(runtime.match(/const viewPoint = seams\.createViewPoint\(/gu)).toHaveLength(1)
})

test("[EXP-004] один Experience владеет общим вводом и циклом кадров", async () => {
  const index = await source("browser/src/index.ts")
  const runtime = await source("browser/src/space-runtime.ts")
  expect(index).not.toContain("createDocumentNativeInputHost")
  expect(runtime.match(/seams\.createNativeInputHost\(/gu)).toHaveLength(1)
  expect(runtime.match(/requestAnimationFrame\(callback\)/gu)).toHaveLength(1)
})

test("[EXP-005] Display и HUD используют тот же Document и Space", () => {
  const {display, document, hud, space} = createProjectionTree()
  const tree = readSpaceTree(document)
  expect(tree.space).toBe(space)
  expect(tree.displays[0]?.element).toBe(display)
  expect(tree.hud?.element).toBe(hud)
  expect(display.ownerDocument).toBe(document)
  expect(hud.ownerDocument).toBe(document)
})

test("[EXP-006] перенос Display → HUD сохраняет Element identity", () => {
  const {display, document, hud} = createProjectionTree()
  const element = document.createElement("div")
  display.appendChild(element)
  hud.appendChild(element)

  expect(hud.firstChild).toBe(element)
  expect(element.ownerDocument).toBe(document)
  expect(display.contains(element)).toBe(false)
})

test("[EXP-007] перенос Display → HUD сохраняет состояние, listeners и focus", () => {
  const {display, document, hud} = createProjectionTree()
  const button = document.createElement("button")
  expect(button).toBeInstanceOf(HTMLButtonElement)
  let events = 0
  button.addEventListener("experience-proof", () => {
    events += 1
  })
  ;(button as unknown as {state: number}).state = 7
  display.appendChild(button)
  button.focus()

  hud.appendChild(button)
  button.dispatchEvent(new Event("experience-proof"))

  expect(document.activeElement).toBe(button)
  expect(events).toBe(1)
  expect((button as unknown as {state: number}).state).toBe(7)
})
