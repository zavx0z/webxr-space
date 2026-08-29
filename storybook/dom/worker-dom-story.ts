import {
  Element,
  HTMLSelectElement,
  type Document,
  type Event,
  type HTMLElement,
  type Node,
  type Text,
} from "@zavx0z/dom"
import type {NodesExternalStorySource} from "../../../../.storybook/runtime.ts"
import {
  createWorkerProtocol,
  workerProtocolCss,
  type WorkerProtocolExchangeRefs,
  type WorkerProtocolProps,
} from "../../dom/worker-protocol.ts"
import type {WorkerDomExchangeProvider} from "./worker-provider.ts"

export const WORKER_DOM_ROUTES = Object.freeze([
  "worker",
  "worker/fixed",
  "worker/fixed/default",
  "worker/adaptive",
  "worker/adaptive/default",
  "worker/dagre-layered",
  "worker/dagre-layered/default",
  "worker/coffman-graham",
  "worker/coffman-graham/default",
] as const)
export type WorkerDomRoute = typeof WORKER_DOM_ROUTES[number]

export type WorkerDomStory = Readonly<{
  element: HTMLElement
  props: WorkerProtocolProps
  exchangeRefs(id: string): WorkerProtocolExchangeRefs | null
  source(): NodesExternalStorySource
  updateGeneration(generation: number): void
  dispose(): void
}>

export async function createWorkerDomStory(
  document: Document,
  route: WorkerDomRoute,
): Promise<WorkerDomStory> {
  const providers = await loadProviders(route)
  const propsFor = (generation: number): WorkerProtocolProps => {
    const exchanges = Object.freeze(providers.map((provider) => provider.createExchange(generation)))
    return Object.freeze({
      title: route === "worker" ? "Worker · structured-clone envelopes" : `${exchanges[0]!.label} · messages`,
      generation,
      exchanges,
    })
  }
  const controller = createWorkerProtocol(document, propsFor(1))
  let disposed = false
  const updateGeneration = (generation: number): void => {
    if (disposed) throw new Error("WorkerDomStory controller is disposed")
    if (![1, 2, 7].includes(generation)) throw new RangeError(`Worker story generation is unsupported: ${generation}`)
    controller.update(propsFor(generation))
  }
  const onInput = (event: Event): void => {
    if (disposed || !(event.target instanceof HTMLSelectElement) || event.target !== controller.refs.generation) return
    updateGeneration(Number(event.target.value))
  }
  controller.element.addEventListener("change", onInput)
  return Object.freeze({
    element: controller.element,
    get props() { return controller.props },
    exchangeRefs(id) { return controller.exchangeRefs(id) },
    source() {
      return Object.freeze({
        html: serialize(controller.element),
        css: workerProtocolCss,
        typescript: providers.map((provider) => provider.source(controller.props.generation)).join("\n\n"),
      })
    },
    updateGeneration,
    dispose() {
      if (disposed) return
      disposed = true
      controller.element.removeEventListener("change", onInput)
      controller.dispose()
    },
  })
}

async function loadProviders(route: WorkerDomRoute): Promise<readonly WorkerDomExchangeProvider[]> {
  if (route === "worker") {
    const [fixed, adaptive, dagre, coffman] = await Promise.all([
      import("./providers/fixed.ts"),
      import("./providers/adaptive.ts"),
      import("./providers/dagre-layered.ts"),
      import("./providers/coffman-graham.ts"),
    ])
    return [
      fixed.fixedWorkerDomProvider,
      adaptive.adaptiveWorkerDomProvider,
      dagre.dagreLayeredWorkerDomProvider,
      coffman.coffmanGrahamWorkerDomProvider,
    ]
  }
  if (route === "worker/fixed" || route.startsWith("worker/fixed/")) {
    return [await import("./providers/fixed.ts").then(({fixedWorkerDomProvider}) => fixedWorkerDomProvider)]
  }
  if (route === "worker/adaptive" || route.startsWith("worker/adaptive/")) {
    return [await import("./providers/adaptive.ts").then(({adaptiveWorkerDomProvider}) => adaptiveWorkerDomProvider)]
  }
  if (route === "worker/dagre-layered" || route.startsWith("worker/dagre-layered/")) {
    return [await import("./providers/dagre-layered.ts").then(({dagreLayeredWorkerDomProvider}) => dagreLayeredWorkerDomProvider)]
  }
  if (route === "worker/coffman-graham" || route.startsWith("worker/coffman-graham/")) {
    return [await import("./providers/coffman-graham.ts").then(({coffmanGrahamWorkerDomProvider}) => coffmanGrahamWorkerDomProvider)]
  }
  throw new Error(`Unknown Worker DOM route: ${route}`)
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attrs = element.getAttributeNames().sort().map((name) => {
    const value = element.getAttribute(name) ?? ""
    if (["disabled", "hidden", "readonly", "selected"].includes(name) && value === "") return ` ${name}`
    return ` ${name}="${escape(value)}"`
  }).join("")
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attrs}></${element.localName}>`
  if (children.every((node) => node.nodeType === 3)) return `${indent}<${element.localName}${attrs}>${escape(element.textContent ?? "")}</${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escape((node as Text).data)}`
    : serialize(node as Element, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attrs}>\n${body}\n${indent}</${element.localName}>`
}
function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
