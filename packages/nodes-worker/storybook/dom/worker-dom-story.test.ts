import {describe, expect, test} from "bun:test"
import {createDocument, Event} from "@zavx0z/dom"
import {WORKER_DOM_ROUTES, createWorkerDomStory} from "./worker-dom-story.ts"

describe("Worker DOM family story", () => {
  test("covers every existing Worker overview and leaf", async () => {
    expect(WORKER_DOM_ROUTES).toEqual([
      "worker",
      "worker/fixed",
      "worker/fixed/default",
      "worker/adaptive",
      "worker/adaptive/default",
      "worker/dagre-layered",
      "worker/dagre-layered/default",
      "worker/coffman-graham",
      "worker/coffman-graham/default",
    ])
    for (const route of WORKER_DOM_ROUTES) {
      const story = await createWorkerDomStory(createDocument(), route)
      expect(story.element.className, route).toBe("worker-dom")
      expect(story.props.exchanges.length, route).toBeGreaterThan(0)
      expect(story.props.exchanges.every(({request, response}) =>
        request.type === "layout" && response.type === "layout-result" &&
        request.requestId === response.requestId && request.generation === response.generation), route).toBeTrue()
      story.dispose()
    }
  })

  test("aggregates four exact executors only on the Worker overview", async () => {
    const story = await createWorkerDomStory(createDocument(), "worker")
    expect(story.props.exchanges.map(({id}) => id)).toEqual([
      "fixed", "adaptive", "dagre-layered", "coffman-graham",
    ])
    expect(story.props.exchanges.find(({id}) => id === "adaptive")?.response)
      .toHaveProperty("diagnostics")
    const source = story.source().typescript
    for (const owner of ["fixed", "adaptive", "top-down", "coffman-graham"]) expect(source).toContain(`@nodes/worker/${owner}/executor`)
  })

  test("loads one exact executor for policy overview and leaf", async () => {
    for (const route of ["worker/fixed", "worker/fixed/default"] as const) {
      const story = await createWorkerDomStory(createDocument(), route)
      expect(story.props.exchanges.map(({id}) => id)).toEqual(["fixed"])
      expect(story.source().typescript).toContain('@nodes/worker/fixed/executor')
      expect(story.source().typescript).not.toContain("@nodes/worker/adaptive/executor")
    }
  })

  test("controls generation through standard select events with stable refs", async () => {
    const story = await createWorkerDomStory(createDocument(), "worker/adaptive/default")
    const refs = story.exchangeRefs("adaptive")!
    const select = story.element.querySelector("select") as import("@zavx0z/dom").HTMLSelectElement
    select.value = "7"
    select.dispatchEvent(new Event("change", {bubbles: true}))
    expect(story.props.generation).toBe(7)
    expect(story.props.exchanges[0]).toMatchObject({
      request: {requestId: 7, generation: 7},
      response: {requestId: 7, generation: 7, type: "layout-result"},
    })
    expect(story.exchangeRefs("adaptive")).toBe(refs)
    expect(refs.requestText.data).toContain('"generation": 7')
    expect(story.source().typescript).toContain("requestId: 7")
  })

  test("keeps exact providers private and free of retained owners", async () => {
    const routeSource = await Bun.file(new URL("./worker-dom-story.ts", import.meta.url)).text()
    for (const provider of ["fixed", "adaptive", "dagre-layered", "coffman-graham"]) {
      expect(routeSource).toContain(`import("./providers/${provider}.ts")`)
    }
    for (const forbidden of ["@layout/core", "@ui/elements", "@ui/components", "CodeEditor", "Pane(", "UiSurface"]) expect(routeSource).not.toContain(forbidden)
    const owners = {fixed: "fixed", adaptive: "adaptive", "dagre-layered": "top-down", "coffman-graham": "coffman-graham"} as const
    for (const [provider, owner] of Object.entries(owners)) {
      const source = await Bun.file(new URL(`./providers/${provider}.ts`, import.meta.url)).text()
      expect(source).toContain(`from "@nodes/worker/${owner}/executor"`)
      for (const other of Object.values(owners)) if (other !== owner) {
        expect(source).not.toContain(`from "@nodes/worker/${other}/executor"`)
      }
    }
  })
})
