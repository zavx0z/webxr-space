import {expect, test} from "bun:test"

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
