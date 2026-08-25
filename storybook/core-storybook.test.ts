import {describe, expect, test} from "bun:test"
import {join} from "node:path"
import {fileURLToPath} from "node:url"
import {createCoreRuntimeScenario} from "./core-runtime-scenario.ts"

const storyRoot = fileURLToPath(new URL(".", import.meta.url))

describe("@nodes/core package-owned stories", () => {
  test("shows Parameter, snapshot, ordered document and atomic topology without UI", () => {
    const scenario = createCoreRuntimeScenario()
    expect(scenario.tree.revision).toBe(0)
    expect(scenario.document().nodes.order).toEqual(["source"])
    expect(scenario.snapshot().nodes[0]?.parameters.map(({id}) => id)).toEqual(["gain", "value"])

    expect(scenario.setGain(2)).toBeTrue()
    expect(scenario.addParameter()).toBeTrue()
    expect(scenario.addParameter()).toBeFalse()
    expect(scenario.tree.revision).toBe(2)
    expect(scenario.tree.topologyRevision).toBe(1)
    expect(scenario.document().nodes.byId["source"]?.parameters.order).toEqual(["gain", "value", "extra"])
    expect(scenario.removeParameter()).toBeTrue()
    expect(scenario.removeParameter()).toBeFalse()
    expect(scenario.changes.map(({kind}) => kind)).toEqual(["parameter", "topology", "topology"])
  })

  test("keeps the live detail visible on package overview and exact leaf", async () => {
    const entry = await Bun.file(join(storyRoot, "live-node-tree.stories.ts")).text()
    const detail = await Bun.file(join(storyRoot, "core-detail.ts")).text()
    const body = await Bun.file(join(storyRoot, "core-storybook-body.html")).text()
    expect(entry).toContain("CORE_STORYBOOK_ROUTE_TREE")
    expect(entry).toContain('await import("./core-detail.ts")')
    expect(entry).not.toContain("createCoreRuntimeScenario")
    expect(detail).toContain("createCoreRuntimeScenario")
    expect(body).not.toContain('id="core-overview"')
    expect(body).toContain('id="core-detail"')
    expect(body).not.toContain('id="core-detail" hidden')
  })
})
