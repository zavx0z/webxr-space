import type {
  Document,
  HTMLButtonElement,
  HTMLElement,
  Node,
  Text,
} from "@zavx0z/dom"

export type HudStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type HudWindowStoryAction = Readonly<{
  key: string
  label: string
  disabled: boolean
}>
export type HudWindowStoryArgs = Readonly<{
  title: string
  subtitle: string
  active: boolean
  minimized: boolean
  actions: readonly HudWindowStoryAction[]
}>
export type HudWindowStoryRefs = Readonly<{
  root: HTMLElement
  header: HTMLElement
  actionNav: HTMLElement
  minimizeButton: HTMLButtonElement
  body: HTMLElement
  actionButtons: ReadonlyMap<string, HTMLButtonElement>
}>
export type HudWindowDomStory = Readonly<{
  element: HTMLElement
  refs: HudWindowStoryRefs
  args: HudWindowStoryArgs
  source: HudStorySource
  update(args: HudWindowStoryArgs): void
}>

export type HudFrameEdge = "floating" | "left" | "right" | "top" | "bottom"
export type HudFrameStoryHandle = Readonly<{
  key: string
  label: string
  disabled: boolean
}>
export type HudFrameStoryArgs = Readonly<{
  title: string
  edge: HudFrameEdge
  handles: readonly HudFrameStoryHandle[]
}>
export type HudFrameStoryRefs = Readonly<{
  root: HTMLElement
  header: HTMLElement
  handleNav: HTMLElement
  handleButtons: ReadonlyMap<string, HTMLButtonElement>
}>
export type HudFrameDomStory = Readonly<{
  element: HTMLElement
  refs: HudFrameStoryRefs
  args: HudFrameStoryArgs
  source: HudStorySource
  update(args: HudFrameStoryArgs): void
}>

export type HudTimelineMarker = Readonly<{
  key: string
  tick: number
  label: string
  selected: boolean
}>
export type HudTimelineTrack = Readonly<{
  key: string
  label: string
  markers: readonly HudTimelineMarker[]
}>
export type HudTimelineStoryArgs = Readonly<{
  title: string
  min: number
  max: number
  current: number
  playing: boolean
  tracks: readonly HudTimelineTrack[]
}>
export type HudTimelineStoryRefs = Readonly<{
  root: HTMLElement
  currentTime: HTMLElement
  previousButton: HTMLButtonElement
  playButton: HTMLButtonElement
  nextButton: HTMLButtonElement
  trackElements: ReadonlyMap<string, HTMLElement>
  markerTimes: ReadonlyMap<string, HTMLElement>
}>
export type HudTimelineDomStory = Readonly<{
  element: HTMLElement
  refs: HudTimelineStoryRefs
  args: HudTimelineStoryArgs
  source: HudStorySource
  update(args: HudTimelineStoryArgs): void
}>

export const hudWindowStoryDefaultArgs: HudWindowStoryArgs = Object.freeze({
  title: "Output",
  subtitle: "HUD window",
  active: true,
  minimized: false,
  actions: Object.freeze([
    Object.freeze({key: "pin", label: "Pin", disabled: false}),
    Object.freeze({key: "close", label: "Close", disabled: false}),
  ]),
})

export const hudFrameStoryDefaultArgs: HudFrameStoryArgs = Object.freeze({
  title: "Frame",
  edge: "right",
  handles: Object.freeze([
    Object.freeze({key: "move", label: "Move", disabled: false}),
    Object.freeze({key: "resize", label: "Resize", disabled: false}),
    Object.freeze({key: "dock", label: "Dock", disabled: false}),
  ]),
})

export const hudTimelineStoryDefaultArgs: HudTimelineStoryArgs = Object.freeze({
  title: "Timeline",
  min: 0,
  max: 100,
  current: 50,
  playing: false,
  tracks: Object.freeze([
    Object.freeze({
      key: "output",
      label: "Output",
      markers: Object.freeze([
        Object.freeze({key: "start", tick: 10, label: "Start", selected: false}),
        Object.freeze({key: "current", tick: 50, label: "Current", selected: true}),
      ]),
    }),
    Object.freeze({
      key: "events",
      label: "Events",
      markers: Object.freeze([
        Object.freeze({key: "event", tick: 75, label: "Event", selected: false}),
      ]),
    }),
  ]),
})

export const hudStoriesCss = String.raw`
.ui-hud-window-story,
.ui-hud-frame-story,
.ui-hud-timeline-story {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  border: 1px solid rgb(72, 72, 72);
  border-radius: 6px;
  background: rgb(24, 28, 34);
  color: rgb(224, 224, 224);
  overflow: hidden;
}

.ui-hud-window-story { width: 360px; height: 220px; }
.ui-hud-frame-story { width: 320px; height: 180px; }
.ui-hud-timeline-story { width: 720px; height: 180px; }

.ui-hud-window-story--active { border-color: rgb(126, 220, 236); }
.ui-hud-window-story__header,
.ui-hud-frame-story__header,
.ui-hud-timeline-story__header {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 36px;
  gap: 8px;
  padding: 6px 10px;
  background: rgb(32, 36, 42);
}

.ui-hud-window-story__title,
.ui-hud-frame-story__title,
.ui-hud-timeline-story__title { display: inline; flex-grow: 1; font-size: 12px; }
.ui-hud-window-story__subtitle { display: inline; color: rgb(160, 160, 160); font-size: 10px; }
.ui-hud-window-story__actions,
.ui-hud-frame-story__handles,
.ui-hud-timeline-story__transport { display: flex; flex-direction: row; gap: 4px; }

.ui-hud-window-story button,
.ui-hud-frame-story button,
.ui-hud-timeline-story button {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 3px 8px;
  border: 1px solid rgb(72, 72, 72);
  border-radius: 4px;
  background: rgb(48, 52, 60);
  color: rgb(224, 224, 224);
  font-size: 11px;
}

.ui-hud-window-story__body,
.ui-hud-frame-story__body { display: block; flex-grow: 1; padding: 12px; }
.ui-hud-window-story [hidden] { display: none; }
.ui-hud-frame-story[data-edge="left"] { border-left-color: rgb(126, 220, 236); }
.ui-hud-frame-story[data-edge="right"] { border-right-color: rgb(126, 220, 236); }
.ui-hud-frame-story[data-edge="top"] { border-top-color: rgb(126, 220, 236); }
.ui-hud-frame-story[data-edge="bottom"] { border-bottom-color: rgb(126, 220, 236); }

.ui-hud-timeline-story__current { display: inline; color: rgb(126, 220, 236); font-size: 11px; }
.ui-hud-timeline-story__tracks {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
}
.ui-hud-timeline-story__track { display: flex; flex-direction: row; align-items: center; min-height: 28px; gap: 8px; }
.ui-hud-timeline-story__track-label { display: inline; width: 90px; font-size: 11px; }
.ui-hud-timeline-story__markers { display: flex; flex-direction: row; flex-grow: 1; gap: 6px; }
.ui-hud-timeline-story__marker { display: block; padding: 3px 6px; border-radius: 3px; background: rgb(48, 52, 60); }
.ui-hud-timeline-story__marker[aria-current="true"] { background: rgb(45, 104, 128); }
`

type TextEntry = {
  element: HTMLElement
  text: Text
}
type KeyedButtonArgs = {
  key: string
  label: string
  disabled: boolean
}
type TimelineTrackEntry = {
  element: HTMLElement
  labelText: Text
  markerList: HTMLElement
  markers: Map<string, TextEntry>
}

export function createHudWindowStory(document: Document, initialArgs: HudWindowStoryArgs = hudWindowStoryDefaultArgs): HudWindowDomStory {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const minimizeButton = document.createElement("button")
  const title = document.createElement("span")
  const titleText = document.createTextNode("")
  const subtitle = document.createElement("span")
  const subtitleText = document.createTextNode("")
  const actionNav = document.createElement("nav")
  const body = document.createElement("section")
  const bodyText = document.createTextNode("Window content")
  root.className = "ui-hud-window-story"
  header.className = "ui-hud-window-story__header"
  minimizeButton.setAttribute("type", "button")
  minimizeButton.title = "Minimize"
  minimizeButton.appendChild(document.createTextNode("Minimize"))
  title.className = "ui-hud-window-story__title"
  title.appendChild(titleText)
  subtitle.className = "ui-hud-window-story__subtitle"
  subtitle.appendChild(subtitleText)
  actionNav.className = "ui-hud-window-story__actions"
  actionNav.setAttribute("aria-label", "Window actions")
  body.className = "ui-hud-window-story__body"
  body.appendChild(bodyText)
  header.append(minimizeButton, title, subtitle, actionNav)
  root.append(header, body)
  const entries = new Map<string, TextEntry>()
  const actionButtons = new Map<string, HTMLButtonElement>()
  let currentArgs = hudWindowStoryDefaultArgs

  const update = (args: HudWindowStoryArgs): void => {
    const next = normalizeWindowArgs(args)
    root.className = next.active ? "ui-hud-window-story ui-hud-window-story--active" : "ui-hud-window-story"
    root.setAttribute("aria-label", next.title)
    if (titleText.data !== next.title) titleText.data = next.title
    if (subtitleText.data !== next.subtitle) subtitleText.data = next.subtitle
    setBoolean(body, "hidden", next.minimized)
    reconcileButtons(document, actionNav, entries, actionButtons, next.actions, "window-action")
    currentArgs = next
  }
  const refs: HudWindowStoryRefs = Object.freeze({root, header, actionNav, minimizeButton, body, actionButtons})
  const story: HudWindowDomStory = Object.freeze({element: root, refs, get args() { return currentArgs }, get source() { return hudSource(root) }, update})
  update(initialArgs)
  return story
}

export function createHudFrameStory(document: Document, initialArgs: HudFrameStoryArgs = hudFrameStoryDefaultArgs): HudFrameDomStory {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const title = document.createElement("span")
  const titleText = document.createTextNode("")
  const handleNav = document.createElement("nav")
  const body = document.createElement("section")
  root.className = "ui-hud-frame-story"
  header.className = "ui-hud-frame-story__header"
  title.className = "ui-hud-frame-story__title"
  title.appendChild(titleText)
  handleNav.className = "ui-hud-frame-story__handles"
  handleNav.setAttribute("aria-label", "Frame handles")
  body.className = "ui-hud-frame-story__body"
  body.appendChild(document.createTextNode("Frame content"))
  header.append(title, handleNav)
  root.append(header, body)
  const entries = new Map<string, TextEntry>()
  const handleButtons = new Map<string, HTMLButtonElement>()
  let currentArgs = hudFrameStoryDefaultArgs
  const update = (args: HudFrameStoryArgs): void => {
    const next = normalizeFrameArgs(args)
    root.setAttribute("data-edge", next.edge)
    root.setAttribute("aria-label", next.title)
    if (titleText.data !== next.title) titleText.data = next.title
    reconcileButtons(document, handleNav, entries, handleButtons, next.handles, "frame-handle")
    currentArgs = next
  }
  const refs: HudFrameStoryRefs = Object.freeze({root, header, handleNav, handleButtons})
  const story: HudFrameDomStory = Object.freeze({element: root, refs, get args() { return currentArgs }, get source() { return hudSource(root) }, update})
  update(initialArgs)
  return story
}

export function createHudTimelineStory(document: Document, initialArgs: HudTimelineStoryArgs = hudTimelineStoryDefaultArgs): HudTimelineDomStory {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const title = document.createElement("span")
  const titleText = document.createTextNode("")
  const currentTime = document.createElement("time")
  const currentText = document.createTextNode("")
  const transport = document.createElement("nav")
  const previousButton = button(document, "Previous")
  const playButton = button(document, "Play")
  const playText = playButton.firstChild as Text
  const nextButton = button(document, "Next")
  const tracksList = document.createElement("ul")
  root.className = "ui-hud-timeline-story"
  header.className = "ui-hud-timeline-story__header"
  title.className = "ui-hud-timeline-story__title"
  title.appendChild(titleText)
  currentTime.className = "ui-hud-timeline-story__current"
  currentTime.appendChild(currentText)
  transport.className = "ui-hud-timeline-story__transport"
  transport.setAttribute("aria-label", "Timeline transport")
  transport.append(previousButton, playButton, nextButton)
  tracksList.className = "ui-hud-timeline-story__tracks"
  tracksList.setAttribute("aria-label", "Timeline tracks")
  header.append(title, currentTime, transport)
  root.append(header, tracksList)
  const trackEntries = new Map<string, TimelineTrackEntry>()
  const trackElements = new Map<string, HTMLElement>()
  const markerTimes = new Map<string, HTMLElement>()
  let currentArgs = hudTimelineStoryDefaultArgs

  const update = (args: HudTimelineStoryArgs): void => {
    const next = normalizeTimelineArgs(args)
    root.setAttribute("aria-label", next.title)
    if (titleText.data !== next.title) titleText.data = next.title
    currentTime.setAttribute("datetime", String(next.current))
    if (currentText.data !== String(next.current)) currentText.data = String(next.current)
    playButton.setAttribute("aria-pressed", String(next.playing))
    const playLabel = next.playing ? "Pause" : "Play"
    if (playText.data !== playLabel) playText.data = playLabel
    reconcileTracks(document, tracksList, trackEntries, trackElements, markerTimes, next.tracks)
    currentArgs = next
  }
  const refs: HudTimelineStoryRefs = Object.freeze({root, currentTime, previousButton, playButton, nextButton, trackElements, markerTimes})
  const story: HudTimelineDomStory = Object.freeze({element: root, refs, get args() { return currentArgs }, get source() { return hudSource(root) }, update})
  update(initialArgs)
  return story
}

function button(document: Document, label: string): HTMLButtonElement {
  const element = document.createElement("button")
  element.setAttribute("type", "button")
  element.title = label
  element.appendChild(document.createTextNode(label))
  return element
}

function reconcileButtons(
  document: Document,
  parent: HTMLElement,
  entries: Map<string, TextEntry>,
  refs: Map<string, HTMLButtonElement>,
  args: readonly KeyedButtonArgs[],
  dataName: string,
): void {
  const retained = new Set(args.map(({key}) => key))
  for (const [key, entry] of entries) {
    if (retained.has(key)) continue
    entry.element.remove()
    entries.delete(key)
    refs.delete(key)
  }
  const ordered: HTMLButtonElement[] = []
  for (const item of args) {
    let entry = entries.get(item.key)
    if (!entry) {
      const element = button(document, item.label)
      const text = element.firstChild as Text
      element.setAttribute(`data-${dataName}-key`, item.key)
      entry = {element, text}
      entries.set(item.key, entry)
      refs.set(item.key, element)
    }
    if (entry.text.data !== item.label) entry.text.data = item.label
    const element = entry.element as HTMLButtonElement
    element.disabled = item.disabled
    element.title = item.label
    ordered.push(element)
  }
  reconcileChildren(parent, ordered)
}

function reconcileTracks(document: Document, parent: HTMLElement, entries: Map<string, TimelineTrackEntry>, trackRefs: Map<string, HTMLElement>, markerRefs: Map<string, HTMLElement>, tracks: readonly HudTimelineTrack[]): void {
  const retained = new Set(tracks.map(({key}) => key))
  for (const [key, entry] of entries) if (!retained.has(key)) {
    for (const markerKey of entry.markers.keys()) markerRefs.delete(`${key}/${markerKey}`)
    entry.element.remove()
    entries.delete(key)
    trackRefs.delete(key)
  }
  const ordered: HTMLElement[] = []
  for (const track of tracks) {
    let entry = entries.get(track.key)
    if (!entry) {
      const element = document.createElement("li")
      const label = document.createElement("span")
      const labelText = document.createTextNode("")
      const markerList = document.createElement("ul")
      element.className = "ui-hud-timeline-story__track"
      element.setAttribute("data-track-key", track.key)
      label.className = "ui-hud-timeline-story__track-label"
      label.appendChild(labelText)
      markerList.className = "ui-hud-timeline-story__markers"
      element.append(label, markerList)
      entry = {element, labelText, markerList, markers: new Map()}
      entries.set(track.key, entry)
      trackRefs.set(track.key, element)
    }
    if (entry.labelText.data !== track.label) entry.labelText.data = track.label
    reconcileMarkers(document, track.key, entry, markerRefs, track.markers)
    ordered.push(entry.element)
  }
  reconcileChildren(parent, ordered)
}

function reconcileMarkers(document: Document, trackKey: string, track: TimelineTrackEntry, refs: Map<string, HTMLElement>, markers: readonly HudTimelineMarker[]): void {
  const retained = new Set(markers.map(({key}) => key))
  for (const [key, entry] of track.markers) {
    if (retained.has(key)) continue
    entry.element.remove()
    track.markers.delete(key)
    refs.delete(`${trackKey}/${key}`)
  }
  const ordered: HTMLElement[] = []
  for (const marker of markers) {
    let entry = track.markers.get(marker.key)
    if (!entry) {
      const item = document.createElement("li")
      const time = document.createElement("time")
      const text = document.createTextNode("")
      item.className = "ui-hud-timeline-story__marker"
      item.setAttribute("data-marker-key", marker.key)
      time.appendChild(text)
      item.appendChild(time)
      entry = {element: item, text}
      track.markers.set(marker.key, entry)
      refs.set(`${trackKey}/${marker.key}`, time)
    }
    const time = entry.element.firstElementChild!
    time.setAttribute("datetime", String(marker.tick))
    if (entry.text.data !== marker.label) entry.text.data = marker.label
    entry.element.setAttribute("aria-current", String(marker.selected))
    ordered.push(entry.element)
  }
  reconcileChildren(track.markerList, ordered)
}

function normalizeWindowArgs(args: HudWindowStoryArgs): HudWindowStoryArgs {
  assertString(args.title, "HUD Window title")
  assertString(args.subtitle, "HUD Window subtitle")
  assertBoolean(args.active, "HUD Window active")
  assertBoolean(args.minimized, "HUD Window minimized")
  return Object.freeze({...args, actions: normalizeKeyed(args.actions, "HUD Window action")})
}
function normalizeFrameArgs(args: HudFrameStoryArgs): HudFrameStoryArgs {
  assertString(args.title, "HUD Frame title")
  if (!(args.edge === "floating" || args.edge === "left" || args.edge === "right" || args.edge === "top" || args.edge === "bottom")) throw new Error(`Unknown HUD Frame edge: ${String(args.edge)}`)
  return Object.freeze({...args, handles: normalizeKeyed(args.handles, "HUD Frame handle")})
}
function normalizeTimelineArgs(args: HudTimelineStoryArgs): HudTimelineStoryArgs {
  assertString(args.title, "HUD Timeline title")
  assertFinite(args.min, "HUD Timeline min")
  assertFinite(args.max, "HUD Timeline max")
  assertFinite(args.current, "HUD Timeline current")
  assertBoolean(args.playing, "HUD Timeline playing")
  if (args.max <= args.min) throw new RangeError("HUD Timeline max must be greater than min")
  if (args.current < args.min || args.current > args.max) throw new RangeError("HUD Timeline current must be inside the range")
  const seen = new Set<string>()
  const tracks = args.tracks.map((track) => {
    assertKey(track.key, seen, "HUD Timeline track")
    assertString(track.label, `HUD Timeline track ${track.key} label`)
    const markerSeen = new Set<string>()
    const markers = track.markers.map((marker) => {
      assertKey(marker.key, markerSeen, `HUD Timeline track ${track.key} marker`)
      assertFinite(marker.tick, `HUD Timeline marker ${marker.key} tick`)
      assertString(marker.label, `HUD Timeline marker ${marker.key} label`)
      assertBoolean(marker.selected, `HUD Timeline marker ${marker.key} selected`)
      if (marker.tick < args.min || marker.tick > args.max) throw new RangeError(`HUD Timeline marker is outside the range: ${track.key}/${marker.key}`)
      return Object.freeze({...marker})
    })
    return Object.freeze({...track, markers: Object.freeze(markers)})
  })
  return Object.freeze({...args, tracks: Object.freeze(tracks)})
}

function normalizeKeyed<T extends KeyedButtonArgs>(
  values: readonly T[],
  owner: string,
): readonly T[] {
  const seen = new Set<string>()
  return Object.freeze(values.map((value) => {
    assertKey(value.key, seen, owner)
    assertString(value.label, `${owner} ${value.key} label`)
    assertBoolean(value.disabled, `${owner} ${value.key} disabled`)
    return Object.freeze({...value}) as T
  }))
}
function assertKey(key: unknown, seen: Set<string>, owner: string): asserts key is string {
  assertString(key, `${owner} key`)
  if (key.length === 0) throw new Error(`${owner} key must not be empty`)
  if (seen.has(key)) throw new Error(`${owner} key must be unique: ${key}`)
  seen.add(key)
}
function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}
function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}
function assertFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`)
  }
}
function setBoolean(element: HTMLElement, name: string, enabled: boolean): void {
  if (enabled && !element.hasAttribute(name)) element.setAttribute(name, "")
  else if (!enabled && element.hasAttribute(name)) element.removeAttribute(name)
}
function reconcileChildren(parent: Node, ordered: readonly Node[]): void {
  const retained = new Set(ordered)
  for (const child of parent.childNodes) {
    if (!retained.has(child)) parent.removeChild(child)
  }
  let reference = parent.firstChild
  for (const child of ordered) {
    if (child === reference) {
      reference = reference.nextSibling
      continue
    }
    parent.insertBefore(child, reference)
  }
}

function hudSource(root: HTMLElement): HudStorySource {
  return Object.freeze({
    html: serializeElement(root),
    css: hudStoriesCss,
    typescript: serializeTypeScript(root),
  })
}
function serializeElement(element: HTMLElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attrs = element.getAttributeNames().sort().map((name) => {
    const value = element.getAttribute(name) ?? ""
    return value === "" && (name === "disabled" || name === "hidden")
      ? ` ${name}`
      : ` ${name}="${escapeAttribute(value)}"`
  }).join("")
  const opening = `${indent}<${element.localName}${attrs}>`
  const children = element.childNodes
  if (children.length === 0) return `${opening}</${element.localName}>`
  if (children.length === 1 && children[0]?.nodeType === 3) {
    return `${opening}${escapeText(children[0].nodeValue ?? "")}</${element.localName}>`
  }
  const content = children.map((node) => {
    if (node.nodeType === 1) return serializeElement(node as HTMLElement, depth + 1)
    if (node.nodeType === 3) return `${"  ".repeat(depth + 1)}${escapeText(node.nodeValue ?? "")}`
    return ""
  }).filter(Boolean)
  return [opening, ...content, `${indent}</${element.localName}>`].join("\n")
}
function serializeTypeScript(root: HTMLElement): string {
  const lines = ['import {createDocument} from "@zavx0z/dom"', "", "const document = createDocument()"]
  let nextId = 0
  const visit = (element: HTMLElement, parent: string | null): string => {
    const variable = parent === null ? "root" : `node${nextId++}`
    lines.push(`const ${variable} = document.createElement(${JSON.stringify(element.localName)})`)
    for (const name of element.getAttributeNames().sort()) {
      lines.push(`${variable}.setAttribute(${JSON.stringify(name)}, ${JSON.stringify(element.getAttribute(name) ?? "")})`)
    }
    if (parent !== null) lines.push(`${parent}.appendChild(${variable})`)
    for (const child of element.childNodes) {
      if (child.nodeType === 1) visit(child as HTMLElement, variable)
      else if (child.nodeType === 3) lines.push(`${variable}.appendChild(document.createTextNode(${JSON.stringify(child.nodeValue ?? "")}))`)
    }
    return variable
  }
  visit(root, null)
  lines.push("document.appendChild(root)")
  return lines.join("\n")
}
function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}
function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;")
}
