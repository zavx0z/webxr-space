import {describe, expect, test} from "bun:test"
import {Event, type HTMLButtonElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {
  HudFrame,
  HudWindow,
  Timeline,
  timelineDefaultProps
} from "./hud.tsx"
import {HudFrameFixture, HudWindowFixture} from "./hud-consumer-fixture.tsx"
import {createDocument} from "./test-document.ts"

describe("compiled production HUD compositions", () => {
  test("HudWindow retains keyed actions and authored Pane body while minimizing", () => {
    expect(isCompiledTemplate(HudWindow)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const actions = [
      {key: "pin", label: "Pin", disabled: false},
      {key: "close", label: "Close", disabled: false}
    ]
    root.render(HudWindowFixture as any, {title: "Output", subtitle: "HUD", active: true, minimized: false, actions})
    const owner = host.querySelector("section")!
    const header = owner.querySelector("header")!
    const headerChildren = [...header.childNodes].filter(node => node.nodeType === 1) as import("@zavx0z/dom").Element[]
    const bodyPane = owner.querySelector("section section")!
    const pin = [...owner.querySelectorAll("button")].find(button => button.textContent === "Pin")!
    const minimize = [...owner.querySelectorAll("button")].find(button => button.getAttribute("title") === "Minimize") as HTMLButtonElement
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 800, height: 400}})
    const frame = renderer.flush()
    const headerBox = frame.boxByNode.get(header)!
    expect(headerChildren.every(child => {
      const box = frame.boxByNode.get(child)!
      return box.x >= headerBox.contentX && box.x + box.width <= headerBox.contentX + headerBox.contentWidth
    })).toBe(true)
    renderer.dispose()
    minimize.click()
    expect(minimize.textContent).toBe("+")
    expect(minimize.title).toBe("Restore")
    const body = [...owner.querySelectorAll("section")].find(section => section.id === minimize.getAttribute("aria-controls"))!
    expect(body.hasAttribute("hidden")).toBe(true)
    expect(owner.querySelector("section section")).toBe(bodyPane)

    root.render(HudWindowFixture as any, {
      title: "Output",
      subtitle: "HUD",
      active: false,
      minimized: false,
      actions: [actions[1]!, actions[0]!]
    })
    expect(host.querySelector("section")).toBe(owner)
    expect([...owner.querySelectorAll("button")].find(button => button.textContent === "Pin")).toBe(pin)
    expect(owner.className).toBe("")
    root.unmount()
  })

  test("HudFrame composes its body and emits retained keyed handle intent", () => {
    expect(isCompiledTemplate(HudFrame)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const events: string[] = []
    root.render(HudFrameFixture as any, {
      title: "Frame",
      edge: "right",
      handles: [{key: "move", label: "Move", disabled: false}],
      onHandle: (key: string) => events.push(key)
    })
    const move = [...host.querySelectorAll("button")].find(button => button.textContent === "Move") as HTMLButtonElement
    const owner = host.querySelector("section")!
    const edge = owner.querySelector('[aria-hidden="true"]')!
    move.dispatchEvent(new Event("click", {bubbles: true}))
    expect(events).toEqual(["move"])
    expect(host.textContent).toContain("Frame body")
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 360, height: 200}
    })
    expect(renderer.flush().boxByNode.get(edge)?.width).toBe(1)
    renderer.dispose()
    root.unmount()
  })

  test("Timeline retains keyed summary points and keeps scene markers in a separate row", () => {
    expect(isCompiledTemplate(Timeline)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const keyframes = timelineDefaultProps.keyframes!
    root.render(Timeline as any, {...timelineDefaultProps, keyframes})
    const current = host.querySelector('[data-keyframe-key="current"]')!
    const sceneMarker = host.querySelector('[data-marker-key="review"]')!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 720, height: 240}
    })
    const currentButton = current.querySelector("button")!
    const beforeX = renderer.flush().boxByNode.get(currentButton)!.x
    root.render(Timeline as any, {
      ...timelineDefaultProps,
      frameCurrent: 75,
      keyframes: [
        {...keyframes[1]!, frame: 90},
        keyframes[0]!,
        keyframes[2]!
      ]
    })
    expect(host.querySelector('[data-keyframe-key="current"]')).toBe(current)
    expect(host.querySelector('[data-marker-key="review"]')).toBe(sceneMarker)
    expect(renderer.flush().boxByNode.get(currentButton)!.x).toBeGreaterThan(beforeX)
    expect(host.querySelector('[aria-label="Summary keyframes"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="Timeline markers"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="Timeline transport"]')).toBeNull()
    expect(host.querySelector("section")!.className).toBe("")
    renderer.dispose()
    root.unmount()
  })

  test("preserves exact HUD geometry and class-free owner sheets", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(Timeline as any, timelineDefaultProps)
    const owner = host.querySelector("section")!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 720, height: 240}
    })
    expect(renderer.flush().boxByNode.get(owner)?.width).toBe(640)
    renderer.dispose()
    root.unmount()
  })

  test("rejects malformed keyed Timeline data before replacing the committed owner", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(Timeline as any, timelineDefaultProps)
    const owner = host.querySelector("section")
    expect(() => root.render(Timeline as any, {
      ...timelineDefaultProps,
      keyframes: [{key: "", frame: 1, label: "Broken"}]
    })).toThrow("keyframe key must not be empty")
    expect(host.querySelector("section")).toBe(owner)
    expect(() => root.render(Timeline as any, {
      ...timelineDefaultProps,
      keyframes: [{key: "bad", frame: Number.NaN, label: "Broken"}]
    })).toThrow("frame must be finite")
    expect(host.querySelector("section")).toBe(owner)
    root.unmount()
  })
})
