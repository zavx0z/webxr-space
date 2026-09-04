import {test} from "bun:test"
import {resolve} from "node:path"
import {
  createDocument,
  Event,
  HTMLButtonElement,
  HTMLElement,
  type Document,
  type Node,
} from "@zavx0z/dom"
import {
  createSpaceElementFactories,
  readSpaceTree,
  XRDisplayElement,
  XRGroupElement,
  XRHUDElement,
  XRSpaceElement,
  XRViewPointElement,
} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {runtime} from "../../ui/.storybook/runtime.ts"
import type {OwnerStoryDescriptor} from "../../ui/.storybook/stories/story-types.ts"
import {assertRequirement} from "../assert.ts"

/**
 * Внешняя MCP-приёмка, которую этот Bun-тест намеренно не имитирует:
 * exact route ready/presented, один native Canvas, Workbench внутри HUD,
 * реальный WebGPU paint, non-black canvas и пустые console/runtime/GPU diagnostics.
 * Прохождение локальных semantic/runtime проверок ниже не закрывает эти критерии.
 */

const root = resolve(import.meta.dir, "../..")
const uiRoot = resolve(root, "ui")
const displayRoute = "acceptance/experience/display/default"
const hudRoute = "acceptance/experience/hud/default"

Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [uiRoot],
}))

type Catalog = Readonly<{
  categories: readonly Readonly<{
    id: string
    subjects: readonly Readonly<{
      id: string
      presentation?: Readonly<{projection: string}>
      variants: readonly Readonly<{id: string; route?: string}>[]
    }>[]
  }>[]
}>

const createSemanticExperience = () => {
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const space = document.createElement("xr-space") as XRSpaceElement
  const viewPoint = document.createElement("xr-view-point") as XRViewPointElement
  const display = document.createElement("xr-display") as XRDisplayElement
  const hud = document.createElement("xr-hud") as XRHUDElement
  display.id = "storybook-display"
  hud.id = "storybook-workbench"
  space.append(viewPoint, display, hud)
  document.appendChild(space)
  return {display, document, hud, space, viewPoint}
}

const loadAcceptanceStories = async () => {
  const [displayModule, hudModule] = await Promise.all([
    import("../../ui/.storybook/stories/subjects/acceptance-experience-display.ts"),
    import("../../ui/.storybook/stories/subjects/acceptance-experience-hud.ts"),
  ])
  return {
    display: displayModule.story_default,
    hud: hudModule.story_default,
  }
}

const mountStory = async (
  document: Document,
  host: XRDisplayElement | XRHUDElement,
  descriptor: OwnerStoryDescriptor,
) => {
  const abort = new AbortController()
  const diagnostics: unknown[] = []
  const presentation = {node: null as Node | null}
  const session = runtime.create({
    document,
    signal: abort.signal,
    present(value) {
      presentation.node = value.node
      host.appendChild(value.node)
    },
    reportDiagnostic(value) {
      diagnostics.push(value)
    },
  })
  await session.mount({route: descriptor.route, story: descriptor, signal: abort.signal})
  const node = presentation.node
  assertRequirement(
    node !== null && node.parentNode === host,
    "UI-ACCEPT-LOCAL-002",
    `runtime/4 должен представить exact owner story внутри ${host.localName}`,
  )
  assertRequirement(
    diagnostics.length === 0,
    "UI-ACCEPT-LOCAL-002",
    `локальный owner runtime не должен публиковать diagnostics, получено ${diagnostics.length}`,
  )
  return {abort, node, session}
}

const readCatalog = (): Promise<Catalog> => Bun.file(
  resolve(uiRoot, ".storybook/catalog.json"),
).json()

test("[UI-ACCEPT-LOCAL-001] один semantic Document содержит exact Space, ViewPoint, Display и HUD", () => {
  const {display, document, hud, space, viewPoint} = createSemanticExperience()
  const tree = readSpaceTree(document)
  assertRequirement(
    document.documentElement === space && tree.space === space,
    "UI-ACCEPT-LOCAL-001",
    "Space должен быть единственным documentElement semantic Experience",
  )
  assertRequirement(
    tree.viewPoint === viewPoint && viewPoint.ownerDocument === document,
    "UI-ACCEPT-LOCAL-001",
    "Space должен содержать один exact ViewPoint того же Document",
  )
  assertRequirement(
    tree.displays[0]?.element === display && tree.hud?.element === hud,
    "UI-ACCEPT-LOCAL-001",
    "Display и HUD должны быть projection roots exact Space",
  )
})

// Тест включает сборку TSX одновременно с проверками остальных пакетов.
test("[UI-ACCEPT-LOCAL-002] actual UI owner работает в Display и HUD, а reparent сохраняет identity и state", async () => {
  const {display, document, hud} = createSemanticExperience()
  const stories = await loadAcceptanceStories()
  assertRequirement(
    stories.display.route === displayRoute && stories.hud.route === hudRoute,
    "UI-ACCEPT-LOCAL-002",
    "исполняемые Display и HUD stories должны соответствовать exact acceptance routes",
  )

  const mountedDisplay = await mountStory(document, display, stories.display)
  try {
    const owner = mountedDisplay.node
    assertRequirement(
      owner instanceof HTMLElement,
      "UI-ACCEPT-LOCAL-002",
      "actual UI acceptance story должна вернуть semantic HTMLElement owner",
    )
    const button = owner.querySelector("button")
    assertRequirement(
      button instanceof HTMLButtonElement,
      "UI-ACCEPT-LOCAL-002",
      "actual UI acceptance story должна содержать настоящий semantic Button",
    )
    const ownerIdentity = owner
    const buttonIdentity = button
    let events = 0
    button.addEventListener("identity-proof", () => {
      events += 1
    })
    button.focus()
    button.dispatchEvent(new Event("click"))
    hud.appendChild(owner)
    display.appendChild(owner)
    button.dispatchEvent(new Event("identity-proof"))

    assertRequirement(
      owner === ownerIdentity && button === buttonIdentity && owner.ownerDocument === document,
      "UI-ACCEPT-LOCAL-002",
      "Display → HUD → Display должен сохранять exact owner и Button identity",
    )
    assertRequirement(
      button.getAttribute("aria-pressed") === "true" && button.textContent === "Выбрано",
      "UI-ACCEPT-LOCAL-002",
      "same-Document reparent должен сохранять actual component hook state",
    )
    assertRequirement(
      document.activeElement === button && events === 1,
      "UI-ACCEPT-LOCAL-002",
      "same-Document reparent должен сохранять semantic focus и listeners",
    )
  } finally {
    mountedDisplay.session.dispose()
    mountedDisplay.abort.abort()
  }

  const mountedHud = await mountStory(document, hud, stories.hud)
  try {
    assertRequirement(
      mountedHud.node.parentNode === hud,
      "UI-ACCEPT-LOCAL-002",
      "actual HUD acceptance story должна пройти afterPresent внутри real XRHUDElement",
    )
  } finally {
    mountedHud.session.dispose()
    mountedHud.abort.abort()
  }
}, 20_000)

test("[UI-ACCEPT-LOCAL-003] 3D semantic owner монтируется непосредственно в exact Space", () => {
  const {document, display, hud, space} = createSemanticExperience()
  const object = document.createElement("xr-group") as XRGroupElement
  space.appendChild(object)
  const tree = readSpaceTree(document)
  assertRequirement(
    object.parentElement === space && object.ownerDocument === document,
    "UI-ACCEPT-LOCAL-003",
    "3D owner должен быть direct child exact Space того же Document",
  )
  assertRequirement(
    tree.objects.includes(object) && !display.contains(object) && !hud.contains(object),
    "UI-ACCEPT-LOCAL-003",
    "3D owner не должен проходить через Display, HUD или world projection",
  )
})

test("[UI-ACCEPT-LOCAL-004] UI Storybook использует exact runtime/4 без world projection", async () => {
  const catalog = await readCatalog()
  const projections = catalog.categories.flatMap(({subjects}) => subjects.flatMap(
    ({presentation}) => presentation === undefined ? [] : [presentation.projection],
  ))
  const allowed = new Set(["display", "hud", "space"])
  assertRequirement(
    runtime.protocol === "storybook-runtime/4",
    "UI-ACCEPT-LOCAL-004",
    `ожидался storybook-runtime/4, получено ${runtime.protocol}`,
  )
  assertRequirement(
    projections.length > 0 && projections.every(projection => allowed.has(projection)),
    "UI-ACCEPT-LOCAL-004",
    `допустимы только display | hud | space, получено ${[...new Set(projections)].join(" | ")}`,
  )
  assertRequirement(
    !projections.includes("world"),
    "UI-ACCEPT-LOCAL-004",
    "UI Storybook declarations не должны возвращать world projection",
  )
})
