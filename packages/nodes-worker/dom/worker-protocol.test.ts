import {describe, expect, test} from "bun:test"
import {createDocument, Event} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {
  createWorkerProtocol,
  workerProtocolCss,
  type WorkerProtocolProps,
} from "./worker-protocol.ts"

const props = (generation = 1): WorkerProtocolProps => ({
  title: "Worker messages",
  generation,
  exchanges: [{
    id: "fixed",
    label: "Fixed Worker",
    executor: "@nodes/worker/fixed/executor",
    request: {type: "layout", requestId: generation, generation, graph: {nodes: []}},
    response: {type: "layout-result", requestId: generation, generation, result: {direction: "RIGHT"}},
  }],
})

describe("production DOM Worker protocol", () => {
  test("creates exact semantic request/result envelopes", () => {
    const controller = createWorkerProtocol(createDocument(), props())
    const refs = controller.exchangeRefs("fixed")!
    expect(controller.element.className).toBe("worker-dom")
    expect(controller.refs.generation.localName).toBe("select")
    expect(controller.refs.generationLabel.getAttribute("for")).toBe(controller.refs.generation.id)
    expect(refs.status.localName).toBe("output")
    expect(refs.request.localName).toBe("pre")
    expect(refs.response.localName).toBe("pre")
    expect(refs.requestText.data).toContain('"requestId": 1')
    expect(refs.responseText.data).toContain('"type": "layout-result"')
  })

  test("preserves keyed exchange and Text identities across generations", () => {
    const controller = createWorkerProtocol(createDocument(), props())
    const refs = controller.exchangeRefs("fixed")!
    const requestText = refs.requestText
    controller.update(props(7))
    expect(controller.exchangeRefs("fixed")).toBe(refs)
    expect(refs.requestText).toBe(requestText)
    expect(refs.requestText.data).toContain('"generation": 7')
    expect(controller.refs.generation.value).toBe("7")
  })

  test("leaves select events standard and state controlled", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createWorkerProtocol(document, props())
    document.appendChild(host)
    host.appendChild(controller.element)
    const events: string[] = []
    host.addEventListener("change", ({type}) => events.push(type))
    controller.refs.generation.value = "7"
    controller.refs.generation.dispatchEvent(new Event("change", {bubbles: true}))
    expect(events).toEqual(["change"])
    expect(controller.props.generation).toBe(1)
  })

  test("rejects mismatched envelopes before mutation", () => {
    const controller = createWorkerProtocol(createDocument(), props())
    const current = controller.props
    const refs = controller.exchangeRefs("fixed")
    expect(() => controller.update({...current, exchanges: [{...current.exchanges[0]!, response: {...current.exchanges[0]!.response, generation: 2}}]}))
      .toThrow("WorkerProtocol fixed response does not match its request")
    expect(controller.props).toBe(current)
    expect(controller.exchangeRefs("fixed")).toBe(refs)
  })

  test("renders standard status/messages and remains package-private", async () => {
    const document = createDocument()
    const controller = createWorkerProtocol(document, props())
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({document, root: controller.element, viewport: {width: 900, height: 620}, styleSheets: [workerProtocolCss]})
    const frame = renderer.flush()
    expect(frame.hits.get(controller.refs.generation)).toMatchObject({interactive: true, role: "combobox"})
    expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["Worker messages", "Fixed Worker", "Request", "Response"]))
    renderer.dispose()
    const source = await Bun.file(new URL("./worker-protocol.ts", import.meta.url)).text()
    for (const forbidden of ["@layout/core", "@ui/elements", "@ui/components", "@engine/core", "@zavx0z/renderer", "runFixedWorkerRequest"]) expect(source).not.toContain(forbidden)
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {exports: Record<string, unknown>}
    expect(manifest.exports["./dom/worker-protocol"]).toBeUndefined()
  })
})
