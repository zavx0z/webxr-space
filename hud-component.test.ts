import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLButtonElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {
  HudFrame,
  HudWindow,
  Timeline,
  hudComponentCss,
  timelineDefaultProps
} from "./hud-component.tsx"
import {HudFrameFixture, HudWindowFixture} from "./hud-consumer-fixture.tsx"

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
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 800, height: 400}, styleSheets: [hudComponentCss]})
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
      viewport: {width: 360, height: 200},
      styleSheets: [hudComponentCss]
    })
    expect(renderer.flush().boxByNode.get(edge)?.width).toBe(1)
    renderer.dispose()
    root.unmount()
  })

  test("Timeline retains nested keyed track and marker identities", () => {
    expect(isCompiledTemplate(Timeline)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const tracks = timelineDefaultProps.tracks
    root.render(Timeline as any, {...timelineDefaultProps, tracks})
    const output = host.querySelector('[data-track-key="output"]')!
    const current = output.querySelector('[data-marker-key="current"]')!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 720, height: 240},
      styleSheets: [hudComponentCss]
    })
    const currentButton = current.querySelector("button")!
    const beforeX = renderer.flush().boxByNode.get(currentButton)!.x
    root.render(Timeline as any, {
      ...timelineDefaultProps,
      current: 75,
      playing: true,
      tracks: [tracks[1]!, {...tracks[0]!, markers: [
        {...tracks[0]!.markers[1]!, tick: 90},
        tracks[0]!.markers[0]!
      ]}]
    })
    expect(host.querySelector('[data-track-key="output"]')).toBe(output)
    expect(output.querySelector('[data-marker-key="current"]')).toBe(current)
    expect(renderer.flush().boxByNode.get(currentButton)!.x).toBeGreaterThan(beforeX)
    expect(host.textContent).toContain("Pause")
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
      viewport: {width: 720, height: 240},
      styleSheets: [hudComponentCss]
    })
    expect(renderer.flush().boxByNode.get(owner)?.width).toBe(640)
    expect(hudComponentCss).not.toContain(".ui-")
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
      tracks: [{key: "", label: "Broken", markers: [{key: "bad", tick: Number.NaN, label: "Bad", selected: false}]}]
    })).toThrow("track key must not be empty")
    expect(host.querySelector("section")).toBe(owner)
    expect(() => root.render(Timeline as any, {
      ...timelineDefaultProps,
      tracks: [{key: "track", label: "Broken", markers: [{key: "bad", tick: Number.NaN, label: "Bad", selected: false}]}]
    })).toThrow("tick must be finite")
    expect(host.querySelector("section")).toBe(owner)
    root.unmount()
  })
})
