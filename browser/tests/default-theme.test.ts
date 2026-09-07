import {expect, test} from "bun:test"
import type {AttachOptions} from "../src/attach.ts"
import {defaultThemeUrl, withDefaultTheme} from "../src/default-theme.ts"

test("attach supplies the actual UI CSS asset when the caller supplies no theme or page link", () => {
  const options = {canvas: {}, app: {}} as unknown as AttachOptions
  const resolved = withDefaultTheme(options)
  expect(resolved.stylesheets).toEqual([defaultThemeUrl])
  expect(options.stylesheets).toBeUndefined()
  expect(defaultThemeUrl).toEndWith(".css")
})

test("an already declared default uses the same link while an explicit theme replaces the default", () => {
  const link = {id: "@zavx0z/ui/themes/theme.css", link: {} as HTMLLinkElement}
  const base = {canvas: {}, app: {}, stylesheets: [link, "/content.css"]} as unknown as AttachOptions
  expect(withDefaultTheme(base).stylesheets).toEqual([link, "/content.css"])
  expect(withDefaultTheme({...base, theme: "/custom.css"}).stylesheets).toEqual(["/custom.css", "/content.css"])
})

test("browser bundles the theme as a real stylesheet asset, not injected CSS text", async () => {
  const built = await Bun.build({entrypoints: [new URL("../src/default-theme.ts", import.meta.url).pathname],
    target: "browser", publicPath: "/assets/"})
  expect(built.success).toBe(true)
  const css = built.outputs.find(output => output.path.endsWith(".css"))
  expect(css).toBeDefined()
  expect(await css!.text()).toBe(await Bun.file(new URL("../../ui/themes/theme.css", import.meta.url)).text())
  const javascript = await built.outputs.find(output => output.path.endsWith(".js"))!.text()
  expect(javascript).not.toContain("--widget-popup-background:")
  expect(javascript).toContain("/assets/")
})
