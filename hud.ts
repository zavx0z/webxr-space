import type {
  Document,
  HTMLButtonElement,
  HTMLElement,
  Node,
  Text,
} from "@zavx0z/dom"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"
import {projectVisualState, type VisualStateProjection} from "./internal/dom-state.ts"


export type HudWindowAction = Readonly<{
  key: string
  label: string
  disabled: boolean
}>

export type HudWindowProps = Readonly<{
  title: string
  subtitle: string
  active: boolean
  minimized: boolean
  actions: readonly HudWindowAction[]
}>

export type HudWindowRefs = Readonly<{
  root: HTMLElement
  header: HTMLElement
  minimizeButton: HTMLButtonElement
  minimizeText: Text
  titleText: Text
  subtitleText: Text
  actionNav: HTMLElement
  body: HTMLElement
  actionButtons: ReadonlyMap<string, HTMLButtonElement>
}>

export type HudWindowController = Readonly<{
  element: HTMLElement
  refs: HudWindowRefs
  props: HudWindowProps
  update(props: HudWindowProps): void
  dispose(): void
}>

export type HudFrameEdge = "floating" | "left" | "right" | "top" | "bottom"

export type HudFrameHandle = Readonly<{
  key: string
  label: string
  disabled: boolean
}>

export type HudFrameProps = Readonly<{
  title: string
  edge: HudFrameEdge
  handles: readonly HudFrameHandle[]
}>

export type HudFrameRefs = Readonly<{
  root: HTMLElement
  header: HTMLElement
  titleText: Text
  handleNav: HTMLElement
  body: HTMLElement
  handleButtons: ReadonlyMap<string, HTMLButtonElement>
}>

export type HudFrameController = Readonly<{
  element: HTMLElement
  refs: HudFrameRefs
  props: HudFrameProps
  update(props: HudFrameProps): void
  dispose(): void
}>

export type TimelineMarker = Readonly<{
  key: string
  tick: number
  label: string
  selected: boolean
}>

export type TimelineTrack = Readonly<{
  key: string
  label: string
  markers: readonly TimelineMarker[]
}>

export type TimelineProps = Readonly<{
  title: string
  min: number
  max: number
  current: number
  playing: boolean
  tracks: readonly TimelineTrack[]
}>

export type TimelineRefs = Readonly<{
  root: HTMLElement
  titleText: Text
  currentTime: HTMLElement
  currentText: Text
  transport: HTMLElement
  previousButton: HTMLButtonElement
  playButton: HTMLButtonElement
  playText: Text
  nextButton: HTMLButtonElement
  tracksList: HTMLElement
  trackElements: ReadonlyMap<string, HTMLElement>
  trackLabelTexts: ReadonlyMap<string, Text>
  markerItems: ReadonlyMap<string, HTMLElement>
  markerTimes: ReadonlyMap<string, HTMLElement>
  markerTexts: ReadonlyMap<string, Text>
}>

export type TimelineController = Readonly<{
  element: HTMLElement
  refs: TimelineRefs
  props: TimelineProps
  update(props: TimelineProps): void
  dispose(): void
}>

export const hudWindowDefaultProps: HudWindowProps = Object.freeze({
  title: "Output",
  subtitle: "HUD window",
  active: true,
  minimized: false,
  actions: Object.freeze([
    Object.freeze({key: "pin", label: "Pin", disabled: false}),
    Object.freeze({key: "close", label: "Close", disabled: false}),
  ]),
})

export const hudFrameDefaultProps: HudFrameProps = Object.freeze({
  title: "Frame",
  edge: "right",
  handles: Object.freeze([
    Object.freeze({key: "move", label: "Move", disabled: false}),
    Object.freeze({key: "resize", label: "Resize", disabled: false}),
    Object.freeze({key: "dock", label: "Dock", disabled: false}),
  ]),
})

export const timelineDefaultProps: TimelineProps = Object.freeze({
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

const hudButtonColors = resolveWidgetColors("toolbarItem")
const hudSelectedColors = resolveWidgetColors("toolbarItem", {selected: true})

export const hudCss = String.raw`
.ui-hud-window,
.ui-hud-frame,
.ui-timeline {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  border: 1px solid ${rgba8ToColor(hudButtonColors.outline)};
  border-radius: 6px;
  background: ${rgba8ToColor(uiTheme.spaceNode.navigationBar)};
  color: ${rgba8ToColor(hudButtonColors.text)};
  overflow: hidden;
}

.ui-hud-window { width: 320px; min-height: 160px; }
.ui-hud-frame { width: 300px; min-height: 140px; }
.ui-timeline { width: 640px; min-height: 140px; }

.ui-hud-window[data-active="true"] { border-color: ${rgba8ToColor(uiTheme.material.editorOutlineActive)}; }

.ui-hud-window__header,
.ui-hud-frame__header,
.ui-timeline__header {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 28px;
  gap: 4px;
  padding: 3px 6px;
  background: ${rgba8ToColor(uiTheme.spaceNode.header)};
}

.ui-hud-window__title,
.ui-hud-frame__title,
.ui-timeline__title {
  display: inline;
  flex-grow: 1;
  font-size: 12px;
}

.ui-hud-window__subtitle {
  display: inline;
  color: rgb(153 153 153);
  font-size: 10px;
}

.ui-hud-window__actions,
.ui-hud-frame__handles,
.ui-timeline__transport {
  display: flex;
  flex-direction: row;
  gap: 4px;
}

.ui-hud-window button,
.ui-hud-frame button,
.ui-timeline button {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 2px 6px;
  border: 1px solid ${rgba8ToColor(hudButtonColors.outline)};
  border-radius: 3px;
  background: ${rgba8ToColor(hudButtonColors.inner)};
  color: ${rgba8ToColor(hudButtonColors.text)};
  font-size: 10px;
}
.ui-hud-window button[data-ui-state="hover"],
.ui-hud-frame button[data-ui-state="hover"],
.ui-timeline button[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-hud-window button[data-ui-state="active"],
.ui-hud-frame button[data-ui-state="active"],
.ui-timeline button[data-ui-state="active"],
.ui-hud-window button[data-ui-state="focus"],
.ui-hud-frame button[data-ui-state="focus"],
.ui-timeline button[data-ui-state="focus"] { background: ${rgba8ToColor(hudSelectedColors.inner)}; color: ${rgba8ToColor(hudSelectedColors.text)}; }

.ui-hud-window__body,
.ui-hud-frame__body {
  box-sizing: border-box;
  display: block;
  flex-grow: 1;
  padding: 6px;
}

.ui-hud-window [hidden] { display: none; }
.ui-hud-frame[data-edge="left"] { border-left-color: ${rgba8ToColor(hudSelectedColors.inner)}; }
.ui-hud-frame[data-edge="right"] { border-right-color: ${rgba8ToColor(hudSelectedColors.inner)}; }
.ui-hud-frame[data-edge="top"] { border-top-color: ${rgba8ToColor(hudSelectedColors.inner)}; }
.ui-hud-frame[data-edge="bottom"] { border-bottom-color: ${rgba8ToColor(hudSelectedColors.inner)}; }

.ui-timeline__current {
  display: inline;
  color: ${rgba8ToColor(hudSelectedColors.text)};
  font-size: 11px;
}

.ui-timeline__tracks {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 2px;
  padding: 4px;
  overflow-y: auto;
}

.ui-timeline__track {
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 24px;
  gap: 4px;
}

.ui-timeline__track-label {
  display: inline;
  width: 80px;
  font-size: 11px;
}

.ui-timeline__markers {
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  gap: 3px;
}

.ui-timeline__marker {
  display: block;
  padding: 2px 4px;
  border-radius: 2px;
  background: ${rgba8ToColor(hudButtonColors.inner)};
}

.ui-timeline__marker[aria-current="true"] { background: ${rgba8ToColor(hudSelectedColors.inner)}; color: ${rgba8ToColor(hudSelectedColors.text)}; }
`

type KeyedButtonProps = Readonly<{
  key: string
  label: string
  disabled: boolean
}>

type ButtonEntry = {
  button: HTMLButtonElement
  text: Text
  state: VisualStateProjection
}

type TimelineMarkerEntry = {
  item: HTMLElement
  time: HTMLElement
  text: Text
}

type TimelineTrackEntry = {
  element: HTMLElement
  labelText: Text
  markerList: HTMLElement
  markers: Map<string, TimelineMarkerEntry>
}

let nextHudBodyId = 1

export function createHudWindow(
  document: Document,
  initialProps: HudWindowProps = hudWindowDefaultProps,
): HudWindowController {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const minimizeButton = createButton(document, "Minimize")
  const minimizeText = minimizeButton.firstChild as Text
  const title = document.createElement("span")
  const titleText = document.createTextNode("")
  const subtitle = document.createElement("span")
  const subtitleText = document.createTextNode("")
  const actionNav = document.createElement("nav")
  const body = document.createElement("section")
  const bodyId = `ui-hud-window-body-${nextHudBodyId}`
  nextHudBodyId += 1

  root.className = "ui-hud-window"
  header.className = "ui-hud-window__header"
  minimizeButton.className = "ui-hud-window__minimize"
  minimizeButton.setAttribute("aria-controls", bodyId)
  title.className = "ui-hud-window__title"
  title.appendChild(titleText)
  subtitle.className = "ui-hud-window__subtitle"
  subtitle.appendChild(subtitleText)
  actionNav.className = "ui-hud-window__actions"
  actionNav.setAttribute("aria-label", "Window actions")
  body.className = "ui-hud-window__body"
  body.id = bodyId
  header.append(minimizeButton, title, subtitle, actionNav)
  root.append(header, body)

  const entries = new Map<string, ButtonEntry>()
  const actionButtons = new Map<string, HTMLButtonElement>()
  let currentProps = hudWindowDefaultProps
  let disposed = false
  const minimizeState = projectVisualState(minimizeButton, () => minimizeButton.disabled)

  const update = (props: HudWindowProps): void => {
    if (disposed) throw new Error("HudWindow controller is disposed")
    const next = normalizeWindowProps(props)
    root.className = next.active ? "ui-hud-window ui-hud-window--active" : "ui-hud-window"
    root.setAttribute("data-active", String(next.active))
    root.setAttribute("aria-label", next.title)
    if (titleText.data !== next.title) titleText.data = next.title
    if (subtitleText.data !== next.subtitle) subtitleText.data = next.subtitle
    const minimizeLabel = next.minimized ? "Restore" : "Minimize"
    if (minimizeText.data !== minimizeLabel) minimizeText.data = minimizeLabel
    if (minimizeButton.title !== minimizeLabel) minimizeButton.title = minimizeLabel
    minimizeButton.setAttribute("aria-expanded", String(!next.minimized))
    minimizeState.sync()
    syncBooleanAttribute(body, "hidden", next.minimized)
    reconcileButtons(document, actionNav, entries, actionButtons, next.actions, "action")
    currentProps = next
  }

  const refs: HudWindowRefs = Object.freeze({
    root,
    header,
    minimizeButton,
    minimizeText,
    titleText,
    subtitleText,
    actionNav,
    body,
    actionButtons,
  })
  const controller: HudWindowController = Object.freeze({
    element: root,
    refs,
    get props() { return currentProps },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      minimizeState.dispose()
      disposeButtonEntries(entries)
    },
  })
  update(initialProps)
  return controller
}

export function createHudFrame(
  document: Document,
  initialProps: HudFrameProps = hudFrameDefaultProps,
): HudFrameController {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const title = document.createElement("span")
  const titleText = document.createTextNode("")
  const handleNav = document.createElement("nav")
  const body = document.createElement("section")

  root.className = "ui-hud-frame"
  header.className = "ui-hud-frame__header"
  title.className = "ui-hud-frame__title"
  title.appendChild(titleText)
  handleNav.className = "ui-hud-frame__handles"
  handleNav.setAttribute("aria-label", "Frame handles")
  body.className = "ui-hud-frame__body"
  header.append(title, handleNav)
  root.append(header, body)

  const entries = new Map<string, ButtonEntry>()
  const handleButtons = new Map<string, HTMLButtonElement>()
  let currentProps = hudFrameDefaultProps
  let disposed = false

  const update = (props: HudFrameProps): void => {
    if (disposed) throw new Error("HudFrame controller is disposed")
    const next = normalizeFrameProps(props)
    root.setAttribute("data-edge", next.edge)
    root.setAttribute("aria-label", next.title)
    if (titleText.data !== next.title) titleText.data = next.title
    reconcileButtons(document, handleNav, entries, handleButtons, next.handles, "handle")
    currentProps = next
  }

  const refs: HudFrameRefs = Object.freeze({
    root,
    header,
    titleText,
    handleNav,
    body,
    handleButtons,
  })
  const controller: HudFrameController = Object.freeze({
    element: root,
    refs,
    get props() { return currentProps },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      disposeButtonEntries(entries)
    },
  })
  update(initialProps)
  return controller
}

export function createTimeline(
  document: Document,
  initialProps: TimelineProps = timelineDefaultProps,
): TimelineController {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const title = document.createElement("span")
  const titleText = document.createTextNode("")
  const currentTime = document.createElement("time")
  const currentText = document.createTextNode("")
  const transport = document.createElement("nav")
  const previousButton = createButton(document, "Previous")
  const playButton = createButton(document, "Play")
  const playText = playButton.firstChild as Text
  const nextButton = createButton(document, "Next")
  const tracksList = document.createElement("ul")

  root.className = "ui-timeline"
  header.className = "ui-timeline__header"
  title.className = "ui-timeline__title"
  title.appendChild(titleText)
  currentTime.className = "ui-timeline__current"
  currentTime.appendChild(currentText)
  transport.className = "ui-timeline__transport"
  transport.setAttribute("aria-label", "Timeline transport")
  transport.append(previousButton, playButton, nextButton)
  tracksList.className = "ui-timeline__tracks"
  tracksList.setAttribute("aria-label", "Timeline tracks")
  header.append(title, currentTime, transport)
  root.append(header, tracksList)

  const trackEntries = new Map<string, TimelineTrackEntry>()
  const trackElements = new Map<string, HTMLElement>()
  const trackLabelTexts = new Map<string, Text>()
  const markerItems = new Map<string, HTMLElement>()
  const markerTimes = new Map<string, HTMLElement>()
  const markerTexts = new Map<string, Text>()
  let currentProps = timelineDefaultProps
  let disposed = false
  const transportStates = [previousButton, playButton, nextButton].map((button) => projectVisualState(button, () => button.disabled))

  const update = (props: TimelineProps): void => {
    if (disposed) throw new Error("Timeline controller is disposed")
    const next = normalizeTimelineProps(props)
    root.setAttribute("aria-label", next.title)
    root.setAttribute("data-min", String(next.min))
    root.setAttribute("data-max", String(next.max))
    root.setAttribute("data-current", String(next.current))
    if (titleText.data !== next.title) titleText.data = next.title
    syncTime(currentTime, currentText, next.current, `Current ${next.current}`)
    playButton.setAttribute("aria-pressed", String(next.playing))
    const playLabel = next.playing ? "Pause" : "Play"
    if (playText.data !== playLabel) playText.data = playLabel
    if (playButton.title !== playLabel) playButton.title = playLabel
    for (const state of transportStates) state.sync()
    reconcileTracks(
      document,
      tracksList,
      trackEntries,
      trackElements,
      trackLabelTexts,
      markerItems,
      markerTimes,
      markerTexts,
      next.tracks,
    )
    currentProps = next
  }

  const refs: TimelineRefs = Object.freeze({
    root,
    titleText,
    currentTime,
    currentText,
    transport,
    previousButton,
    playButton,
    playText,
    nextButton,
    tracksList,
    trackElements,
    trackLabelTexts,
    markerItems,
    markerTimes,
    markerTexts,
  })
  const controller: TimelineController = Object.freeze({
    element: root,
    refs,
    get props() { return currentProps },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      for (const state of transportStates) state.dispose()
    },
  })
  update(initialProps)
  return controller
}

function createButton(document: Document, label: string): HTMLButtonElement {
  const button = document.createElement("button")
  button.setAttribute("type", "button")
  button.title = label
  button.appendChild(document.createTextNode(label))
  return button
}

function reconcileButtons(
  document: Document,
  parent: HTMLElement,
  entries: Map<string, ButtonEntry>,
  refs: Map<string, HTMLButtonElement>,
  props: readonly KeyedButtonProps[],
  owner: "action" | "handle",
): void {
  const retained = new Set(props.map(({key}) => key))
  for (const key of entries.keys()) {
    if (retained.has(key)) continue
    entries.get(key)?.state.dispose()
    entries.delete(key)
    refs.delete(key)
  }
  const ordered: HTMLButtonElement[] = []
  for (const item of props) {
    let entry = entries.get(item.key)
    if (entry === undefined) {
      const button = createButton(document, item.label)
      const text = button.firstChild as Text
      button.setAttribute(`data-${owner}-key`, item.key)
      const state = projectVisualState(button, () => button.disabled)
      entry = {button, text, state}
      entries.set(item.key, entry)
      refs.set(item.key, button)
    }
    if (entry.text.data !== item.label) entry.text.data = item.label
    if (entry.button.title !== item.label) entry.button.title = item.label
    if (entry.button.disabled !== item.disabled) entry.button.disabled = item.disabled
    entry.state.sync()
    ordered.push(entry.button)
  }
  reconcileChildren(parent, ordered)
}

function disposeButtonEntries(entries: Map<string, ButtonEntry>): void {
  for (const entry of entries.values()) entry.state.dispose()
  entries.clear()
}

function reconcileTracks(
  document: Document,
  parent: HTMLElement,
  entries: Map<string, TimelineTrackEntry>,
  trackElements: Map<string, HTMLElement>,
  trackLabelTexts: Map<string, Text>,
  markerItems: Map<string, HTMLElement>,
  markerTimes: Map<string, HTMLElement>,
  markerTexts: Map<string, Text>,
  tracks: readonly TimelineTrack[],
): void {
  const retained = new Set(tracks.map(({key}) => key))
  for (const [key, entry] of entries) {
    if (retained.has(key)) continue
    for (const markerKey of entry.markers.keys()) {
      const identity = markerIdentity(key, markerKey)
      markerItems.delete(identity)
      markerTimes.delete(identity)
      markerTexts.delete(identity)
    }
    entries.delete(key)
    trackElements.delete(key)
    trackLabelTexts.delete(key)
  }

  const ordered: HTMLElement[] = []
  for (const track of tracks) {
    let entry = entries.get(track.key)
    if (entry === undefined) {
      const element = document.createElement("li")
      const label = document.createElement("span")
      const labelText = document.createTextNode("")
      const markerList = document.createElement("ul")
      element.className = "ui-timeline__track"
      element.setAttribute("data-track-key", track.key)
      label.className = "ui-timeline__track-label"
      label.appendChild(labelText)
      markerList.className = "ui-timeline__markers"
      element.append(label, markerList)
      entry = {element, labelText, markerList, markers: new Map()}
      entries.set(track.key, entry)
      trackElements.set(track.key, element)
      trackLabelTexts.set(track.key, labelText)
    }
    if (entry.labelText.data !== track.label) entry.labelText.data = track.label
    entry.markerList.setAttribute("aria-label", `Markers for ${track.label}`)
    reconcileMarkers(
      document,
      track.key,
      entry,
      markerItems,
      markerTimes,
      markerTexts,
      track.markers,
    )
    ordered.push(entry.element)
  }
  reconcileChildren(parent, ordered)
}

function reconcileMarkers(
  document: Document,
  trackKey: string,
  track: TimelineTrackEntry,
  markerItems: Map<string, HTMLElement>,
  markerTimes: Map<string, HTMLElement>,
  markerTexts: Map<string, Text>,
  markers: readonly TimelineMarker[],
): void {
  const retained = new Set(markers.map(({key}) => key))
  for (const key of track.markers.keys()) {
    if (retained.has(key)) continue
    const identity = markerIdentity(trackKey, key)
    track.markers.delete(key)
    markerItems.delete(identity)
    markerTimes.delete(identity)
    markerTexts.delete(identity)
  }

  const ordered: HTMLElement[] = []
  for (const marker of markers) {
    let entry = track.markers.get(marker.key)
    if (entry === undefined) {
      const item = document.createElement("li")
      const time = document.createElement("time")
      const text = document.createTextNode("")
      const identity = markerIdentity(trackKey, marker.key)
      item.className = "ui-timeline__marker"
      item.setAttribute("data-marker-key", marker.key)
      time.appendChild(text)
      item.appendChild(time)
      entry = {item, time, text}
      track.markers.set(marker.key, entry)
      markerItems.set(identity, item)
      markerTimes.set(identity, time)
      markerTexts.set(identity, text)
    }
    syncTime(entry.time, entry.text, marker.tick, marker.label)
    entry.item.setAttribute("aria-current", String(marker.selected))
    ordered.push(entry.item)
  }
  reconcileChildren(track.markerList, ordered)
}

function syncTime(element: HTMLElement, text: Text, tick: number, label: string): void {
  element.setAttribute("datetime", String(tick))
  element.setAttribute("data-tick", String(tick))
  element.setAttribute("aria-label", label)
  if (text.data !== label) text.data = label
}

function markerIdentity(trackKey: string, markerKey: string): string {
  return `${trackKey}/${markerKey}`
}

function normalizeWindowProps(props: HudWindowProps): HudWindowProps {
  assertString(props.title, "HudWindow title")
  assertString(props.subtitle, "HudWindow subtitle")
  assertBoolean(props.active, "HudWindow active")
  assertBoolean(props.minimized, "HudWindow minimized")
  return Object.freeze({
    title: props.title,
    subtitle: props.subtitle,
    active: props.active,
    minimized: props.minimized,
    actions: normalizeButtons(props.actions, "HudWindow action"),
  })
}

function normalizeFrameProps(props: HudFrameProps): HudFrameProps {
  assertString(props.title, "HudFrame title")
  if (props.edge !== "floating" && props.edge !== "left" && props.edge !== "right" &&
    props.edge !== "top" && props.edge !== "bottom") {
    throw new Error(`Unknown HudFrame edge: ${String(props.edge)}`)
  }
  return Object.freeze({
    title: props.title,
    edge: props.edge,
    handles: normalizeButtons(props.handles, "HudFrame handle"),
  })
}

function normalizeTimelineProps(props: TimelineProps): TimelineProps {
  assertString(props.title, "Timeline title")
  assertFinite(props.min, "Timeline min")
  assertFinite(props.max, "Timeline max")
  assertFinite(props.current, "Timeline current")
  assertBoolean(props.playing, "Timeline playing")
  if (props.max <= props.min) throw new RangeError("Timeline max must be greater than min")
  if (props.current < props.min || props.current > props.max) {
    throw new RangeError("Timeline current must be inside the range")
  }
  if (!Array.isArray(props.tracks)) throw new TypeError("Timeline tracks must be an array")
  const trackKeys = new Set<string>()
  const tracks = props.tracks.map((track: TimelineTrack) => {
    if (typeof track !== "object" || track === null) throw new TypeError("Timeline track must be an object")
    assertKey(track.key, trackKeys, "Timeline track")
    assertString(track.label, `Timeline track ${track.key} label`)
    if (!Array.isArray(track.markers)) throw new TypeError(`Timeline track ${track.key} markers must be an array`)
    const markerKeys = new Set<string>()
    const markers = track.markers.map((marker: TimelineMarker) => {
      if (typeof marker !== "object" || marker === null) throw new TypeError("Timeline marker must be an object")
      assertKey(marker.key, markerKeys, `Timeline track ${track.key} marker`)
      assertFinite(marker.tick, `Timeline marker ${marker.key} tick`)
      assertString(marker.label, `Timeline marker ${marker.key} label`)
      assertBoolean(marker.selected, `Timeline marker ${marker.key} selected`)
      if (marker.tick < props.min || marker.tick > props.max) {
        throw new RangeError(`Timeline marker is outside the range: ${track.key}/${marker.key}`)
      }
      return Object.freeze({...marker})
    })
    return Object.freeze({...track, markers: Object.freeze(markers)})
  })
  return Object.freeze({
    title: props.title,
    min: props.min,
    max: props.max,
    current: props.current,
    playing: props.playing,
    tracks: Object.freeze(tracks),
  })
}

function normalizeButtons<T extends KeyedButtonProps>(
  props: readonly T[],
  owner: string,
): readonly T[] {
  if (!Array.isArray(props)) throw new TypeError(`${owner}s must be an array`)
  const keys = new Set<string>()
  return Object.freeze(props.map((item) => {
    if (typeof item !== "object" || item === null) throw new TypeError(`${owner} must be an object`)
    assertKey(item.key, keys, owner)
    assertString(item.label, `${owner} ${item.key} label`)
    assertBoolean(item.disabled, `${owner} ${item.key} disabled`)
    return Object.freeze({...item}) as T
  }))
}

function assertKey(value: unknown, keys: Set<string>, owner: string): asserts value is string {
  assertString(value, `${owner} key`)
  if (value.length === 0) throw new Error(`${owner} key must not be empty`)
  if (keys.has(value)) throw new Error(`${owner} key must be unique: ${value}`)
  keys.add(value)
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function assertFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`)
}

function syncBooleanAttribute(element: HTMLElement, name: string, enabled: boolean): void {
  if (enabled && !element.hasAttribute(name)) element.setAttribute(name, "")
  if (!enabled && element.hasAttribute(name)) element.removeAttribute(name)
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
