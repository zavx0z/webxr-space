import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot, type ComponentRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {Badge, badgeCss} from "./badge.tsx"
import {Divider, dividerCss} from "./divider.tsx"
import {Pane, paneCss} from "./pane.tsx"
import {Typography, typographyCss} from "./typography.tsx"
import {PaneComposition} from "./pane-children-consumer-fixture.tsx"

describe("compiled production visual primitives", () => {
  test("retains Pane root and primitive Text while applying caller style last", () => {
    expect(isCompiledTemplate(Pane)).toBe(true)
    const mounted = mount()
    mounted.root.render(Pane as any, {
      content: "Panel",
      variant: "filled",
      active: true,
      title: "Panel",
      style: {padding: 10, background: "#123456"}
    })
    const pane = mounted.host.querySelector("section") as import("@zavx0z/dom").HTMLElement
    const text = pane.firstChild

    expect(pane.className).toBe("")
    expect(pane.title).toBe("Panel")
    expect(pane.textContent).toBe("Panel")
    expect(pane.getAttribute("style")).toBe("padding: 10px; background: #123456")

    mounted.root.render(Pane as any, {content: 42, variant: "transparent"})
    expect(mounted.host.querySelector("section")).toBe(pane)
    expect(pane.firstChild).toBe(text)
    expect(pane.textContent).toBe("42")
    mounted.root.unmount()
  })

  test("composes authored children through one direct retained child slot", () => {
    const mounted = mount()
    mounted.root.render(PaneComposition as any, {label: "First"})
    const pane = mounted.host.querySelector("section")!
    const child = pane.querySelector('[data-pane-child="true"]')!
    const text = child.firstChild
    mounted.root.render(PaneComposition as any, {label: "Second"})
    expect(mounted.host.querySelector("section")).toBe(pane)
    expect(pane.querySelector('[data-pane-child="true"]')).toBe(child)
    expect(child.firstChild).toBe(text)
    expect(child.textContent).toBe("Second")
    mounted.root.unmount()
  })

  test("retains Badge root and Text across tone changes", () => {
    expect(isCompiledTemplate(Badge)).toBe(true)
    const mounted = mount()
    mounted.root.render(Badge as any, {
      label: "Ready",
      tone: "success",
      title: "Status",
      style: {padding: "1px 5px", background: "#234567"}
    })
    const badge = mounted.host.querySelector("span") as import("@zavx0z/dom").HTMLSpanElement
    const text = badge.firstChild

    expect(badge.className).toBe("")
    expect(badge.title).toBe("Status")
    expect(badge.textContent).toBe("Ready")
    expect(badge.getAttribute("style")).toBe("padding: 1px 5px; background: #234567")

    mounted.root.render(Badge as any, {label: "Waiting", tone: "warning"})
    expect(mounted.host.querySelector("span")).toBe(badge)
    expect(badge.firstChild).toBe(text)
    expect(badge.textContent).toBe("Waiting")
    mounted.root.unmount()
  })

  test("retains Typography text and preserves variant rhythm", () => {
    expect(isCompiledTemplate(Typography)).toBe(true)
    const mounted = mount()
    mounted.root.render(Typography as any, {
      text: "Heading",
      variant: "title",
      style: {fontSize: 17, color: "#abcdef"}
    })
    const typography = mounted.host.querySelector("span") as import("@zavx0z/dom").HTMLSpanElement
    const text = typography.firstChild

    expect(typography.className).toBe("")
    expect(typography.getAttribute("style")).toBe("font-size: 17px; color: #abcdef")
    mounted.root.render(Typography as any, {text: "Caption", variant: "caption"})
    expect(mounted.host.querySelector("span")).toBe(typography)
    expect(typography.firstChild).toBe(text)
    expect(typography.textContent).toBe("Caption")
    mounted.root.unmount()
  })

  test("retains Divider and resolves exact inset geometry", () => {
    expect(isCompiledTemplate(Divider)).toBe(true)
    const mounted = mount()
    mounted.root.render(Divider as any, {variant: "inset", title: "Section"})
    const divider = mounted.host.querySelector("hr") as import("@zavx0z/dom").HTMLElement
    expect(divider.className).toBe("")
    expect(divider.title).toBe("Section")

    const renderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 200, height: 60},
      styleSheets: [dividerCss]
    })
    expect(renderer.flush().boxByNode.get(divider)).toMatchObject({
      height: 1,
      margin: {left: 16}
    })
    renderer.dispose()

    mounted.root.render(Divider as any, {
      variant: "middle",
      style: {width: "50%", marginLeft: 8}
    })
    expect(mounted.host.querySelector("hr")).toBe(divider)
    expect(divider.getAttribute("style")).toBe("width: 50%; margin-left: 8px")
    mounted.root.unmount()
  })

  test("publishes only class-free owner geometry", () => {
    for (const css of [
      paneCss,
      badgeCss,
      typographyCss,
      dividerCss
    ]) expect(css).not.toContain(".ui-")

    expect(paneCss).toContain("padding:8px")
    expect(paneCss).toContain("border-radius:4px")
    expect(badgeCss).toContain("min-height:20px")
    expect(badgeCss).toContain("padding:2px 6px")
    expect(typographyCss).toContain("font-size:15px")
    expect(typographyCss).toContain("font-size:11px")
    expect(dividerCss).toContain("height:1px")
    expect(dividerCss).toContain("width:96%")
    expect(dividerCss).toContain("width:90%")
  })
})

function mount(): Readonly<{
  document: ReturnType<typeof createDocument>
  host: import("@zavx0z/dom").HTMLElement
  root: ComponentRoot
}> {
  const document = createDocument()
  const host = document.createElement("main")
  document.appendChild(host)
  return {document, host, root: createRoot(host)}
}
