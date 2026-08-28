import {describe, expect, test} from "bun:test"
import {
  createDocument,
  HTMLButtonElement,
  HTMLElement,
  MouseEvent,
  PointerEvent,
  Text,
} from "@zavx0z/dom"
import {
  createHudFrame,
  createHudWindow,
  createTimeline,
  hudCss,
  hudFrameDefaultProps,
  hudWindowDefaultProps,
  timelineDefaultProps,
  type HudFrameProps,
} from "./hud.ts"

describe("production DOM HUD controllers", () => {
  test("creates one stable semantic HudWindow with a consumer-owned body", () => {
    const document = createDocument()
    const controller = createHudWindow(document)
    const refs = controller.refs
    const bodyContent = document.createElement("p")
    const bodyText = document.createTextNode("Consumer content")
    bodyContent.appendChild(bodyText)
    refs.body.appendChild(bodyContent)

    expect(controller.element).toBe(refs.root)
    expect(refs.root.localName).toBe("section")
    expect(refs.header.localName).toBe("header")
    expect(refs.actionNav.localName).toBe("nav")
    expect(refs.minimizeButton).toBeInstanceOf(HTMLButtonElement)
    expect(refs.titleText).toBeInstanceOf(Text)
    expect(refs.titleText.data).toBe("Output")
    expect(refs.subtitleText.data).toBe("HUD window")
    expect(refs.root.getAttribute("data-active")).toBe("true")
    expect(refs.minimizeButton.getAttribute("aria-expanded")).toBe("true")
    expect(refs.minimizeButton.getAttribute("aria-controls")).toBe(refs.body.id)
    expect(refs.body.hasAttribute("hidden")).toBeFalse()
    expect([...refs.actionButtons.keys()]).toEqual(["pin", "close"])
    expect(controller.props).toEqual(hudWindowDefaultProps)

    const root = refs.root
    const header = refs.header
    const body = refs.body
    const titleText = refs.titleText
    controller.update({
      title: "Preview",
      subtitle: "Viewport",
      active: false,
      minimized: true,
      actions: [
        {key: "close", label: "Dismiss", disabled: true},
        {key: "pin", label: "Pin", disabled: false},
      ],
    })
    expect(controller.element).toBe(root)
    expect(controller.refs.header).toBe(header)
    expect(controller.refs.body).toBe(body)
    expect(controller.refs.titleText).toBe(titleText)
    expect(refs.titleText.data).toBe("Preview")
    expect(refs.subtitleText.data).toBe("Viewport")
    expect(refs.root.getAttribute("data-active")).toBe("false")
    expect(refs.minimizeText.data).toBe("Restore")
    expect(refs.minimizeButton.getAttribute("aria-expanded")).toBe("false")
    expect(refs.body.hasAttribute("hidden")).toBeTrue()
    expect(refs.body.childNodes).toEqual([bodyContent])
    expect(bodyContent.firstChild).toBe(bodyText)
  })

  test("preserves keyed HudWindow actions through reorder and rejects duplicates atomically", () => {
    const controller = createHudWindow(createDocument())
    const pin = controller.refs.actionButtons.get("pin")!
    const close = controller.refs.actionButtons.get("close")!
    const pinText = pin.firstChild
    const closeText = close.firstChild
    const props = controller.props

    controller.update({
      ...controller.props,
      actions: [
        {key: "close", label: "Dismiss", disabled: true},
        {key: "pin", label: "Pinned", disabled: false},
        {key: "inspect", label: "Inspect", disabled: false},
      ],
    })
    expect(controller.refs.actionButtons.get("pin")).toBe(pin)
    expect(controller.refs.actionButtons.get("close")).toBe(close)
    expect(pin.firstChild).toBe(pinText)
    expect(close.firstChild).toBe(closeText)
    expect(controller.refs.actionNav.childNodes).toEqual([
      close,
      pin,
      controller.refs.actionButtons.get("inspect")!,
    ])
    expect(pin.textContent).toBe("Pinned")
    expect(close.disabled).toBeTrue()

    const ordered = [...controller.refs.actionNav.childNodes]
    const updated = controller.props
    expect(() => controller.update({
      ...controller.props,
      actions: [
        {key: "same", label: "A", disabled: false},
        {key: "same", label: "B", disabled: false},
      ],
    })).toThrow("HudWindow action key must be unique: same")
    expect(controller.refs.actionNav.childNodes).toEqual(ordered)
    expect(controller.props).toBe(updated)
    expect(controller.props).not.toBe(props)
  })

  test("creates stable HudFrame chrome, edge state and keyed handles", () => {
    const document = createDocument()
    const controller = createHudFrame(document)
    const refs = controller.refs
    const content = document.createTextNode("Consumer frame")
    refs.body.appendChild(content)
    const move = refs.handleButtons.get("move")!
    const resize = refs.handleButtons.get("resize")!

    expect(refs.root.localName).toBe("section")
    expect(refs.header.localName).toBe("header")
    expect(refs.handleNav.localName).toBe("nav")
    expect(refs.root.getAttribute("data-edge")).toBe("right")
    expect(controller.props).toEqual(hudFrameDefaultProps)
    controller.update({
      title: "Docked frame",
      edge: "left",
      handles: [
        {key: "resize", label: "Resize frame", disabled: false},
        {key: "move", label: "Move frame", disabled: true},
      ],
    })
    expect(refs.root.getAttribute("data-edge")).toBe("left")
    expect(refs.root.getAttribute("aria-label")).toBe("Docked frame")
    expect(refs.titleText.data).toBe("Docked frame")
    expect(refs.handleButtons.get("move")).toBe(move)
    expect(refs.handleButtons.get("resize")).toBe(resize)
    expect(refs.handleNav.childNodes).toEqual([resize, move])
    expect(move.disabled).toBeTrue()
    expect(refs.body.childNodes).toEqual([content])
  })

  test("creates Timeline time/transport/list semantics from one controlled snapshot", () => {
    const controller = createTimeline(createDocument())
    const refs = controller.refs

    expect(refs.root.localName).toBe("section")
    expect(refs.currentTime.localName).toBe("time")
    expect(refs.currentTime.getAttribute("datetime")).toBe("50")
    expect(refs.currentTime.getAttribute("data-tick")).toBe("50")
    expect(refs.currentText.data).toBe("Current 50")
    expect(refs.transport.localName).toBe("nav")
    expect(refs.previousButton).toBeInstanceOf(HTMLButtonElement)
    expect(refs.playButton.getAttribute("aria-pressed")).toBe("false")
    expect(refs.playText.data).toBe("Play")
    expect(refs.nextButton).toBeInstanceOf(HTMLButtonElement)
    expect(refs.tracksList.localName).toBe("ul")
    expect([...refs.trackElements.keys()]).toEqual(["output", "events"])
    expect(refs.trackElements.get("output")?.localName).toBe("li")
    expect(refs.markerTimes.get("output/current")?.localName).toBe("time")
    expect(refs.markerTimes.get("output/current")?.getAttribute("datetime")).toBe("50")
    expect(refs.markerItems.get("output/current")?.getAttribute("aria-current")).toBe("true")
    expect(controller.props).toEqual(timelineDefaultProps)
  })

  test("preserves Timeline track and composite marker identities across reorder", () => {
    const controller = createTimeline(createDocument())
    const refs = controller.refs
    const output = refs.trackElements.get("output")!
    const events = refs.trackElements.get("events")!
    const outputText = refs.trackLabelTexts.get("output")!
    const currentItem = refs.markerItems.get("output/current")!
    const currentTime = refs.markerTimes.get("output/current")!
    const currentText = refs.markerTexts.get("output/current")!

    controller.update({
      title: "Playback",
      min: 0,
      max: 120,
      current: 75,
      playing: true,
      tracks: [
        {
          key: "events",
          label: "Scene events",
          markers: [{key: "event", tick: 90, label: "Event 90", selected: true}],
        },
        {
          key: "output",
          label: "Rendered output",
          markers: [
            {key: "current", tick: 75, label: "Current 75", selected: true},
            {key: "start", tick: 10, label: "Start", selected: false},
          ],
        },
      ],
    })

    expect(refs.trackElements.get("output")).toBe(output)
    expect(refs.trackElements.get("events")).toBe(events)
    expect(refs.trackLabelTexts.get("output")).toBe(outputText)
    expect(refs.markerItems.get("output/current")).toBe(currentItem)
    expect(refs.markerTimes.get("output/current")).toBe(currentTime)
    expect(refs.markerTexts.get("output/current")).toBe(currentText)
    expect(refs.tracksList.childNodes).toEqual([events, output])
    expect(refs.titleText.data).toBe("Playback")
    expect(refs.currentText.data).toBe("Current 75")
    expect(refs.playText.data).toBe("Pause")
    expect(refs.playButton.getAttribute("aria-pressed")).toBe("true")
    expect(currentTime.getAttribute("datetime")).toBe("75")
    expect(currentTime.getAttribute("data-tick")).toBe("75")
    expect(currentText.data).toBe("Current 75")
  })

  test("keeps standard click/pointer bubbling without changing controlled props", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const window = createHudWindow(document)
    const frame = createHudFrame(document)
    const timeline = createTimeline(document)
    document.appendChild(host)
    host.append(window.element, frame.element, timeline.element)
    const events: string[] = []
    host.addEventListener("click", (event) => events.push(`${event.type}:${(event.target as HTMLElement).localName}`))
    host.addEventListener("pointerdown", (event) => events.push(`${event.type}:${(event.target as HTMLElement).localName}`))
    const windowProps = window.props
    const frameProps = frame.props
    const timelineProps = timeline.props

    window.refs.actionButtons.get("pin")!.click()
    frame.refs.handleButtons.get("move")!.dispatchEvent(new PointerEvent("pointerdown", {bubbles: true}))
    timeline.refs.playButton.click()
    timeline.refs.markerTimes.get("output/current")!
      .dispatchEvent(new MouseEvent("click", {bubbles: true}))

    expect(events).toEqual(["click:button", "pointerdown:button", "click:button", "click:time"])
    expect(window.props).toBe(windowProps)
    expect(frame.props).toBe(frameProps)
    expect(timeline.props).toBe(timelineProps)
    expect(window.props.minimized).toBeFalse()
    expect(timeline.props.playing).toBeFalse()
    expect(timeline.refs.playButton.getAttribute("aria-pressed")).toBe("false")
  })

  test("validates controlled data atomically and disposes without removing roots", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const window = createHudWindow(document)
    const frame = createHudFrame(document)
    const timeline = createTimeline(document)
    document.appendChild(host)
    host.append(window.element, frame.element, timeline.element)
    const windowChildren = [...window.refs.actionNav.childNodes]
    const frameProps = frame.props
    const timelineProps = timeline.props

    expect(() => window.update({
      ...window.props,
      actions: [{key: "same", label: "A", disabled: false}, {key: "same", label: "B", disabled: false}],
    })).toThrow("HudWindow action key must be unique: same")
    expect(() => frame.update({...frame.props, edge: "center" as HudFrameProps["edge"]}))
      .toThrow("Unknown HudFrame edge: center")
    expect(() => timeline.update({...timeline.props, max: 0}))
      .toThrow("Timeline max must be greater than min")
    expect(() => timeline.update({
      ...timeline.props,
      tracks: [{key: "output", label: "Output", markers: [{key: "late", tick: 101, label: "Late", selected: false}]}],
    })).toThrow("Timeline marker is outside the range: output/late")
    expect(window.refs.actionNav.childNodes).toEqual(windowChildren)
    expect(frame.props).toBe(frameProps)
    expect(timeline.props).toBe(timelineProps)

    window.dispose()
    frame.dispose()
    timeline.dispose()
    expect(window.element.parentNode).toBe(host)
    expect(frame.element.parentNode).toBe(host)
    expect(timeline.element.parentNode).toBe(host)
    expect(() => window.update(window.props)).toThrow("HudWindow controller is disposed")
    expect(() => frame.update(frame.props)).toThrow("HudFrame controller is disposed")
    expect(() => timeline.update(timeline.props)).toThrow("Timeline controller is disposed")
  })

  test("keeps one flat CSS owner and one exact DOM-only production boundary", async () => {
    const source = await Bun.file(new URL("./hud.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./dom/requirements.md", import.meta.url)).text()
    const components = await Bun.file(new URL("./package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }

    expect(hudCss).toContain(".ui-hud-window")
    expect(hudCss).toContain(".ui-hud-frame")
    expect(hudCss).toContain(".ui-timeline")
    expect(hudCss).toContain('[aria-current="true"]')
    expect(hudCss).not.toContain("&")
    expect(hudCss).not.toContain("-story")
    expect(source).toContain('from "@zavx0z/dom"')
    for (const forbidden of [
      "@ui/hud",
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "@ui/components",
      "@zavx0z/renderer",
      ["@zavx0z", "storybook"].join("/"),
      "UiSurface",
      "dispatchEvent",
      "addEventListener",
      "onClick",
      "onChange",
      "Story",
      "source:",
      "hud-stories",
      "-story.ts",
    ]) expect(source).not.toContain(forbidden)
    expect(components.exports["./hud"]).toBe("./hud-component.tsx")
    expect(components.exports["./dom/hud"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-HUD-001")
  })
})
