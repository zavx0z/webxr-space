import {describe, test} from "bun:test"
import {join} from "node:path"
import {assertRequirement} from "../assert.ts"

const root = join(import.meta.dir, "../..")

const packages = Object.freeze([
  ["engine", "@zavx0z/engine", "Объекты сцены, геометрия, материалы, математика и анимация без WebGPU"],
  ["dom", "@zavx0z/dom", "Document, элементы, атрибуты, события, focus и состояние полей"],
  ["template", "@zavx0z/template", "Компилятор TSX и формат готового шаблона"],
  ["component", "@zavx0z/component", "Состояние компонентов, hooks, context, эффекты и очистка"],
  ["renderer", "@zavx0z/renderer", "CSS, размеры, раскладка, прокрутка, список рисования и hit без GPU"],
  ["markdown", "@webxr/markdown", "Разбор и отображение Markdown через готовые UI-компоненты"],
  ["webgpu", "@zavx0z/webgpu", "Shaders, buffers, textures, uploads и рисование"],
  ["browser", "@zavx0z/browser", "Canvas, resize, input, RAF и общий цикл кадров"],
  ["space", "@zavx0z/space", "Object, Asset, Group, Mesh, Line, Text, Light, Animation, Geometry, Material"],
  ["ui", "@zavx0z/ui", "Универсальные UI-компоненты, тема и иконки"],
  ["nodes", "@webxr/nodes", "Визуальные NodeTree, NodeEditor, Frame, Node, Parameter, Socket и Link"],
  ["nodes/tree", "@nodes/tree", "Живая модель NodeTree, Parameter stores, снимки и сохранение"],
  ["nodes/layout", "@nodes/layout", "Алгоритмы расположения нод и Worker"],
  ["nodes/parameters", "@nodes/parameters", "Представления параметров нод и проекция Parameter Store"],
  ["nodes/sockets", "@nodes/sockets", "Адресуемый Socket и его визуальные предустановки"],
  ["devtools", "@zavx0z/devtools", "Диагностика Document, состояния элементов и результатов Renderer"],
] as const)

describe("Конечный состав пакетов", () => {
  test("[PKG-000] корневое рабочее пространство называется @zavx0z/webxr", async () => {
    const manifest = await Bun.file(join(root, "package.json")).json() as Record<string, unknown>
    assertRequirement(
      manifest.name === "@zavx0z/webxr",
      "PKG-000",
      "корневой package.json должен объявлять имя @zavx0z/webxr",
    )
  })

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

  test("[PKG-002] состав пакетов совпадает с принятыми владельцами без ограничения их числа", async () => {
    const actual: string[] = []
    for (const pattern of ["*", "nodes/*"]) for await (const entry of new Bun.Glob(pattern).scan({cwd: root, onlyFiles: false})) {
      if (entry === "projects" || entry === "tests") continue
      if (await Bun.file(join(root, entry, "package.json")).exists()) actual.push(entry)
    }

    const expected = packages.map(([directory]) => directory).sort()
    actual.sort()
    assertRequirement(
      JSON.stringify(actual) === JSON.stringify(expected),
      "PKG-002",
      `ожидались только пакеты ${expected.join(", ")}, получены ${actual.join(", ")}`,
    )
  })

  test("[PKG-003] Storybook объявляет каждый пакет в порядке рабочего пространства", async () => {
    const rootManifest = await Bun.file(join(root, "package.json")).json() as {
      workspaces?: readonly string[]
    }
    const acceptedDirectories = packages.map(([directory]) => directory)

    assertRequirement(
      JSON.stringify(rootManifest.workspaces) === JSON.stringify(acceptedDirectories),
      "PKG-003",
      `корневой package.json должен объявлять рабочие пространства в принятом порядке: ${acceptedDirectories.join(", ")}`,
    )

    const rootDeclaration = Bun.file(join(root, ".storybook/manifest.json"))
    const storybookManifest = (await rootDeclaration.exists() ? await rootDeclaration.json() : {}) as {
      packages?: unknown
    }
    assertRequirement(
      !Object.hasOwn(storybookManifest, "packages"),
      "PKG-003",
      "состав Storybook задаётся package.json#workspaces и не должен дублироваться в manifest.packages",
    )

    for (const [directory, packageName] of packages) {
      const packageManifestPath = join(root, directory, "package.json")
      const storybookPackageManifestPath = join(root, directory, ".storybook/manifest.json")
      const packageManifest = await Bun.file(packageManifestPath).json() as {
        name?: string
      }
      if (!await Bun.file(storybookPackageManifestPath).exists()) continue
      const storybookPackageManifest = await Bun.file(storybookPackageManifestPath).json() as {
        schemaVersion?: number
        kind?: string
        id?: string
        packageJson?: string
      }

      assertRequirement(
        storybookPackageManifest.schemaVersion === 1 &&
          packageManifest.name === packageName &&
          !Object.hasOwn(storybookPackageManifest, "kind") &&
          !Object.hasOwn(storybookPackageManifest, "id") &&
          !Object.hasOwn(storybookPackageManifest, "packageJson"),
        "PKG-003",
        `${directory}/.storybook/manifest.json не должен дублировать kind, id и путь package.json владельца ${packageName}`,
      )
    }
  })

  test("[PKG-010] пакеты подключаются извне без протокола workspace", async () => {
    for (const [directory, name] of packages) {
      const manifest = await Bun.file(join(root, directory, "package.json")).json() as {
        dependencies?: Readonly<Record<string, string>>
        devDependencies?: Readonly<Record<string, string>>
        peerDependencies?: Readonly<Record<string, string>>
      }
      for (const [dependency, version] of Object.entries({
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
      })) {
        assertRequirement(
          !version.startsWith("workspace:"),
          "PKG-010",
          `${name} должен объявлять переносимую версию ${dependency}, получено ${version}`,
        )
      }
    }
  })
})
