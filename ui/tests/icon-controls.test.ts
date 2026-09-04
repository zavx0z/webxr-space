import {expect, test} from "bun:test"
import {resolve} from "node:path"

const uiRoot = resolve(import.meta.dir, "..")

test("[UI-ICONS-001] элементы управления используют SVG или Path вместо текстовых глифов", async () => {
  const [selectField, collectionField, breadcrumbs, iconAssets] = await Promise.all([
    Bun.file(resolve(uiRoot, "fields/select-field.tsx")).text(),
    Bun.file(resolve(uiRoot, "fields/collection-field.tsx")).text(),
    Bun.file(resolve(uiRoot, "navigation/breadcrumbs.tsx")).text(),
    Bun.file(resolve(uiRoot, "src/shared/icon-assets.ts")).text(),
  ])

  expect(selectField).not.toContain("data-select-field-indicator")
  expect(selectField).not.toContain("chevronDownIcon")

  expect(collectionField).not.toContain('label="↑"')
  expect(collectionField).not.toContain('label="↓"')
  expect(collectionField).toContain("iconSrc={arrowUpIcon}")
  expect(collectionField).toContain("iconSrc={arrowDownIcon}")

  expect(breadcrumbs).not.toContain("›")
  expect(breadcrumbs).toContain("src={chevronRightIcon}")

  expect(iconAssets).toContain("export const arrowUpIcon")
  expect(iconAssets).toContain("export const arrowDownIcon")
})
