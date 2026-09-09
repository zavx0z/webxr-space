import {DisplayElement} from "../../dom/display/index.ts"
import {expect, test} from "bun:test"
import {mkdir, mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {
  createDocument,
  Event,
  HTMLButtonElement,
  HTMLElement,
  type Document,
  type Node,
} from "../../dom/src/index.ts"
import {createSpaceElementFactories, readSpaceTree, XRGroupElement} from "../../space/src/index.ts"
import {HUDElement} from "../../dom/hud/index.ts"
import {SpaceElement} from "../../dom/space/index.ts"
import {ViewPointElement} from "../../dom/viewpoint/index.ts"
import {createTemplateJsxBunPlugin} from "../../template/compiler/bun.ts"
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
  const html = document.createElement("html")
  const head = document.createElement("head")
  const body = document.createElement("body")
  const space = document.createElement("space") as SpaceElement
  const viewPoint = document.createElement("viewpoint") as ViewPointElement
  const display = document.createElement("display") as DisplayElement
  const hud = document.createElement("hud") as HUDElement
  display.id = "storybook-display"
  hud.id = "storybook-workbench"
  space.append(viewPoint, display, hud)
  body.append(space)
  html.append(head, body)
  document.append(html)
  return {display, document, html, head, body, hud, space, viewPoint}
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
  host: DisplayElement | HUDElement,
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
  const {display, document, html, head, body, hud, space, viewPoint} = createSemanticExperience()
  const tree = readSpaceTree(document)
  assertRequirement(
    document.documentElement === html && head.parentElement === html &&
      body.parentElement === html && space.parentElement === body && tree.space === space,
    "UI-ACCEPT-LOCAL-001",
    "Browser Document должен сохранять html/head/body, а Space должен принадлежать body",
  )
  assertRequirement(
    tree.viewPoint === viewPoint && viewPoint.ownerDocument === document,
    "UI-ACCEPT-LOCAL-001",
    "Space должен содержать один exact ViewPoint того же Document",
  )
  assertRequirement(
    tree.displays[0] === display && tree.hud?.element === hud,
    "UI-ACCEPT-LOCAL-001",
    "Display и HUD должны быть projection roots exact Space",
  )
})

// Обе реальные истории монтируются в структуру html/head/body/space, которую создаёт Browser.
test.each(["display", "hud"] as const)("[UI-ACCEPT-LOCAL-002] %s сохраняет владельцев, кнопку и состояние при переносе и очищается при dispose", async projection => {
  const {display, document, html, body, hud, space, viewPoint} = createSemanticExperience()
  const stories = await loadAcceptanceStories()
  const host = projection === "display" ? display : hud
  const other = projection === "display" ? hud : display
  const mounted = await mountStory(document, host, stories[projection])
  try {
    const owner = mounted.node
    assertRequirement(owner instanceof HTMLElement, "UI-ACCEPT-LOCAL-002", "История должна вернуть настоящий HTMLElement")
    const button = owner.querySelector("button")
    assertRequirement(button instanceof HTMLButtonElement, "UI-ACCEPT-LOCAL-002", "История должна содержать настоящую Button")
    let events = 0
    button.addEventListener("identity-proof", () => { events += 1 })
    button.focus()
    button.click()
    other.appendChild(owner)
    host.appendChild(owner)
    button.dispatchEvent(new Event("identity-proof"))

    expect(host.firstElementChild, "Перенос должен сохранять исходный узел истории").toBe(owner)
    expect(owner.querySelector("button"), "Перенос должен сохранять исходную кнопку").toBe(button)
    expect(button.getAttribute("aria-pressed"), "Перенос должен сохранять выбранное состояние").toBe("true")
    expect(button.textContent, "Подпись должна отражать состояние после клика").toBe("Выбрано")
    expect(document.activeElement, "Перенос должен сохранять фокус кнопки").toBe(button)
    expect(events, "Пользовательский обработчик должен переживать перенос").toBe(1)
    button.click()
    expect(button.getAttribute("aria-pressed"), "Второй клик должен возвращать исходное состояние").toBe("false")
    expect(document.documentElement, "История не должна заменять html приложения").toBe(html)
    expect(space.parentElement, "Space должен оставаться внутри исходного body").toBe(body)
    expect(readSpaceTree(document).space, "История должна сохранять исходную сцену").toBe(space)
    expect(readSpaceTree(document).viewPoint, "История должна сохранять исходную камеру").toBe(viewPoint)
    expect(document.querySelectorAll("space").length, "История не должна создавать второй Space").toBe(1)
    expect(document.querySelectorAll("viewpoint").length, "История не должна создавать вторую камеру").toBe(1)
  } finally {
    mounted.session.dispose()
    mounted.abort.abort()
  }
  expect(mounted.node.parentNode, "Dispose должен удалять только содержимое истории").toBeNull()
  expect(readSpaceTree(document).space, "Dispose должен сохранять сцену приложения").toBe(space)
  expect([display.parentElement, hud.parentElement], "Dispose должен сохранять обе проекции приложения").toEqual([space, space])
}, 20_000)

test.each(["display", "hud"] as const)("[UI-ACCEPT-LOCAL-005] %s отклоняет неверную структуру сцены", async projection => {
  const stories = await loadAcceptanceStories()
  for (const invalid of ["missing-camera", "second-space", "nested-space", "missing-projection"] as const) {
    const fixture = createSemanticExperience()
    if (invalid === "missing-camera") fixture.viewPoint.remove()
    if (invalid === "second-space") fixture.body.append(fixture.document.createElement("space"))
    if (invalid === "nested-space") {
      const wrapper = fixture.document.createElement("div")
      fixture.body.append(wrapper)
      wrapper.append(fixture.space)
    }
    if (invalid === "missing-projection") fixture[projection].remove()
    await expect(Promise.resolve().then(() => stories[projection].create(fixture.document)),
      `История ${projection} должна отклонять неверный контур: ${invalid}`).rejects.toThrow()
  }
})

test.each(["display", "hud"] as const)("[UI-ACCEPT-LOCAL-006] %s проверяет точную проекцию после монтирования", async projection => {
  const fixture = createSemanticExperience()
  const stories = await loadAcceptanceStories()
  const {story} = await stories[projection].create(fixture.document)
  const host = fixture[projection]
  const other = projection === "display" ? fixture.hud : fixture.display
  const orphan = fixture.document.createElement(projection)
  const wrapper = fixture.document.createElement("div")
  fixture.body.append(orphan)
  host.append(wrapper)
  try {
    expect(story.source.typescript, "Показываемый исходник не должен требовать Space вместо html").not.toContain("tree.space !== document.documentElement")
    expect(story.source.typescript, "Показываемый исходник должен использовать актуальный createRoot").not.toContain("createExperience")
    expect(() => story.afterPresent?.(), "Отсоединённая история должна отклоняться").toThrow()
    other.append(story.element)
    expect(() => story.afterPresent?.(), "История не должна принимать соседний тип проекции").toThrow()
    orphan.append(story.element)
    expect(() => story.afterPresent?.(), "Элемент подходящего типа вне host Space не должен считаться проекцией").toThrow()
    wrapper.append(story.element)
    expect(() => story.afterPresent?.(), "Вложенное содержимое правильной проекции должно приниматься").not.toThrow()
    fixture.viewPoint.remove()
    fixture.space.prepend(fixture.document.createElement("viewpoint"))
    expect(() => story.afterPresent?.(), "Монтирование не должно незаметно заменять камеру host").toThrow()
  } finally {
    story.element.parentNode?.removeChild(story.element)
    story.dispose()
  }
})

test.each(["display", "hud"] as const)("[UI-ACCEPT-LOCAL-007] %s принимает также Space непосредственно в Document", async projection => {
  const fixture = createSemanticExperience()
  const stories = await loadAcceptanceStories()
  fixture.space.remove()
  fixture.html.remove()
  fixture.document.append(fixture.space)
  const mounted = await mountStory(fixture.document, fixture[projection], stories[projection])
  try {
    expect(mounted.node.parentElement, "Поддерживаемая низкоуровневая структура должна сохранять выбранную проекцию").toBe(fixture[projection])
  } finally {
    mounted.session.dispose()
    mounted.abort.abort()
  }
})

test("[UI-ACCEPT-LOCAL-008] показываемые исходники обеих проекций компилируются и работают в Document host", async () => {
  const ignoredRoot = join(uiRoot, "tests/.codex")
  await mkdir(ignoredRoot, {recursive: true})
  const directory = await mkdtemp(join(ignoredRoot, "acceptance-source-"))
  const stories = await loadAcceptanceStories()
  try {
    await Bun.write(join(directory, "tsconfig.json"), JSON.stringify({
      extends: resolve(uiRoot, "tsconfig.json"),
      include: ["*.tsx"],
    }))
    for (const projection of ["display", "hud"] as const) {
      const fixture = createSemanticExperience()
      const {story} = await stories[projection].create(fixture.document)
      try {
        const sourcePath = join(directory, `${projection}.tsx`)
        await Bun.write(sourcePath, story.source.typescript)
        const result = await Bun.build({
          entrypoints: [sourcePath],
          outdir: join(directory, projection),
          target: "bun",
          external: ["@zavx0z/component", "@zavx0z/dom", "@zavx0z/space", "@zavx0z/template/compiled"],
          plugins: [createTemplateJsxBunPlugin({cwd: root, sourceRoots: [uiRoot]})],
        })
        expect(result.success, `Показываемый исходник ${projection} должен компилироваться`).toBe(true)
        const output = result.outputs.find(value => value.kind === "entry-point")!
        const {mountAcceptance} = await import(pathToFileURL(output.path).href)
        const container = fixture.document.createElement("div")
        fixture[projection].append(container)
        const component = mountAcceptance(container)
        try {
          const button = container.querySelector("button")!
          assertRequirement(button instanceof HTMLButtonElement, "UI-ACCEPT-LOCAL-008", "Показываемый пример должен создавать настоящую кнопку")
          button.click()
          expect(button.textContent, `Кнопка из показываемого исходника ${projection} должна менять состояние`).toBe("Выбрано")
          expect(readSpaceTree(fixture.document).space, "Пример должен сохранять исходную сцену host").toBe(fixture.space)
        } finally {
          component.unmount()
        }
      } finally {
        story.dispose()
      }
    }
  } finally {
    await rm(directory, {recursive: true, force: true})
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
