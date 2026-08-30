import type {Event} from "@zavx0z/dom"
import {useId} from "@zavx0z/react"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {Button} from "./button.tsx"

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
  children: JsxSourceElement | null
  style?: CssStyle | undefined
  onMinimizedChange?: ((minimized: boolean, event: Event) => void) | undefined
  onAction?: ((key: string, event: Event) => void) | undefined
}>

export type HudWindowDefaultProps = Pick<
  HudWindowProps,
  "title" | "subtitle" | "active" | "minimized" | "actions"
>

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
  children: JsxSourceElement | null
  style?: CssStyle | undefined
  onHandle?: ((key: string, event: Event) => void) | undefined
}>

export type HudFrameDefaultProps = Pick<HudFrameProps, "title" | "edge" | "handles">

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
  style?: CssStyle | undefined
  onPrevious?: ((event: Event) => void) | undefined
  onPlayingChange?: ((playing: boolean, event: Event) => void) | undefined
  onNext?: ((event: Event) => void) | undefined
  onMarkerActivate?: ((trackKey: string, markerKey: string, event: Event) => void) | undefined
}>

export const hudWindowDefaultProps: HudWindowDefaultProps = Object.freeze({
  title: "Output",
  subtitle: "HUD window",
  active: true,
  minimized: false,
  actions: Object.freeze([
    Object.freeze({key: "pin", label: "Pin", disabled: false}),
    Object.freeze({key: "close", label: "Close", disabled: false})
  ])
})

export const hudFrameDefaultProps: HudFrameDefaultProps = Object.freeze({
  title: "Frame",
  edge: "right",
  handles: Object.freeze([
    Object.freeze({key: "move", label: "Move", disabled: false}),
    Object.freeze({key: "resize", label: "Resize", disabled: false}),
    Object.freeze({key: "dock", label: "Dock", disabled: false})
  ])
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
        Object.freeze({key: "current", tick: 50, label: "Current", selected: true})
      ])
    }),
    Object.freeze({
      key: "events",
      label: "Events",
      markers: Object.freeze([
        Object.freeze({key: "event", tick: 75, label: "Event", selected: false})
      ])
    })
  ])
})

const ownerCss = css`
  & {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    position: relative;
    border: var(--border-width-control) solid var(--widget-toolbar-outline);
    border-radius: 6px;
    background: var(--space-node-navigation-background);
    color: var(--widget-toolbar-content);
    overflow: clip;
  }
`
const headerCss = css`
  & { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; height: 28px; gap: 4px; padding: 3px 6px; background: var(--space-node-header-background); }
`
const titleCss = css`
  & { display: inline; min-width: 0; flex-grow: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: var(--font-size-sm); }
`
const subtitleCss = css`
  & { display: inline; color: var(--widget-text-content-readonly); font-size: var(--font-size-2xs); }
`
const navCss = css`& { display: flex; flex-direction: row; gap: 4px; }`
const bodyCss = css`& { box-sizing: border-box; display: block; flex-grow: 1; padding: 6px; }`
const hiddenCss = css`& { display: none; }`
const buttonStyle: CssStyle = css`& { width: 52px; min-width: 22px; height: 22px; padding: 2px 6px; font-size: 10px; }`
const minimizeButtonStyle: CssStyle = css`& { width: 22px; }`
const markerStyle: CssStyle = css`
  & { width: auto; min-width: 20px; height: 20px; padding: 2px 4px; border-radius: 2px; background: var(--widget-toolbar-background); }
`
const selectedMarkerStyle: CssStyle = css`
  & { background: var(--widget-toolbar-background-selected); color: var(--widget-toolbar-content-selected); }
`

type HudWindowActionButtonProps = Readonly<{
  action: HudWindowAction
  onAction?: HudWindowProps["onAction"]
}>

function HudWindowActionButton(props: HudWindowActionButtonProps) {
  const onClick = (event: Event) => props.onAction?.(props.action.key, event)
  return <Button
    label={props.action.label}
    title={props.action.label}
    disabled={props.action.disabled}
    style={buttonStyle}
    onClick={onClick}
  />
}

type HudFrameHandleButtonProps = Readonly<{
  handle: HudFrameHandle
  onHandle?: HudFrameProps["onHandle"]
}>

function HudFrameHandleButton(props: HudFrameHandleButtonProps) {
  const onClick = (event: Event) => props.onHandle?.(props.handle.key, event)
  return <Button
    label={props.handle.label}
    title={props.handle.label}
    disabled={props.handle.disabled}
    style={buttonStyle}
    onClick={onClick}
  />
}

export function HudWindow(props: HudWindowProps) {
  assertWindow(props)
  assertButtons(props.actions, "HudWindow action")
  const bodyId = useId()
  const onMinimize = (event: Event) => props.onMinimizedChange?.(!props.minimized, event)
  return <section
    aria-label={props.title}
    data-active={props.active ? "true" : undefined}
    style={css`
      ${ownerCss}
      & { width: 320px; min-height: 160px; }
      &[data-active="true"] { border-color: var(--material-editor-outline-active); }
      ${props.style}
    `}
  >
    <header style={headerCss}>
      <Button
        label={props.minimized ? "+" : "−"}
        title={props.minimized ? "Restore" : "Minimize"}
        aria-label={props.minimized ? "Restore" : "Minimize"}
        aria-expanded={String(!props.minimized)}
        aria-controls={bodyId}
        style={css`${buttonStyle}${minimizeButtonStyle}`}
        onClick={onMinimize}
      />
      <span style={titleCss}>{props.title}</span>
      <span style={subtitleCss}>{props.subtitle}</span>
      <nav aria-label="Window actions" style={navCss}>
        {props.actions.map(action => <HudWindowActionButton key={action.key} action={action} onAction={props.onAction} />)}
      </nav>
    </header>
    <section id={bodyId} hidden={props.minimized} style={css`${bodyCss}${props.minimized && hiddenCss}`}>{props.children}</section>
  </section>
}

export function HudFrame(props: HudFrameProps) {
  if (typeof props.title !== "string") throw new TypeError("HudFrame title must be a string")
  assertEdge(props.edge)
  assertButtons(props.handles, "HudFrame handle")
  return <section
    aria-label={props.title}
    style={css`${ownerCss}${css`& { width: 300px; min-height: 140px; }`}${props.style}`}
  >
    <span aria-hidden="true" data-edge={props.edge} style={css`
      & { position: absolute; display: block; background: var(--widget-toolbar-background-selected); }
      &[data-edge="floating"] { display: none; }
      &[data-edge="left"] { left: 0; top: 0; width: 1px; height: 100%; }
      &[data-edge="right"] { right: 0; top: 0; width: 1px; height: 100%; }
      &[data-edge="top"] { left: 0; top: 0; width: 100%; height: 1px; }
      &[data-edge="bottom"] { left: 0; bottom: 0; width: 100%; height: 1px; }
    `}></span>
    <header style={headerCss}>
      <span style={titleCss}>{props.title}</span>
      <nav aria-label="Frame handles" style={navCss}>
        {props.handles.map(handle => <HudFrameHandleButton key={handle.key} handle={handle} onHandle={props.onHandle} />)}
      </nav>
    </header>
    <section style={bodyCss}>{props.children}</section>
  </section>
}

type TimelineMarkerViewProps = Readonly<{
  trackKey: string
  marker: TimelineMarker
  min: number
  max: number
  onActivate?: TimelineProps["onMarkerActivate"]
}>

function TimelineMarkerView(props: TimelineMarkerViewProps) {
  const onClick = (event: Event) => props.onActivate?.(props.trackKey, props.marker.key, event)
  return <li
    data-marker-key={props.marker.key}
    data-tick={String(props.marker.tick)}
    aria-current={String(props.marker.selected)}
    style={css`
      & { position: absolute; top: 0; left: ${(props.marker.tick - props.min) / (props.max - props.min) * 100}%; display: block; transform: translateX(-50%); }
    `}
  >
    <Button
      label={props.marker.label}
      title={`${props.marker.label} · ${props.marker.tick}`}
      aria-label={`${props.marker.label} at ${props.marker.tick}`}
      selected={props.marker.selected}
      style={css`${markerStyle}${props.marker.selected && selectedMarkerStyle}`}
      onClick={onClick}
    />
  </li>
}

type TimelineTrackViewProps = Readonly<{
  track: TimelineTrack
  min: number
  max: number
  onActivate?: TimelineProps["onMarkerActivate"]
}>

function TimelineTrackView(props: TimelineTrackViewProps) {
  assertMarkers(props.track.markers, props.track.key)
  return <li data-track-key={props.track.key} style={css`
    & { display: flex; flex-direction: row; align-items: center; min-height: 24px; gap: 4px; }
  `}>
    <span style={css`& { display: inline; width: 80px; font-size: var(--font-size-xs); }`}>{props.track.label}</span>
    <ul aria-label={`Markers for ${props.track.label}`} style={css`
      & { position: relative; display: block; height: 22px; flex-grow: 1; }
    `}>
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

export function Timeline(props: TimelineProps) {
  assertTimeline(props)
  const togglePlaying = (event: Event) => props.onPlayingChange?.(!props.playing, event)
  return <section
    aria-label={props.title}
    data-min={String(props.min)}
    data-max={String(props.max)}
    data-current={String(props.current)}
    style={css`${ownerCss}${css`& { width: 640px; min-height: 140px; }`}${props.style}`}
  >
    <header style={headerCss}>
      <span style={titleCss}>{props.title}</span>
      <time datetime={String(props.current)} aria-label={`Current ${props.current}`} style={css`
        & { display: inline; color: var(--widget-toolbar-content-selected); font-size: var(--font-size-xs); }
      `}>{String(props.current)}</time>
      <nav aria-label="Timeline transport" style={navCss}>
        <Button label="Previous" title="Previous" style={buttonStyle} onClick={props.onPrevious} />
        <Button
          label={props.playing ? "Pause" : "Play"}
          title={props.playing ? "Pause" : "Play"}
          selected={props.playing}
          style={buttonStyle}
          onClick={togglePlaying}
        />
        <Button label="Next" title="Next" style={buttonStyle} onClick={props.onNext} />
      </nav>
    </header>
    <ul aria-label="Timeline tracks" style={css`
      & { box-sizing: border-box; display: flex; flex-direction: column; flex-grow: 1; gap: 2px; padding: 4px; overflow-y: auto; }
    `}>
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

function assertTimeline(props: TimelineProps): void {
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

function assertWindow(props: HudWindowProps): void {
  if (typeof props.title !== "string") throw new TypeError("HudWindow title must be a string")
  if (typeof props.subtitle !== "string") throw new TypeError("HudWindow subtitle must be a string")
  if (typeof props.active !== "boolean") throw new TypeError("HudWindow active must be a boolean")
  if (typeof props.minimized !== "boolean") throw new TypeError("HudWindow minimized must be a boolean")
}
