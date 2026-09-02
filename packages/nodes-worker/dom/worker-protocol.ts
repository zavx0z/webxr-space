import type {Document, HTMLElement, HTMLSelectElement, Text} from "@zavx0z/dom"

export type WorkerProtocolMessage = Readonly<{
  type: string
  requestId: number
  generation: number
}> & Readonly<Record<string, unknown>>

export type WorkerProtocolExchange = Readonly<{
  id: string
  label: string
  executor: string
  request: WorkerProtocolMessage
  response: WorkerProtocolMessage
}>

export type WorkerProtocolProps = Readonly<{
  title: string
  generation: number
  exchanges: readonly WorkerProtocolExchange[]
}>

export type WorkerProtocolExchangeRefs = Readonly<{
  item: HTMLElement
  heading: HTMLElement
  headingText: Text
  status: HTMLElement
  statusText: Text
  request: HTMLElement
  requestText: Text
  response: HTMLElement
  responseText: Text
}>

export type WorkerProtocolController = Readonly<{
  element: HTMLElement
  props: WorkerProtocolProps
  refs: Readonly<{
    root: HTMLElement
    header: HTMLElement
    headerText: Text
    generationLabel: HTMLElement
    generation: HTMLSelectElement
    messages: HTMLElement
  }>
  exchangeRefs(id: string): WorkerProtocolExchangeRefs | null
  update(props: WorkerProtocolProps): void
  dispose(): void
}>

export const workerProtocolCss = String.raw`
.worker-dom { box-sizing: border-box; display: flex; flex-direction: column; width: 820px; height: 540px; overflow: hidden; border: 1px solid #111; border-radius: 4px; background: #292929; color: #e0e0e0; }
.worker-dom__header { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 8px; height: 42px; padding: 7px 10px; background: #242424; }
.worker-dom__title { min-width: 0; flex-grow: 1; color: #7edcec; font-size: 12px; }
.worker-dom__generation-label { color: #b8b8b8; font-size: 10px; }
.worker-dom__generation { width: 72px; height: 27px; background: #1e1e1e; color: #e0e0e0; }
.worker-dom__messages { box-sizing: border-box; display: flex; flex-direction: row; flex-grow: 1; gap: 10px; min-height: 0; overflow: auto; padding: 10px; }
.worker-dom__exchange { box-sizing: border-box; display: flex; flex-direction: column; flex-shrink: 0; width: 386px; height: 476px; overflow: hidden; border: 1px solid #181818; border-radius: 4px; background: #252525; }
.worker-dom__exchange-title { box-sizing: border-box; height: 28px; padding: 6px 8px; font-size: 11px; color: #ececec; }
.worker-dom__status { box-sizing: border-box; height: 25px; padding: 5px 8px; color: #80d69a; font-size: 10px; }
.worker-dom__status[data-state="layout-error"] { color: #ef8585; }
.worker-dom__pair { box-sizing: border-box; display: flex; flex-direction: row; flex-grow: 1; gap: 8px; min-height: 0; padding: 8px; }
.worker-dom__message { box-sizing: border-box; display: flex; flex-direction: column; width: 181px; min-width: 0; overflow: hidden; }
.worker-dom__message-title { box-sizing: border-box; height: 22px; color: #9fcbd3; font-size: 10px; }
.worker-dom__code { box-sizing: border-box; flex-grow: 1; margin: 0; overflow: auto; border: 1px solid #191919; background: #1d1d1d; color: #d7d7d7; padding: 7px; font-size: 9px; line-height: 1.35; white-space: pre; }
`

let nextGenerationControlId = 1

export function createWorkerProtocol(
  document: Document,
  initialProps: WorkerProtocolProps,
): WorkerProtocolController {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const title = document.createElement("h1")
  const headerText = document.createTextNode("")
  const generationLabel = document.createElement("label")
  const generationLabelText = document.createTextNode("Generation")
  const generation = document.createElement("select")
  const messages = document.createElement("div")
  const records = new Map<string, WorkerProtocolExchangeRefs>()
  let current = normalize(initialProps)
  let disposed = false

  root.className = "worker-dom"
  header.className = "worker-dom__header"
  title.className = "worker-dom__title"
  title.appendChild(headerText)
  const generationId = `worker-dom-generation-${nextGenerationControlId++}`
  generationLabel.className = "worker-dom__generation-label"
  generationLabel.setAttribute("for", generationId)
  generationLabel.appendChild(generationLabelText)
  generation.className = "worker-dom__generation"
  generation.id = generationId
  generation.setAttribute("aria-label", "Generation")
  for (const value of [1, 2, 7]) {
    const option = document.createElement("option")
    option.value = String(value)
    option.textContent = String(value)
    generation.appendChild(option)
  }
  header.append(title, generationLabel, generation)
  messages.className = "worker-dom__messages"
  root.append(header, messages)

  const apply = (next: WorkerProtocolProps): void => document.transaction(() => {
    syncText(headerText, next.title)
    generation.value = String(next.generation)
    const ids = new Set(next.exchanges.map(({id}) => id))
    for (const [id, refs] of records) if (!ids.has(id)) {
      refs.item.remove()
      records.delete(id)
    }
    for (const exchange of next.exchanges) {
      let refs = records.get(exchange.id)
      if (!refs) {
        refs = createExchangeRefs(document, exchange.id)
        records.set(exchange.id, refs)
      }
      syncExchange(refs, exchange)
    }
    reorder(messages, next.exchanges.map(({id}) => records.get(id)!.item))
    current = next
  })

  const refs = Object.freeze({root, header, headerText, generationLabel, generation, messages})
  const controller: WorkerProtocolController = Object.freeze({
    element: root,
    refs,
    get props() { return current },
    exchangeRefs(id) { return records.get(String(id)) ?? null },
    update(props) {
      if (disposed) throw new Error("WorkerProtocol controller is disposed")
      apply(normalize(props))
    },
    dispose() { disposed = true },
  })
  apply(current)
  return controller
}

function createExchangeRefs(document: Document, id: string): WorkerProtocolExchangeRefs {
  const item = document.createElement("article")
  const heading = document.createElement("h2")
  const headingText = document.createTextNode("")
  const status = document.createElement("output")
  const statusText = document.createTextNode("")
  const pair = document.createElement("section")
  const requestSection = document.createElement("section")
  const requestTitle = document.createElement("h3")
  const request = document.createElement("pre")
  const requestCode = document.createElement("code")
  const requestText = document.createTextNode("")
  const responseSection = document.createElement("section")
  const responseTitle = document.createElement("h3")
  const response = document.createElement("pre")
  const responseCode = document.createElement("code")
  const responseText = document.createTextNode("")
  item.className = "worker-dom__exchange"
  item.setAttribute("data-exchange-id", id)
  heading.className = "worker-dom__exchange-title"
  heading.appendChild(headingText)
  status.className = "worker-dom__status"
  status.appendChild(statusText)
  pair.className = "worker-dom__pair"
  requestSection.className = "worker-dom__message"
  requestTitle.className = "worker-dom__message-title"
  requestTitle.textContent = "Request"
  request.className = "worker-dom__code"
  request.setAttribute("data-message", "request")
  requestCode.appendChild(requestText)
  request.appendChild(requestCode)
  requestSection.append(requestTitle, request)
  responseSection.className = "worker-dom__message"
  responseTitle.className = "worker-dom__message-title"
  responseTitle.textContent = "Response"
  response.className = "worker-dom__code"
  response.setAttribute("data-message", "response")
  responseCode.appendChild(responseText)
  response.appendChild(responseCode)
  responseSection.append(responseTitle, response)
  pair.append(requestSection, responseSection)
  item.append(heading, status, pair)
  return Object.freeze({item, heading, headingText, status, statusText, request, requestText, response, responseText})
}

function syncExchange(refs: WorkerProtocolExchangeRefs, exchange: WorkerProtocolExchange): void {
  syncText(refs.headingText, exchange.label)
  syncText(refs.statusText, `${exchange.response.type} · request ${exchange.request.requestId} · generation ${exchange.request.generation}`)
  syncText(refs.requestText, serialize(exchange.request))
  syncText(refs.responseText, serialize(exchange.response))
  refs.item.setAttribute("data-executor", exchange.executor)
  refs.status.setAttribute("data-state", exchange.response.type)
}

function normalize(props: WorkerProtocolProps): WorkerProtocolProps {
  if (!props || typeof props !== "object") throw new TypeError("WorkerProtocol props must be an object")
  if (typeof props.title !== "string" || !Number.isSafeInteger(props.generation) || props.generation < 0) throw new TypeError("WorkerProtocol title/generation are invalid")
  if (!Array.isArray(props.exchanges) || props.exchanges.length === 0) throw new TypeError("WorkerProtocol exchanges must be a non-empty array")
  const ids = new Set<string>()
  const exchanges = props.exchanges.map((exchange, index): WorkerProtocolExchange => {
    assertKey(exchange.id, `Worker exchange ${index}`)
    if (ids.has(exchange.id)) throw new Error(`WorkerProtocol exchange id must be unique: ${exchange.id}`)
    ids.add(exchange.id)
    if (typeof exchange.label !== "string" || typeof exchange.executor !== "string" || exchange.executor === "") throw new TypeError(`WorkerProtocol exchange ${exchange.id} metadata is invalid`)
    const request = normalizeMessage(exchange.request, `${exchange.id} request`)
    const response = normalizeMessage(exchange.response, `${exchange.id} response`)
    if (request.type !== "layout") throw new TypeError(`WorkerProtocol ${exchange.id} request type must be layout`)
    if (!["layout-result", "layout-error"].includes(response.type)) throw new TypeError(`WorkerProtocol ${exchange.id} response type is invalid`)
    if (request.requestId !== response.requestId || request.generation !== response.generation) throw new Error(`WorkerProtocol ${exchange.id} response does not match its request`)
    return Object.freeze({...exchange, request, response})
  })
  return Object.freeze({...props, exchanges: Object.freeze(exchanges)})
}

function normalizeMessage(message: WorkerProtocolMessage, label: string): WorkerProtocolMessage {
  if (!message || typeof message !== "object" || typeof message.type !== "string" || !Number.isSafeInteger(message.requestId) || !Number.isSafeInteger(message.generation)) {
    throw new TypeError(`WorkerProtocol ${label} envelope is invalid`)
  }
  serialize(message)
  return Object.freeze({...message})
}

function assertKey(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} id must be non-empty`)
}
function serialize(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2)
  if (serialized === undefined) throw new TypeError("WorkerProtocol message must be serializable")
  return serialized
}
function reorder(parent: HTMLElement, children: readonly HTMLElement[]): void {
  let reference = parent.firstChild
  for (const child of children) {
    if (child !== reference) parent.insertBefore(child, reference)
    reference = child.nextSibling
  }
}
function syncText(text: Text, value: string): void { if (text.data !== value) text.data = value }
