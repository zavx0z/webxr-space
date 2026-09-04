import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

const root = resolve(import.meta.dir, "../..")
const uiRoot = resolve(root, "ui")

Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [uiRoot],
}))

const {Breadcrumbs} = await import("../navigation/breadcrumbs.tsx")

test("[UI-BREADCRUMBS-001] путь является ordered navigation с текущим последним сегментом", () => {
  const document = createDocument()
  const container = document.createElement("div")
  document.append(container)
  const component = createRoot(container)
  const items = Object.freeze([
    Object.freeze({id: "package", label: "@zavx0z/nodes"}),
    Object.freeze({id: "layout", label: "Раскладка"}),
    Object.freeze({id: "adaptive", label: "Адаптивная"}),
  ])

  component.render(Breadcrumbs as any, {items, onNavigate() {}})

  const navigation = container.querySelector('nav[aria-label="Путь"]')
  expect(navigation).not.toBeNull()
  expect(navigation?.querySelectorAll("ol")).toHaveLength(1)
  expect(navigation?.querySelectorAll("li")).toHaveLength(3)
  expect(navigation?.querySelectorAll("button")).toHaveLength(3)
  const separators = [...navigation?.querySelectorAll("img") ?? []]
  expect(separators).toHaveLength(3)
  expect(separators[0]?.hasAttribute("hidden")).toBe(true)
  expect(separators.slice(1).every(separator => !separator.hasAttribute("hidden"))).toBe(true)
  expect(navigation?.textContent).not.toContain("›")
  expect(navigation?.querySelector('[aria-current="page"]')?.textContent).toBe("Адаптивная")

  component.unmount()
  expect(container.childNodes).toHaveLength(0)
})

test("[UI-BREADCRUMBS-002] пустой, повторяющийся или безымянный путь отклоняется", () => {
  const document = createDocument()
  const container = document.createElement("div")
  const component = createRoot(container)

  expect(() => component.render(Breadcrumbs as any, {items: []})).toThrow("non-empty array")
  expect(() => component.render(Breadcrumbs as any, {
    items: [{id: "same", label: "A"}, {id: "same", label: "B"}],
  })).toThrow("must be unique")
  expect(() => component.render(Breadcrumbs as any, {
    items: [{id: "empty", label: ""}],
  })).toThrow("label must be non-empty")
})

test("[UI-BREADCRUMBS-003] каталог размещает Breadcrumbs только в Компоненты → Навигация", async () => {
  const catalog = await Bun.file(resolve(uiRoot, ".storybook/catalog.json")).json() as {
    categories: readonly Readonly<{
      id: string
      group?: Readonly<{id: string}> | undefined
      subjects: readonly Readonly<{apiName?: string | undefined; route: string}>[]
    }>[]
  }
  const owners = catalog.categories.flatMap(category => category.subjects.flatMap(subject =>
    subject.apiName === "Breadcrumbs" ? [{category, subject}] : []))

  expect(owners).toHaveLength(1)
  expect(owners[0]?.category.id).toBe("components-navigation")
  expect(owners[0]?.category.group?.id).toBe("components")
  expect(owners[0]?.subject.route).toBe("components/navigation/breadcrumbs")
})
