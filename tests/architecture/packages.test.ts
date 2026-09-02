import {describe, test} from "bun:test"
import {readdir} from "node:fs/promises"
import {join} from "node:path"
import {assertRequirement} from "../assert.ts"

const root = join(import.meta.dir, "../..")

const packages = Object.freeze([
  ["engine", "@zavx0z/engine", "Объекты сцены, геометрия, материалы, математика и анимация без WebGPU"],
  ["dom", "@zavx0z/dom", "Document, элементы, атрибуты, события, focus и состояние полей"],
  ["template", "@zavx0z/template", "Компилятор TSX и формат готового шаблона"],
  ["component", "@zavx0z/component", "Состояние компонентов, hooks, context, эффекты и очистка"],
  ["renderer", "@zavx0z/renderer", "CSS, размеры, раскладка, прокрутка, список рисования и hit без GPU"],
  ["webgpu", "@zavx0z/webgpu", "Shaders, buffers, textures, uploads и рисование"],
  ["browser", "@zavx0z/browser", "Canvas, resize, input, RAF и общий цикл кадров"],
  ["space", "@zavx0z/space", "Space, ViewPoint, Mesh, Geometry, Material, Display и HUD"],
  ["ui", "@zavx0z/ui", "Универсальные UI-компоненты, тема и иконки"],
  ["nodetree", "@zavx0z/nodetree", "Живая модель NodeTree, Parameter stores, снимки и сохранение"],
  ["layout", "@zavx0z/layout", "Алгоритмы расположения нод и Worker"],
  ["nodes", "@zavx0z/nodes", "Визуальные NodeTree, NodeEditor, Frame, Node, Parameter, Socket и Link"],
] as const)

describe("Конечный состав пакетов", () => {
  for (const [directory, name, description] of packages) {
    test(`[PKG-001] ${name} находится в корневом каталоге ${directory}`, async () => {
      const manifestPath = join(root, directory, "package.json")
      const manifest = await Bun.file(manifestPath).json() as Record<string, unknown>

      assertRequirement(
        manifest.name === name,
        "PKG-001",
        `${directory}/package.json должен объявлять имя ${name}`,
      )
      assertRequirement(
        manifest.version === "0.0.0",
        "PKG-001",
        `${name} до первого принятого выпуска должен иметь версию 0.0.0`,
      )
      assertRequirement(
        manifest.private === true,
        "PKG-001",
        `${name} не должен публиковаться до завершения архитектурной приёмки`,
      )
      assertRequirement(
        manifest.type === "module",
        "PKG-001",
        `${name} должен быть модулем ESM`,
      )
      assertRequirement(
        manifest.packageManager === "bun@1.4.0",
        "PKG-001",
        `${name} должен использовать Bun 1.4.0`,
      )
      assertRequirement(
        manifest.description === description,
        "PKG-001",
        `${name} должен иметь принятое описание: ${description}`,
      )
    })
  }

  test("[PKG-002] в корне нет других пакетов", async () => {
    const entries = await readdir(root, {withFileTypes: true})
    const actual: string[] = []
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "projects" || entry.name === "tests") continue
      if (await Bun.file(join(root, entry.name, "package.json")).exists()) actual.push(entry.name)
    }

    const expected = packages.map(([directory]) => directory).sort()
    actual.sort()
    assertRequirement(
      JSON.stringify(actual) === JSON.stringify(expected),
      "PKG-002",
      `ожидались только пакеты ${expected.join(", ")}, получены ${actual.join(", ")}`,
    )
  })
})
