import {expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {resolve, join} from "node:path"
import {pathToFileURL} from "node:url"
import {createDocument} from "../../src/index.ts"
import type {ViewPointElement} from "../index.ts"
import {createRoot} from "../../../component/src/index.ts"
import {createTemplateJsxBunPlugin} from "../../../template/compiler/bun.ts"

test("Повторный JSX render сохраняет команды камеры и ref, изменение атрибута обновляет тот же элемент", async () => {
  const output = await mkdtemp(join(import.meta.dir, ".authoring-"))
  const root = createRoot(createDocument())
  try {
    const result = await Bun.build({
      entrypoints: [resolve(import.meta.dir, "authoring.fixture.tsx")],
      outdir: output,
      target: "bun",
      external: ["@zavx0z/component", "@zavx0z/dom", "@zavx0z/template/compiled"],
      plugins: [createTemplateJsxBunPlugin({cwd: resolve(import.meta.dir, "../../.."), sourceRoots: [import.meta.dir]})],
    })
    expect(result.success, "Базовый тег viewpoint должен компилироваться без компонента Space").toBe(true)
    const entry = result.outputs.find(value => value.kind === "entry-point")!
    const {CameraFixture} = await import(pathToFileURL(entry.path).href)
    const ref = {current: null as ViewPointElement | null}
    const props = {x: 0, y: -600, z: 900, targetZ: 900, ref}
    root.render(CameraFixture, props)
    const camera = ref.current!
    camera.dollyTo(300)
    root.render(CameraFixture, {...props})
    expect(ref.current, "Повторный render должен сохранять экземпляр камеры").toBe(camera)
    expect(camera.y, "Неизменные авторские атрибуты должны сохранять результат dollyTo").toBe(-300)
    root.render(CameraFixture, {...props, y: -1000})
    expect(camera.y, "Новое авторское значение должно обновлять положение камеры").toBe(-1000)
    root.unmount()
    expect(ref.current, "Размонтирование должно очищать ref камеры").toBeNull()
  } finally {
    root.unmount()
    await rm(output, {recursive: true, force: true})
  }
})
