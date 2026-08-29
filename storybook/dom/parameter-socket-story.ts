import {
  Element,
  HTMLInputElement,
  HTMLSelectElement,
  type Document,
  type Event,
  type HTMLElement,
  type Node,
  type Text,
} from "@zavx0z/dom"
import type {NodesExternalStorySource} from "../../../../.storybook/runtime.ts"
import {
  createParameterSocket,
  parameterSocketCss,
  type ParameterControlRefs,
  type ParameterSocketProps,
  type ParameterSocketRefs,
} from "../../dom/parameter-socket.ts"

export type ParameterSocketStory = Readonly<{
  element: HTMLElement
  refs: ParameterSocketRefs
  props: ParameterSocketProps
  parameterRefs(id: string): ParameterControlRefs | null
  update(props: ParameterSocketProps): void
  source(): NodesExternalStorySource
  dispose(): void
}>

export const parameterSocketStoryDefaultProps: ParameterSocketProps = Object.freeze({
  title: "Parameter · Text · Both",
  width: 420,
  parameters: Object.freeze([
    Object.freeze({
      id: "text",
      fieldKind: "text",
      variant: "both" as const,
      label: "Текст",
      title: "Текстовый Parameter",
      value: "Output",
      checked: false,
      type: "text" as const,
      options: Object.freeze([]),
      placeholder: "",
      min: "",
      max: "",
      step: "",
      controlVisible: true,
      connected: false,
      disabled: false,
      readOnly: false,
      sockets: Object.freeze([
        Object.freeze({
          id: "text-input",
          side: "left" as const,
          kind: "string",
          direction: "input" as const,
          label: "Вход",
          title: "Input Socket",
          selected: false,
          disabled: false,
        }),
        Object.freeze({
          id: "text-output",
          side: "right" as const,
          kind: "string",
          direction: "output" as const,
          label: "Выход",
          title: "Output Socket",
          selected: true,
          disabled: false,
        }),
      ]),
    }),
  ]),
})

export function createParameterSocketStory(
  document: Document,
  initialProps: ParameterSocketProps = parameterSocketStoryDefaultProps,
): ParameterSocketStory {
  const controller = createParameterSocket(document, initialProps)
  let disposed = false

  const update = (props: ParameterSocketProps): void => {
    if (disposed) throw new Error("ParameterSocketStory controller is disposed")
    controller.update(props)
  }
  const onInput = (event: Event): void => {
    if (disposed || !(event.target instanceof HTMLInputElement)) return
    const input = event.target
    const row = input.closest(".parameter-socket__row")
    const parameterId = row?.getAttribute("data-parameter-id")
    if (!parameterId || controller.parameterRefs(parameterId)?.input !== input) return
    const current = controller.props
    update({
      ...current,
      parameters: current.parameters.map((parameter) => parameter.id === parameterId
        ? {
            ...parameter,
            value: input.type === "checkbox" ? String(input.checked) : input.value,
            checked: input.checked,
          }
        : parameter),
    })
  }
  const onChange = (event: Event): void => {
    if (disposed || !(event.target instanceof HTMLSelectElement)) return
    const select = event.target
    const row = select.closest(".parameter-socket__row")
    const parameterId = row?.getAttribute("data-parameter-id")
    if (!parameterId || controller.parameterRefs(parameterId)?.select !== select) return
    const current = controller.props
    update({
      ...current,
      parameters: current.parameters.map((parameter) => parameter.id === parameterId
        ? {...parameter, value: select.value}
        : parameter),
    })
  }
  const onClick = (event: Event): void => {
    if (disposed || event.defaultPrevented || !(event.target instanceof Element)) return
    const button = event.target.closest(".parameter-socket__socket")
    const row = button?.closest(".parameter-socket__row")
    const parameterId = row?.getAttribute("data-parameter-id")
    const socketId = button?.getAttribute("data-socket-id")
    if (!parameterId || !socketId || !controller.parameterRefs(parameterId)?.socketRefs(socketId)) return
    const current = controller.props
    update({
      ...current,
      parameters: current.parameters.map((parameter) => ({
        ...parameter,
        sockets: parameter.sockets.map((socket) => ({
          ...socket,
          selected: parameter.id === parameterId && socket.id === socketId,
        })),
      })),
    })
  }

  controller.refs.list.addEventListener("input", onInput)
  controller.refs.list.addEventListener("change", onChange)
  controller.refs.list.addEventListener("click", onClick)

  return Object.freeze({
    element: controller.element,
    refs: controller.refs,
    get props() { return controller.props },
    parameterRefs(id) { return controller.parameterRefs(id) },
    update,
    source() {
      return Object.freeze({
        html: serializeElement(controller.element),
        css: parameterSocketCss,
        typescript: renderTypeScript(controller.props),
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      controller.refs.list.removeEventListener("input", onInput)
      controller.refs.list.removeEventListener("change", onChange)
      controller.refs.list.removeEventListener("click", onClick)
      controller.dispose()
    },
  })
}

function renderTypeScript(props: ParameterSocketProps): string {
  return [
    'import {Element, HTMLInputElement, HTMLSelectElement, createDocument} from "@zavx0z/dom"',
    'import {createParameterSocket} from "../../dom/parameter-socket.ts"',
    "",
    "const document = createDocument()",
    `const props = ${JSON.stringify(props, null, 2)} as const`,
    "const controller = createParameterSocket(document, props)",
    'controller.refs.list.addEventListener("input", (event) => {',
    "  if (!(event.target instanceof HTMLInputElement)) return",
    '  const id = event.target.closest(".parameter-socket__row")?.getAttribute("data-parameter-id")',
    "  if (!id) return",
    "  const current = controller.props",
    "  controller.update({...current, parameters: current.parameters.map((parameter) =>",
    "    parameter.id === id ? {...parameter,",
    '      value: event.target.type === "checkbox" ? String(event.target.checked) : event.target.value,',
    "      checked: event.target.checked,",
    "    } : parameter",
    "  )})",
    "})",
    'controller.refs.list.addEventListener("change", (event) => {',
    "  if (!(event.target instanceof HTMLSelectElement)) return",
    '  const id = event.target.closest(".parameter-socket__row")?.getAttribute("data-parameter-id")',
    "  if (!id) return",
    "  const current = controller.props",
    "  controller.update({...current, parameters: current.parameters.map((parameter) =>",
    "    parameter.id === id ? {...parameter, value: event.target.value} : parameter",
    "  )})",
    "})",
    'controller.refs.list.addEventListener("click", (event) => {',
    "  if (event.defaultPrevented || !(event.target instanceof Element)) return",
    '  const button = event.target.closest(".parameter-socket__socket")',
    '  const parameterId = button?.closest(".parameter-socket__row")?.getAttribute("data-parameter-id")',
    '  const socketId = button?.getAttribute("data-socket-id")',
    "  if (!parameterId || !socketId) return",
    "  const current = controller.props",
    "  controller.update({...current, parameters: current.parameters.map((parameter) => ({",
    "    ...parameter,",
    "    sockets: parameter.sockets.map((socket) => ({",
    "      ...socket,",
    "      selected: parameter.id === parameterId && socket.id === socketId,",
    "    })),",
    "  }))})",
    "})",
    "document.appendChild(controller.element)",
  ].join("\n")
}

function serializeElement(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map((name) => {
    const value = element.getAttribute(name) ?? ""
    if ((name === "disabled" || name === "readonly") && value === "") return ` ${name}`
    return ` ${name}="${escapeAttribute(value)}"`
  }).join("")
  if (element.localName === "input") return `${indent}<input${attributes}>`
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  if (children.every((node) => node.nodeType === 3)) {
    return `${indent}<${element.localName}${attributes}>${escapeText(element.textContent ?? "")}</${element.localName}>`
  }
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeText((node as Text).data)}`
    : serializeElement(node as Element, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;")
}
