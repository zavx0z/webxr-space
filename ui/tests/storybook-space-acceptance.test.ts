import {expect, test} from "bun:test"
import {resolve} from "node:path"

const uiRoot = resolve(import.meta.dir, "..")
const catalogPath = resolve(uiRoot, ".storybook/catalog.json")
const displaySubjectPath = resolve(
  uiRoot,
  ".storybook/stories/subjects/acceptance-experience-display.ts",
)
const hudSubjectPath = resolve(
  uiRoot,
  ".storybook/stories/subjects/acceptance-experience-hud.ts",
)
const storyPath = resolve(
  uiRoot,
  ".storybook/stories/compiled/compiled-experience-space-ui-acceptance-story.tsx",
)

test("[UI-ACCEPT-STATIC-001] Display and HUD leaves resolve to the same package-owned UI story", async () => {
  const catalog = await Bun.file(catalogPath).json() as Catalog
  const category = catalog.categories.find(({id}) => id === "experience-acceptance")

  expect(category?.route).toBe("acceptance/experience")
  for (const expected of [
    {
      id: "display",
      projection: "display",
      route: "acceptance/experience/display/default",
      modulePath: "./stories/subjects/acceptance-experience-display.ts",
      subjectPath: displaySubjectPath,
      factory: "createCompiledExperienceDisplayUiAcceptanceStory",
    },
    {
      id: "hud",
      projection: "hud",
      route: "acceptance/experience/hud/default",
      modulePath: "./stories/subjects/acceptance-experience-hud.ts",
      subjectPath: hudSubjectPath,
      factory: "createCompiledExperienceHudUiAcceptanceStory",
    },
  ] as const) {
    const subject = category?.subjects.find(({id}) => id === expected.id)
    const variant = subject?.variants.find(({id}) => id === "default")
    expect(subject?.kind).toBe("acceptance")
    expect(subject?.presentation).toEqual({
      protocol: "story-presentation/1",
      projection: expected.projection,
      widgets: ["props", "source", "diagnostics"],
    })
    expect(variant?.route).toBe(expected.route)
    expect(variant?.module).toEqual({path: expected.modulePath, export: "story_default"})

    const subjectSource = await Bun.file(expected.subjectPath).text()
    expect(subjectSource).toContain('export const story_default = defineOwnerStory(')
    expect(subjectSource).toContain(`"${expected.route}"`)
    expect(subjectSource).toContain(expected.factory)
    expect(subjectSource).toContain('"../compiled/compiled-experience-space-ui-acceptance-story.tsx"')
  }

  const catalogSource = await Bun.file(catalogPath).text()
  const storySources: string[] = []
  for await (const relativePath of new Bun.Glob("**/*.{ts,tsx}").scan({
    cwd: resolve(uiRoot, ".storybook/stories"),
  })) {
    storySources.push(await Bun.file(resolve(uiRoot, ".storybook/stories", relativePath)).text())
  }
  const publicDeclarationSource = `${catalogSource}\n${storySources.join("\n")}`
  for (const formerPublicName of ["HudWindow", "HudFrame", "OptionGroupField"]) {
    expect(publicDeclarationSource).not.toContain(formerPublicName)
  }
})

test("[UI-ACCEPT-STATIC-002] story consumes the host Space and never creates another Experience", async () => {
  const packageJson = await Bun.file(resolve(uiRoot, "package.json")).json()
  const source = await Bun.file(storyPath).text()
  const runtimeSource = await Bun.file(resolve(uiRoot, ".storybook/runtime.ts")).text()

  expect(packageJson.peerDependencies?.["@zavx0z/space"]).toBeUndefined()
  expect(packageJson.dependencies?.["@zavx0z/space"]).toBeUndefined()
  expect(source).toContain('import {readSpaceTree} from "@zavx0z/space"')
  expect(source).toContain('import {Button} from "@zavx0z/ui/buttons/button"')
  expect(source).toContain('import {Pane} from "@zavx0z/ui/surfaces/pane"')
  expect(source).toContain("const tree = readSpaceTree(document)")
  expect(source).toContain("tree.space !== document.documentElement")
  expect(source).toContain("tree.viewPoint.ownerDocument !== document")
  expect(source).toContain('projection === "display" && tree.displays.length === 0')
  expect(source).toContain('projection === "hud" && tree.hud === null')
  expect(source).toContain("UI display acceptance requires a host-owned @zavx0z/space Display")
  expect(source).toContain("UI HUD acceptance requires a host-owned @zavx0z/space HUD")
  expect(source).toContain("assertProjectionOwner(owner, projection)")
  expect(source).toContain("ancestor instanceof XRDisplayElement")
  expect(source).toContain("ancestor instanceof XRHUDElement")
  expect(source).toContain(
    "UI acceptance requires the Storybook host to use one @zavx0z/browser Experience",
  )
  expect(runtimeSource).toContain("context.reportDiagnostic(Object.freeze({")
  expect(runtimeSource).toContain("message: error instanceof Error ? error.message : String(error)")

  for (const forbidden of [
    'import {createDocument',
    "createDocument(",
    'import {createExperience',
    "\ncreateExperience(",
    "createSpaceElementFactories(",
    "HTMLCanvasElement",
    "<Space",
    "<ViewPoint",
    "HudWindow",
    "HudFrame",
    "OptionGroupField",
  ]) {
    expect(source).not.toContain(forbidden)
  }
})

type Catalog = Readonly<{
  categories: readonly Readonly<{
    id: string
    route?: string
    subjects: readonly Readonly<{
      id: string
      kind: string
      presentation: Readonly<{
        protocol: string
        projection: string
        widgets: readonly string[]
      }>
      variants: readonly Readonly<{
        id: string
        route?: string
        module?: Readonly<{path: string; export: string}>
      }>[]
    }>[]
  }>[]
}>
