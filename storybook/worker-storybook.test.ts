import {describe, expect, test} from "bun:test"
import {join} from "node:path"
import {fileURLToPath} from "node:url"
import {runAdaptiveWorkerRequest} from "@nodes/worker/adaptive/executor"
import {runFixedWorkerRequest} from "@nodes/worker/fixed/executor"
import {runTopDownWorkerRequest} from "@nodes/worker/top-down/executor"
import {adaptiveWorkerFixture, fixedWorkerFixture, topDownWorkerFixture} from "./worker-fixture.ts"

const storybookRoot = fileURLToPath(new URL(".", import.meta.url))

describe("@nodes/worker package-owned storybook", () => {
  test("shows exact fixed, adaptive and top-down serializable envelopes", () => {
    const fixed = structuredClone(runFixedWorkerRequest({
      type: "layout",
      requestId: 1,
      generation: 7,
      graph: fixedWorkerFixture(),
    }))
    const adaptive = structuredClone(runAdaptiveWorkerRequest({
      type: "layout",
      requestId: 2,
      generation: 8,
      graph: adaptiveWorkerFixture(),
    }))
    const topDown = structuredClone(runTopDownWorkerRequest({
      type: "layout",
      requestId: 3,
      generation: 9,
      graph: topDownWorkerFixture(),
    }))
    expect(fixed).toMatchObject({type: "layout-result", requestId: 1, generation: 7})
    expect(adaptive).toMatchObject({type: "layout-result", requestId: 2, generation: 8})
    expect(topDown).toMatchObject({type: "layout-result", requestId: 3, generation: 9})
    if (adaptive.type === "layout-result") expect(adaptive.diagnostics.attemptedCandidates).toBeGreaterThan(0)
  })

  test("keeps the protocol detail visible on package overview and exact leaf", async () => {
    const entry = await Bun.file(join(storybookRoot, "protocol.stories.ts")).text()
    const detail = await Bun.file(join(storybookRoot, "worker-detail.ts")).text()
    const body = await Bun.file(join(storybookRoot, "worker-storybook-body.html")).text()
    expect(entry).toContain("WORKER_STORYBOOK_ROUTE_TREE")
    expect(entry).toContain('from "@zavx0z/storybook/route-tree"')
    expect(entry).toContain('from "@zavx0z/storybook/environment"')
    expect(entry).toContain('storybookPublicPath("node", WORKER_STORYBOOK_BASE_PATH)')
    expect(entry).not.toContain("@ui/storybook")
    expect(entry).toContain('await import("./worker-detail.ts")')
    expect(entry).not.toContain("runFixedWorkerRequest")
    expect(detail).toContain("runFixedWorkerRequest")
    expect(body).not.toContain('id="worker-overview"')
    expect(body).toContain('id="worker-detail"')
    expect(body).not.toContain('id="worker-detail" hidden')
  })
})
