import {expect} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, MouseEvent} from "@zavx0z/dom"
import {createSpaceElementFactories} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {PARAMETER_EXAMPLES, parameterFixture, type ParameterMechanism} from "./parameter.fixture.ts"

const workspace = resolve(import.meta.dir, "../../../..")
Bun.plugin(createTemplateJsxBunPlugin({
  cwd: workspace,
  persistent: true,
  sourceRoots: [resolve(workspace, "nodes/parameters"), resolve(workspace, "nodes/sockets"), resolve(workspace, "ui")],
}))
const {Parameter, resolveProjectedParameterPresentation} = await import("@nodes/parameters/shared")

type Props = Parameters<typeof Parameter>[0]

export async function mountParameterStory(mechanism: ParameterMechanism, variant: string) {
  const parameter = parameterFixture(mechanism, variant)
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const space = document.createElement("space")
  const display = document.createElement("display")
  document.append(space)
  space.append(document.createElement("viewpoint"), display)
  const owner = document.createElement("section")
  const mount = document.createElement("div")
  const root = createRoot(mount)
  const action = document.createElement("output")
  action.setAttribute("aria-label", "Последнее действие")
  const value = document.createElement("output")
  value.setAttribute("aria-label", "Значение Parameter")
  value.textContent = JSON.stringify(parameter.value)
  const revision = document.createElement("output")
  revision.setAttribute("aria-label", "Версия Parameter")
  revision.textContent = `revision: ${parameter.revision}`
  const endpoints = variant === "input" || variant === "connected" ? [{id: "in", direction: "input" as const, side: "left" as const, parameterId: "value"}]
    : variant === "output" ? [{id: "out", direction: "output" as const, side: "right" as const, parameterId: "value"}]
      : variant === "both" || variant === "projected" ? [
        {id: "in", direction: "input" as const, side: "left" as const, parameterId: "value"},
        {id: "out", direction: "output" as const, side: "right" as const, parameterId: "value"},
      ] : []
  const render = () => root.render(Parameter as unknown as CompiledTemplate<Props>, {
    nodeId: "parameter-example",
    snapshot: parameter.snapshot(),
    sockets: endpoints,
    connectedSocketKeys: variant === "connected" ? new Set(["parameter-example\u0000in"]) : undefined,
    onInput: change,
    onChange: change,
    onSocketActivate: id => { action.textContent = `Сокет: ${id}` },
  })
  function change(input: {value: unknown}) {
    parameter.set(input.value as never)
    value.textContent = JSON.stringify(parameter.value)
    revision.textContent = `revision: ${parameter.revision}`
    action.textContent = `Изменение: ${JSON.stringify(input.value)}`
    render()
  }
  render()
  owner.append(mount, value, revision, action)
  display.append(owner)
  return {owner, document, dispose() {
    root.unmount()
    owner.remove()
    expect(display.childNodes).toHaveLength(0)
  }}
}

export async function verifyParameterMechanism(mechanism: ParameterMechanism) {
  expect(resolveProjectedParameterPresentation(parameterFixture(mechanism, "field").snapshot()).kind).toBe(mechanism)
  const variants = ["field", "input", "output", "both", "connected", "disabled", "projected"]
  if (mechanism !== "output") variants.push("readonly")
  for (const variant of variants) {
    const mounted = await mountParameterStory(mechanism, variant)
    try {
      const row = mounted.owner.querySelector('[data-parameter-id="value"]')!
      expect(row).not.toBeNull()
      expect(row.getAttribute("data-field-kind")).toBe(mechanism)
      expect(mounted.document.querySelector('[aria-label="Значение Parameter"]')?.textContent)
        .toBe(JSON.stringify(PARAMETER_EXAMPLES[mechanism].value))
      const expectedSockets = ["both", "projected"].includes(variant) ? 2
        : ["input", "output", "connected"].includes(variant) ? 1 : 0
      const sockets = row.querySelectorAll("[data-socket-id]")
      expect(sockets).toHaveLength(expectedSockets)
      expect(row.querySelector("[data-parameter-field]")?.hasAttribute("hidden")).toBe(variant === "connected")
      if (sockets.length > 0) {
        const socket = sockets[0]!
        const socketId = socket.getAttribute("data-socket-id")!
        socket.dispatchEvent(new MouseEvent("click", {bubbles: true}))
        await Promise.resolve()
        expect(mounted.document.querySelector('[aria-label="Последнее действие"]')?.textContent).toBe(`Сокет: ${socketId}`)
        expect(mounted.owner.querySelector('[data-parameter-id="value"]')).toBe(row)
        expect(row.querySelector(`[data-socket-id="${socketId}"]`)).toBe(socket)
      }
      expect(mounted.document.querySelectorAll("space")).toHaveLength(1)
      expect(mounted.document.querySelectorAll("display")).toHaveLength(1)
      expect(mounted.document.querySelectorAll("canvas")).toHaveLength(0)
    } finally { mounted.dispose() }
  }
}
