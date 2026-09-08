import {expect, test} from "bun:test"
import type {AttachOptions} from "../src/attach.ts"
import {defaultThemeUrl, withDefaultTheme} from "../src/default-theme.ts"

test("attach loads the application's separate default stylesheet without a source import", () => {
  const options = {canvas: {}, app: {}} as unknown as AttachOptions
  const resolved = withDefaultTheme(options)
  expect(resolved.stylesheets).toEqual([defaultThemeUrl])
  expect(options.stylesheets).toBeUndefined()
  expect(defaultThemeUrl).toBe("./theme.css")
})

test("an already declared default uses the same link while an explicit theme replaces the default", () => {
  const link = {id: "theme", link: {} as HTMLLinkElement}
  const base = {canvas: {}, app: {}, theme: link, stylesheets: ["/content.css"]} as unknown as AttachOptions
  expect(withDefaultTheme(base).stylesheets).toEqual([link, "/content.css"])
  expect(withDefaultTheme({...base, theme: "/custom.css"}).stylesheets).toEqual(["/custom.css", "/content.css"])
})

test("browser JavaScript does not bundle CSS or depend on a concrete UI theme", async () => {
  const built = await Bun.build({entrypoints: [new URL("../src/default-theme.ts", import.meta.url).pathname],
    target: "browser", publicPath: "/assets/"})
  expect(built.success).toBe(true)
  expect(built.outputs.filter(output => output.path.endsWith(".css"))).toHaveLength(0)
  const javascript = await built.outputs.find(output => output.path.endsWith(".js"))!.text()
  expect(javascript).not.toContain("--widget-popup-background:")
  expect(javascript).not.toContain("@zavx0z/ui")
  expect(javascript).toContain("./theme.css")
})
