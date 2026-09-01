import {describe, expect, test} from "bun:test"
import {readdir} from "node:fs/promises"

const componentsRoot = import.meta.dir

describe("component source layout", () => {
  test("keeps component owners, specifications and TSX fixtures on one stem", async () => {
    const filenames = await readdir(componentsRoot)
    const filenameSet = new Set(filenames)
    const productionStems = new Set(filenames.flatMap(filename => {
      const match = filename.match(/^(.+)\.(?:tsx|ts|css)$/u)
      if (match === null || filename.includes(".fixture.")) return []
      return [match[1]!]
    }))

    expect(filenames.filter(filename =>
      /-(?:consumer|dedup|children-consumer|bundle)-fixture\.(?:ts|tsx)$/u.test(filename)
      || filename.endsWith("-test-support.ts")
    )).toEqual([])

    for (const filename of filenames.filter(filename => filename.endsWith(".spec.ts"))) {
      const stem = filename.slice(0, -".spec.ts".length)
      expect(productionStems.has(stem), `${filename} must specify ${stem}.tsx, ${stem}.ts or ${stem}.css`)
        .toBe(true)
    }

    for (const filename of filenames.filter(filename => filename.endsWith(".fixture.tsx"))) {
      const stem = filename.slice(0, -".fixture.tsx".length)
      expect(filenameSet.has(`${stem}.tsx`), `${filename} must exercise ${stem}.tsx`)
        .toBe(true)
    }

    for (const filename of filenames.filter(filename => filename.endsWith(".test.ts"))) {
      const stem = filename.slice(0, -".test.ts".length)
      expect(filenameSet.has(`${stem}.tsx`), `${filename} must remain cross-owner or package-level`)
        .toBe(false)
    }
  })
})
