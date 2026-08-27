import {describe, expect, test} from "bun:test"
import {createDocument, Event, PointerEvent} from "@zavx0z/dom"
import {
  createHudFrameStory,
  createHudTimelineStory,
  createHudWindowStory,
  hudFrameStoryDefaultArgs,
  hudStoriesCss,
  hudTimelineStoryDefaultArgs,
  hudWindowStoryDefaultArgs,
  type HudTimelineStoryArgs,
  type HudWindowStoryArgs,
} from "./hud-stories.ts"

describe("DOM-only HUD stories", () => {
  test("creates semantic Window structure and preserves keyed actions", () => {
    const story = createHudWindowStory(createDocument())
    const {root, header, actionNav, minimizeButton, body, actionButtons} = story.refs

    expect(story.element).toBe(root)
    expect(root.localName).toBe("section")
    expect(header.localName).toBe("header")
    expect(actionNav.localName).toBe("nav")
    expect(minimizeButton.localName).toBe("button")
    expect(body.localName).toBe("section")
    expect(actionButtons.size).toBe(2)
    expect(root.className).toContain("--active")
    expect(story.args).toEqual(hudWindowStoryDefaultArgs)

    const pin = actionButtons.get("pin")!
    const close = actionButtons.get("close")!
    story.update({
      title: "Console",
      subtitle: "Output stream",
      active: false,
      minimized: true,
      actions: [
        {key: "close", label: "Dismiss", disabled: false},
        {key: "pin", label: "Pinned", disabled: true},
        {key: "copy", label: "Copy", disabled: false},
      ],
    })
    expect(story.refs.actionButtons.get("pin")).toBe(pin)
    expect(story.refs.actionButtons.get("close")).toBe(close)
    expect([...actionNav.children]).toEqual([close, pin, story.refs.actionButtons.get("copy")!])
    expect(pin.disabled).toBeTrue()
    expect(pin.textContent).toBe("Pinned")
    expect(body.hasAttribute("hidden")).toBeTrue()
    expect(root.className).toBe("ui-hud-window-story")
  })

  test("creates semantic Frame structure and preserves keyed handles", () => {
    const story = createHudFrameStory(createDocument())
    const {root, header, handleNav, handleButtons} = story.refs
    const move = handleButtons.get("move")!
    const dock = handleButtons.get("dock")!

    expect(root.localName).toBe("section")
    expect(header.localName).toBe("header")
    expect(handleNav.localName).toBe("nav")
    expect(root.getAttribute("data-edge")).toBe("right")
    expect(story.args).toEqual(hudFrameStoryDefaultArgs)

    story.update({
      title: "Docked frame",
      edge: "left",
      handles: [
        {key: "dock", label: "Dock left", disabled: false},
        {key: "move", label: "Move", disabled: false},
      ],
    })
    expect(story.refs.handleButtons.get("move")).toBe(move)
    expect(story.refs.handleButtons.get("dock")).toBe(dock)
    expect([...handleNav.children]).toEqual([dock, move])
    expect(root.getAttribute("data-edge")).toBe("left")
  })

  test("creates semantic Timeline time/transport/list and preserves keyed tracks/markers", () => {
    const story = createHudTimelineStory(createDocument())
    const {root, currentTime, playButton, trackElements, markerTimes} = story.refs
    const outputTrack = trackElements.get("output")!
    const eventsTrack = trackElements.get("events")!
    const currentMarker = markerTimes.get("output/current")!
    const eventMarker = markerTimes.get("events/event")!
    const playText = playButton.firstChild

    expect(root.localName).toBe("section")
    expect(root.firstElementChild?.localName).toBe("header")
    expect(currentTime.localName).toBe("time")
    expect(currentTime.getAttribute("datetime")).toBe("50")
    expect(playButton.localName).toBe("button")
    expect(trackElements.size).toBe(2)
    expect(markerTimes.size).toBe(3)
    expect(story.args).toEqual(hudTimelineStoryDefaultArgs)

    story.update({
      title: "Causal timeline",
      min: 0,
      max: 100,
      current: 75,
      playing: true,
      tracks: [
        {key: "events", label: "Event stream", markers: [
          {key: "event", tick: 80, label: "Updated event", selected: true},
        ]},
        {key: "output", label: "Output stream", markers: [
          {key: "current", tick: 75, label: "Current output", selected: true},
          {key: "start", tick: 10, label: "Start", selected: false},
        ]},
      ],
    })
    expect(story.refs.trackElements.get("output")).toBe(outputTrack)
    expect(story.refs.trackElements.get("events")).toBe(eventsTrack)
    expect(story.refs.markerTimes.get("output/current")).toBe(currentMarker)
    expect(story.refs.markerTimes.get("events/event")).toBe(eventMarker)
    expect([...root.lastElementChild!.children]).toEqual([eventsTrack, outputTrack])
    expect(currentTime.getAttribute("datetime")).toBe("75")
    expect(playButton.getAttribute("aria-pressed")).toBe("true")
    expect(playButton.textContent).toBe("Pause")
    expect(playButton.firstChild).toBe(playText)
    expect(currentMarker.textContent).toBe("Current output")
    expect(currentMarker.parentElement?.getAttribute("aria-current")).toBe("true")
  })

  test("keeps standard click/pointer events bubbling and does not fabricate updates", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const windowStory = createHudWindowStory(document)
    const frameStory = createHudFrameStory(document)
    const timeline = createHudTimelineStory(document)
    document.appendChild(host)
    host.append(windowStory.element, frameStory.element, timeline.element)
    const events: Array<[string, unknown]> = []
    host.addEventListener("click", (event) => events.push([event.type, event.target]))
    host.addEventListener("pointerdown", (event) => events.push([event.type, event.target]))

    windowStory.update({...windowStory.args, active: false})
    frameStory.update({...frameStory.args, edge: "top"})
    timeline.update({...timeline.args, playing: true})
    expect(events).toEqual([])

    windowStory.refs.actionButtons.get("close")?.click()
    frameStory.refs.handleButtons.get("move")?.dispatchEvent(new PointerEvent("pointerdown", {bubbles: true}))
    timeline.refs.playButton.click()
    expect(events.map(([type]) => type)).toEqual(["click", "pointerdown", "click"])
    expect(events[0]?.[1]).toBe(windowStory.refs.actionButtons.get("close"))
    expect(events[1]?.[1]).toBe(frameStory.refs.handleButtons.get("move"))
    expect(events[2]?.[1]).toBe(timeline.refs.playButton)
  })

  test("rejects duplicate keys and invalid Timeline ranges before mutation", () => {
    const windowStory = createHudWindowStory(createDocument())
    const timeline = createHudTimelineStory(createDocument())
    const windowChildren = [...windowStory.refs.actionNav.childNodes]
    const timelineTracks = [...timeline.element.lastElementChild!.childNodes]
    const windowArgs = windowStory.args
    const timelineArgs = timeline.args
    const duplicateWindow: HudWindowStoryArgs = {...windowStory.args, actions: [
      {key: "same", label: "A", disabled: false},
      {key: "same", label: "B", disabled: false},
    ]}
    const badTimeline: HudTimelineStoryArgs = {...timeline.args, max: 0}

    expect(() => windowStory.update(duplicateWindow)).toThrow("HUD Window action key must be unique: same")
    expect(() => timeline.update(badTimeline)).toThrow("HUD Timeline max must be greater than min")
    expect(() => timeline.update({...timeline.args, tracks: [{key: "output", label: "Output", markers: [
      {key: "outside", tick: 101, label: "Outside", selected: false},
    ]}]})).toThrow("HUD Timeline marker is outside the range: output/outside")
    expect(windowStory.refs.actionNav.childNodes).toEqual(windowChildren)
    expect(timeline.element.lastElementChild!.childNodes).toEqual(timelineTracks)
    expect(windowStory.args).toBe(windowArgs)
    expect(timeline.args).toBe(timelineArgs)
  })

  test("derives live semantic HTML, flat CSS and direct DOM TypeScript", () => {
    const document = createDocument()
    const windowStory = createHudWindowStory(document)
    const frameStory = createHudFrameStory(document)
    const timeline = createHudTimelineStory(document)
    windowStory.element.setAttribute("data-source-proof", "live")

    for (const story of [windowStory, frameStory, timeline]) {
      expect(story.source.css).toBe(hudStoriesCss)
      expect(story.source.html).toContain("<section")
      expect(story.source.html).toContain("<header")
      expect(story.source.typescript).toContain('document.createElement("section")')
      expect(story.source.typescript).toContain('document.createElement("header")')
      expect(story.source.typescript).not.toContain("surface")
    }
    expect(windowStory.source.html).toContain('data-source-proof="live"')
    expect(windowStory.source.typescript).toContain('document.createElement("nav")')
    expect(frameStory.source.typescript).toContain('document.createElement("button")')
    expect(timeline.source.html).toContain("<time")
    expect(timeline.source.html).toContain("<ul")
    expect(timeline.source.html).toContain("<li")
    expect(timeline.source.typescript).toContain('document.createElement("time")')
    expect(timeline.source.typescript).toContain('document.createElement("ul")')
  })

  test("keeps exact owner boundary independent from old HUD and retained imports", async () => {
    const source = await Bun.file(new URL("./hud-stories.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {exports: Record<string, string>}

    expect(hudStoriesCss).toContain("display: flex")
    expect(hudStoriesCss).toContain("flex-direction: column")
    expect(hudStoriesCss).toContain("gap: 8px")
    expect(hudStoriesCss).not.toContain("calc(")
    expect(hudStoriesCss).not.toContain("&")
    for (const forbidden of ["UiSurface", "@engine/core", "@layout/core", "@ui/elements", "@ui/hud", "@zavx0z/renderer", ["@zavx0z", "storybook"].join("/"), "../window", "../timeline", "../pane-frame", "dispatchEvent", "__componentsStoryControlBridge"]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).not.toMatch(/\b(?:x|y|width|height): number\b/)
    expect(manifest.exports["./dom/hud-stories"]).toBeUndefined()
    expect(requirements).toContain("UI-DOM-HUD-STORIES-001")
  })
})
