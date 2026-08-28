import type {Event} from "@zavx0z/dom"
import {defineStyles, useId, type CSSProperties, type FunctionComponent, type StyleValue} from "@zavx0z/react"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {Button, buttonComponentCss} from "./button-component.tsx"
import type {
  HudFrameEdge,
  HudFrameHandle,
  HudWindowAction,
  TimelineMarker,
  TimelineTrack
} from "./hud.ts"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"

export type HudWindowComponentProps = Readonly<{
  title: string
  subtitle: string
  active: boolean
  minimized: boolean
  actions: readonly HudWindowAction[]
  children: JsxSourceElement | null
  style?: StyleValue
  onMinimizedChange?: ((minimized: boolean, event: Event) => void) | undefined
  onAction?: ((key: string, event: Event) => void) | undefined
}>

export type HudFrameComponentProps = Readonly<{
  title: string
  edge: HudFrameEdge
  handles: readonly HudFrameHandle[]
  children: JsxSourceElement | null
  style?: StyleValue
  onHandle?: ((key: string, event: Event) => void) | undefined
}>

export type TimelineComponentProps = Readonly<{
  title: string
  min: number
  max: number
  current: number
  playing: boolean
  tracks: readonly TimelineTrack[]
  style?: StyleValue
  onPrevious?: ((event: Event) => void) | undefined
  onPlayingChange?: ((playing: boolean, event: Event) => void) | undefined
  onNext?: ((event: Event) => void) | undefined
  onMarkerActivate?: ((trackKey: string, markerKey: string, event: Event) => void) | undefined
}>

const buttonColors = resolveWidgetColors("toolbarItem")
const selectedColors = resolveWidgetColors("toolbarItem", {selected: true})

export const hudStyles = defineStyles("@ui/components/hud", {
  owner: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    border: `1px solid ${rgba8ToColor(buttonColors.outline)}`,
    borderRadius: 6,
    background: rgba8ToColor(uiTheme.spaceNode.navigationBar),
    color: rgba8ToColor(buttonColors.text),
    overflow: "clip"
  },
  window: {width: 320, minHeight: 160},
  activeWindow: {borderColor: rgba8ToColor(uiTheme.material.editorOutlineActive)},
  frame: {width: 300, minHeight: 140},
  timeline: {width: 640, minHeight: 140},
  edgeIndicator: {position: "absolute", display: "block", background: rgba8ToColor(selectedColors.inner)},
  leftEdge: {left: 0, top: 0, width: 1, height: "100%"},
  rightEdge: {right: 0, top: 0, width: 1, height: "100%"},
  topEdge: {left: 0, top: 0, width: "100%", height: 1},
  bottomEdge: {left: 0, bottom: 0, width: "100%", height: 1},
  header: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 28,
    gap: 4,
    padding: "3px 6px",
    background: rgba8ToColor(uiTheme.spaceNode.header)
  },
  title: {display: "inline", minWidth: 0, flexGrow: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 12},
  subtitle: {display: "inline", color: "rgb(153 153 153)", fontSize: 10},
  nav: {display: "flex", flexDirection: "row", gap: 4},
  button: {width: 52, minWidth: 22, height: 22, padding: "2px 6px", fontSize: 10},
  minimizeButton: {width: 22},
  body: {boxSizing: "border-box", display: "block", flexGrow: 1, padding: 6},
  hidden: {display: "none"},
  current: {display: "inline", color: rgba8ToColor(selectedColors.text), fontSize: 11},
  tracks: {boxSizing: "border-box", display: "flex", flexDirection: "column", flexGrow: 1, gap: 2, padding: 4, overflowY: "auto"},
  track: {display: "flex", flexDirection: "row", alignItems: "center", minHeight: 24, gap: 4},
  trackLabel: {display: "inline", width: 80, fontSize: 11},
  markers: {position: "relative", display: "block", height: 22, flexGrow: 1},
  markerPosition: {position: "absolute", top: 0, display: "block", transform: "translateX(-50%)"},
  marker: {width: "auto", minWidth: 20, height: 20, padding: "2px 4px", borderRadius: 2, background: rgba8ToColor(buttonColors.inner)},
  selectedMarker: {background: rgba8ToColor(selectedColors.inner), color: rgba8ToColor(selectedColors.text)}
})

export const hudComponentCss = `${buttonComponentCss}\n${hudStyles.cssText}`

type HudWindowActionButtonProps = Readonly<{
  action: HudWindowAction
  onAction?: HudWindowComponentProps["onAction"]
}>

function HudWindowActionButton(props: HudWindowActionButtonProps) {
  const onClick = (event: Event) => props.onAction?.(props.action.key, event)
  return <Button
    label={props.action.label}
    title={props.action.label}
    disabled={props.action.disabled}
    style={hudStyles.button}
    onClick={onClick}
  />
}

type HudFrameHandleButtonProps = Readonly<{
  handle: HudFrameHandle
  onHandle?: HudFrameComponentProps["onHandle"]
}>

function HudFrameHandleButton(props: HudFrameHandleButtonProps) {
  const onClick = (event: Event) => props.onHandle?.(props.handle.key, event)
  return <Button
    label={props.handle.label}
    title={props.handle.label}
    disabled={props.handle.disabled}
    style={hudStyles.button}
    onClick={onClick}
  />
}

export function HudWindow(props: HudWindowComponentProps) {
  assertWindow(props)
  assertButtons(props.actions, "HudWindow action")
  const bodyId = useId()
  const onMinimize = (event: Event) => props.onMinimizedChange?.(!props.minimized, event)
  return <section
    aria-label={props.title}
    style={[
      hudStyles.owner,
      hudStyles.window,
      props.active && hudStyles.activeWindow,
      props.style
    ]}
  >
    <header style={hudStyles.header}>
      <Button
        label={props.minimized ? "+" : "−"}
        title={props.minimized ? "Restore" : "Minimize"}
        aria-label={props.minimized ? "Restore" : "Minimize"}
        aria-expanded={String(!props.minimized)}
        aria-controls={bodyId}
        style={[hudStyles.button, hudStyles.minimizeButton]}
        onClick={onMinimize}
      />
      <span style={hudStyles.title}>{props.title}</span>
      <span style={hudStyles.subtitle}>{props.subtitle}</span>
      <nav aria-label="Window actions" style={hudStyles.nav}>
        {props.actions.map(action => <HudWindowActionButton key={action.key} action={action} onAction={props.onAction} />)}
      </nav>
    </header>
    <section id={bodyId} hidden={props.minimized} style={[hudStyles.body, props.minimized && hudStyles.hidden]}>{props.children}</section>
  </section>
}

export function HudFrame(props: HudFrameComponentProps) {
  if (typeof props.title !== "string") throw new TypeError("HudFrame title must be a string")
  assertEdge(props.edge)
  assertButtons(props.handles, "HudFrame handle")
  return <section
    aria-label={props.title}
    style={[
      hudStyles.owner,
      hudStyles.frame,
      props.style
    ]}
  >
    <span aria-hidden="true" style={[
      hudStyles.edgeIndicator,
      props.edge === "floating" && hudStyles.hidden,
      props.edge === "left" && hudStyles.leftEdge,
      props.edge === "right" && hudStyles.rightEdge,
      props.edge === "top" && hudStyles.topEdge,
      props.edge === "bottom" && hudStyles.bottomEdge
    ]}></span>
    <header style={hudStyles.header}>
      <span style={hudStyles.title}>{props.title}</span>
      <nav aria-label="Frame handles" style={hudStyles.nav}>
        {props.handles.map(handle => <HudFrameHandleButton key={handle.key} handle={handle} onHandle={props.onHandle} />)}
      </nav>
    </header>
    <section style={hudStyles.body}>{props.children}</section>
  </section>
}

type TimelineMarkerViewProps = Readonly<{
  trackKey: string
  marker: TimelineMarker
  min: number
  max: number
  onActivate?: TimelineComponentProps["onMarkerActivate"]
}>

function TimelineMarkerView(props: TimelineMarkerViewProps) {
  const onClick = (event: Event) => props.onActivate?.(props.trackKey, props.marker.key, event)
  return <li
    data-marker-key={props.marker.key}
    data-tick={String(props.marker.tick)}
    aria-current={String(props.marker.selected)}
    style={[hudStyles.markerPosition, markerPosition(props.marker.tick, props.min, props.max)]}
  >
    <Button
      label={props.marker.label}
      title={`${props.marker.label} · ${props.marker.tick}`}
      aria-label={`${props.marker.label} at ${props.marker.tick}`}
      selected={props.marker.selected}
      style={[hudStyles.marker, props.marker.selected && hudStyles.selectedMarker]}
      onClick={onClick}
    />
  </li>
}

type TimelineTrackViewProps = Readonly<{
  track: TimelineTrack
  min: number
  max: number
  onActivate?: TimelineComponentProps["onMarkerActivate"]
}>

function TimelineTrackView(props: TimelineTrackViewProps) {
  assertMarkers(props.track.markers, props.track.key)
  return <li data-track-key={props.track.key} style={hudStyles.track}>
    <span style={hudStyles.trackLabel}>{props.track.label}</span>
    <ul aria-label={`Markers for ${props.track.label}`} style={hudStyles.markers}>
      {props.track.markers.map(marker => <TimelineMarkerView
        key={marker.key}
        trackKey={props.track.key}
        marker={marker}
        min={props.min}
        max={props.max}
        onActivate={props.onActivate}
      />)}
    </ul>
  </li>
}

export function Timeline(props: TimelineComponentProps) {
  assertTimeline(props)
  const togglePlaying = (event: Event) => props.onPlayingChange?.(!props.playing, event)
  return <section
    aria-label={props.title}
    data-min={String(props.min)}
    data-max={String(props.max)}
    data-current={String(props.current)}
    style={[hudStyles.owner, hudStyles.timeline, props.style]}
  >
    <header style={hudStyles.header}>
      <span style={hudStyles.title}>{props.title}</span>
      <time datetime={String(props.current)} aria-label={`Current ${props.current}`} style={hudStyles.current}>{String(props.current)}</time>
      <nav aria-label="Timeline transport" style={hudStyles.nav}>
        <Button label="Previous" title="Previous" style={hudStyles.button} onClick={props.onPrevious} />
        <Button
          label={props.playing ? "Pause" : "Play"}
          title={props.playing ? "Pause" : "Play"}
          selected={props.playing}
          style={hudStyles.button}
          onClick={togglePlaying}
        />
        <Button label="Next" title="Next" style={hudStyles.button} onClick={props.onNext} />
      </nav>
    </header>
    <ul aria-label="Timeline tracks" style={hudStyles.tracks}>
      {props.tracks.map(track => <TimelineTrackView
        key={track.key}
        track={track}
        min={props.min}
        max={props.max}
        onActivate={props.onMarkerActivate}
      />)}
    </ul>
  </section>
}

export type HudWindowComponent = FunctionComponent<HudWindowComponentProps>
export type HudFrameComponent = FunctionComponent<HudFrameComponentProps>
export type TimelineComponent = FunctionComponent<TimelineComponentProps>

function assertButtons(items: readonly Readonly<{key: string; label: string; disabled: boolean}>[], owner: string): void {
  if (!Array.isArray(items)) throw new TypeError(`${owner}s must be an array`)
  const keys = new Set<string>()
  for (const item of items) {
    if (!item || typeof item !== "object") throw new TypeError(`${owner} must be an object`)
    if (typeof item.key !== "string") throw new TypeError(`${owner} key must be a string`)
    if (item.key.length === 0) throw new Error(`${owner} key must not be empty`)
    if (keys.has(item.key)) throw new Error(`${owner} key must be unique: ${item.key}`)
    keys.add(item.key)
    if (typeof item.label !== "string") throw new TypeError(`${owner} ${item.key} label must be a string`)
    if (typeof item.disabled !== "boolean") throw new TypeError(`${owner} ${item.key} disabled must be a boolean`)
  }
}

function assertEdge(edge: HudFrameEdge): void {
  if (edge !== "floating" && edge !== "left" && edge !== "right" && edge !== "top" && edge !== "bottom") {
    throw new Error(`Unknown HudFrame edge: ${String(edge)}`)
  }
}

function assertMarkers(markers: readonly TimelineMarker[], trackKey: string): void {
  if (!Array.isArray(markers)) throw new TypeError(`Timeline track ${trackKey} markers must be an array`)
  const keys = new Set<string>()
  for (const marker of markers) {
    if (!marker || typeof marker !== "object") throw new TypeError(`Timeline track ${trackKey} marker must be an object`)
    if (typeof marker.key !== "string" || marker.key.length === 0) throw new Error(`Timeline marker key must not be empty: ${trackKey}`)
    if (keys.has(marker.key)) throw new Error(`Timeline marker key must be unique: ${trackKey}/${marker.key}`)
    keys.add(marker.key)
    if (!Number.isFinite(marker.tick)) throw new TypeError(`Timeline marker tick must be finite: ${trackKey}/${marker.key}`)
    if (typeof marker.label !== "string") throw new TypeError(`Timeline marker label must be a string: ${trackKey}/${marker.key}`)
    if (typeof marker.selected !== "boolean") throw new TypeError(`Timeline marker selected must be a boolean: ${trackKey}/${marker.key}`)
  }
}

function assertTimeline(props: TimelineComponentProps): void {
  if (typeof props.title !== "string") throw new TypeError("Timeline title must be a string")
  if (typeof props.playing !== "boolean") throw new TypeError("Timeline playing must be a boolean")
  if (![props.min, props.max, props.current].every(Number.isFinite)) throw new TypeError("Timeline range must be finite")
  if (props.max <= props.min) throw new RangeError("Timeline max must be greater than min")
  if (props.current < props.min || props.current > props.max) throw new RangeError("Timeline current must be inside the range")
  if (!Array.isArray(props.tracks)) throw new TypeError("Timeline tracks must be an array")
  const keys = new Set<string>()
  for (const track of props.tracks) {
    if (!track || typeof track !== "object") throw new TypeError("Timeline track must be an object")
    if (typeof track.key !== "string" || track.key.length === 0) throw new Error("Timeline track key must not be empty")
    if (keys.has(track.key)) throw new Error(`Timeline track key must be unique: ${track.key}`)
    keys.add(track.key)
    if (typeof track.label !== "string") throw new TypeError(`Timeline track ${track.key} label must be a string`)
    assertMarkers(track.markers, track.key)
    for (const marker of track.markers) {
      if (marker.tick < props.min || marker.tick > props.max) {
        throw new RangeError(`Timeline marker is outside the range: ${track.key}/${marker.key}`)
      }
    }
  }
}

function assertWindow(props: HudWindowComponentProps): void {
  if (typeof props.title !== "string") throw new TypeError("HudWindow title must be a string")
  if (typeof props.subtitle !== "string") throw new TypeError("HudWindow subtitle must be a string")
  if (typeof props.active !== "boolean") throw new TypeError("HudWindow active must be a boolean")
  if (typeof props.minimized !== "boolean") throw new TypeError("HudWindow minimized must be a boolean")
}

function markerPosition(tick: number, min: number, max: number): CSSProperties {
  return Object.freeze({left: `${(tick - min) / (max - min) * 100}%`})
}

export * from "./hud.ts"
