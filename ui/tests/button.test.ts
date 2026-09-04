import {expect, test} from "bun:test"
import {resolve} from "node:path"

const buttonPath = resolve(import.meta.dir, "../buttons/button.tsx")

test("[UI-BUTTON-001] text Button leaves width to its content while IconButton remains size-owned square", async () => {
  const source = await Bun.file(buttonPath).text()

  expect(source).toContain('data-icon-only={String(props.iconOnly === true)}')
  expect(source).not.toContain("width: 92px;")
  expect(source).not.toContain("width: 76px;")
  expect(source).not.toContain("width: 112px;")

  expect(source).toContain('&[data-icon-only="true"] {')
  expect(source).toContain("width: var(--control-height-medium);")
  expect(source).toContain('&[data-icon-only="true"][data-size="small"] {')
  expect(source).toContain("width: var(--control-height-small);")
  expect(source).toContain('&[data-icon-only="true"][data-size="large"] {')
  expect(source).toContain("width: var(--control-height-large);")
})
