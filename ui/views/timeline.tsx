import {
  SurfaceHeader,
  SurfaceOwner,
  SurfaceTitle,
} from "../src/shared/surface-chrome.tsx"

export type TimelineKeyframe = Readonly<{
  key: string
  frame: number
  label: string
  selected?: boolean | undefined
}>

export type TimelineMarker = Readonly<{
  key: string
  label: string
  selected?: boolean | undefined
  frame?: number | undefined
  /** @deprecated Legacy multi-track input; use frame for scene markers. */
  tick?: number | undefined
}>

/** @deprecated Multiple labelled rows belong to a separate multi-channel owner. */
export type TimelineTrack = Readonly<{
  key: string
  label: string
  markers: readonly TimelineMarker[]
}>

export type TimelineProps = Readonly<{
  title: string
  frameStart?: number | undefined
  frameEnd?: number | undefined
  frameCurrent?: number | undefined
  visibleStart?: number | undefined
  visibleEnd?: number | undefined
  previewStart?: number | undefined
  previewEnd?: number | undefined
  showSeconds?: boolean | undefined
  framesPerSecond?: number | undefined
  keyframes?: readonly TimelineKeyframe[] | undefined
  markers?: readonly TimelineMarker[] | undefined
  /** @deprecated Use frameStart. */
  min?: number | undefined
  /** @deprecated Use frameEnd. */
  max?: number | undefined
  /** @deprecated Use frameCurrent. */
  current?: number | undefined
  /** @deprecated Playback state belongs to a separate controller. */
  playing?: boolean | undefined
  /** @deprecated Multiple labelled rows belong to a separate multi-channel owner. */
  tracks?: readonly TimelineTrack[] | undefined
  style?: CssStyle | undefined
  onKeyframeActivate?: ((key: string, event: Event) => void) | undefined
  onSceneMarkerActivate?: ((key: string, event: Event) => void) | undefined
  /** @deprecated Legacy track callback retained only for migration. */
  onMarkerActivate?: ((trackKey: string, markerKey: string, event: Event) => void) | undefined
  /** @deprecated Playback commands belong to a separate controller. */
  onPrevious?: ((event: Event) => void) | undefined
  /** @deprecated Playback commands belong to a separate controller. */
  onPlayingChange?: ((playing: boolean, event: Event) => void) | undefined
  /** @deprecated Playback commands belong to a separate controller. */
  onNext?: ((event: Event) => void) | undefined
}>

export const timelineDefaultProps: TimelineProps = Object.freeze({
  title: "Timeline",
  frameStart: 1,
  frameEnd: 100,
  frameCurrent: 50,
  keyframes: Object.freeze([
    Object.freeze({key: "start", frame: 10, label: "Keyframe 10"}),
    Object.freeze({key: "current", frame: 50, label: "Keyframe 50", selected: true}),
    Object.freeze({key: "end", frame: 90, label: "Keyframe 90"})
  ]),
  markers: Object.freeze([
    Object.freeze({key: "review", frame: 75, label: "Review"})
  ])
})

type NormalizedTimelineKeyframe = TimelineKeyframe & Readonly<{trackKey?: string | undefined}>

type TimelineModel = Readonly<{
  frameStart: number
  frameEnd: number
  frameCurrent: number
  visibleStart: number
  visibleEnd: number
  previewStart: number | null
  previewEnd: number | null
  showSeconds: boolean
  framesPerSecond: number
  keyframes: readonly NormalizedTimelineKeyframe[]
  markers: readonly TimelineMarker[]
}>

type TimelineKeyframeViewProps = Readonly<{
  item: NormalizedTimelineKeyframe
  visibleStart: number
  visibleEnd: number
  onActivate?: TimelineProps["onKeyframeActivate"]
  onLegacyActivate?: TimelineProps["onMarkerActivate"]
}>

function TimelineKeyframeView(props: TimelineKeyframeViewProps) {
  const frame = props.item.frame
  const onClick = (event: Event) => {
    props.onActivate?.(props.item.key, event)
    if (props.item.trackKey !== undefined) props.onLegacyActivate?.(props.item.trackKey, props.item.key, event)
  }
  return <li
    data-keyframe-key={props.item.key}
    data-frame={String(frame)}
    style={css`
      position: absolute;
      top: 17px;
      left: ${timelinePercent(frame, props.visibleStart, props.visibleEnd)}%;
      display: block;
      transform: translateX(-50%);
    `}
  >
    <button
      type="button"
      title={`${props.item.label} · ${frame}`}
      aria-label={`${props.item.label} at frame ${frame}`}
      aria-pressed={String(props.item.selected === true)}
      onClick={onClick}
      style={css`
        box-sizing: border-box;
        display: block;
        width: 10px;
        height: 10px;
        padding: 0;
        border: 1px solid var(--widget-regular-content);
        border-radius: 1px;
        background: var(--widget-toolbar-background);
        transform: rotate(45deg);

        &:hover {
          background: var(--widget-hover-background);
        }

        &:focus {
          border-color: var(--widget-focus-outline);
        }

        &[aria-pressed="true"] {
          background: var(--widget-toolbar-background-selected);
          border-color: var(--widget-toolbar-content-selected);
        }
      `}
    >
    </button>
  </li>
}

function TimelineKeyframes(props: Readonly<{
  items: readonly NormalizedTimelineKeyframe[]
  visibleStart: number
  visibleEnd: number
  onActivate?: TimelineProps["onKeyframeActivate"]
  onLegacyActivate?: TimelineProps["onMarkerActivate"]
}>) {
  return <ol
    aria-label="Summary keyframes"
    style={css`
      position: relative;
      display: block;
      width: 100%;
      height: 44px;
      margin: 0;
      padding: 0;
      border-top: var(--border-width-control) solid var(--widget-regular-outline);
      border-bottom: var(--border-width-control) solid var(--widget-regular-outline);
    `}
  >
    {props.items.map(item => <TimelineKeyframeView
      key={item.key}
      item={item}
      visibleStart={props.visibleStart}
      visibleEnd={props.visibleEnd}
      onActivate={props.onActivate}
      onLegacyActivate={props.onLegacyActivate}
    />)}
  </ol>
}

type TimelineMarkerViewProps = Readonly<{
  marker: TimelineMarker
  visibleStart: number
  visibleEnd: number
  onActivate?: TimelineProps["onSceneMarkerActivate"]
}>

function TimelineMarkerView(props: TimelineMarkerViewProps) {
  const frame = timelineMarkerFrame(props.marker)
  const onClick = (event: Event) => props.onActivate?.(props.marker.key, event)
  return <li
    data-marker-key={props.marker.key}
    data-frame={String(frame)}
    style={css`
      position: absolute;
      top: 0;
      left: ${timelinePercent(frame, props.visibleStart, props.visibleEnd)}%;
      display: block;
      transform: translateX(-50%);
    `}
  >
    <button
      type="button"
      title={`${props.marker.label} · ${frame}`}
      aria-label={`${props.marker.label} at frame ${frame}`}
      aria-pressed={String(props.marker.selected === true)}
      onClick={onClick}
      style={css`
        box-sizing: border-box;
        display: block;
        width: auto;
        min-width: 32px;
        height: 20px;
        padding: 2px 4px;
        border: var(--border-width-control) solid var(--widget-regular-outline);
        border-radius: 2px;
        background: var(--widget-toolbar-background);
        color: var(--widget-toolbar-content);
        font-size: var(--font-size-2xs);

        &:hover {
          background: var(--widget-hover-background);
        }

        &[aria-pressed="true"] {
          background: var(--widget-toolbar-background-selected);
          color: var(--widget-toolbar-content-selected);
        }
      `}
    >
      {props.marker.label}
    </button>
  </li>
}

function TimelineMarkers(props: Readonly<{
  items: readonly TimelineMarker[]
  visibleStart: number
  visibleEnd: number
  onActivate?: TimelineProps["onSceneMarkerActivate"]
}>) {
  return <ol
    aria-label="Timeline markers"
    style={css`
      position: relative;
      display: block;
      width: 100%;
      height: 22px;
      margin: 0;
      padding: 0;
    `}
  >
    {props.items.map(marker => <TimelineMarkerView
      key={marker.key}
      marker={marker}
      visibleStart={props.visibleStart}
      visibleEnd={props.visibleEnd}
      onActivate={props.onActivate}
    />)}
  </ol>
}

function TimelineOutput(props: Readonly<{model: TimelineModel}>) {
  return <output
    aria-label={`Current frame ${props.model.frameCurrent}`}
    style={css`
      display: inline;
      color: var(--widget-toolbar-content-selected);
      font-size: var(--font-size-xs);
    `}
  >
    {formatTimelineFrame(props.model.frameCurrent, props.model.showSeconds, props.model.framesPerSecond)}
  </output>
}

type TimelineBodyProps = Readonly<{
  model: TimelineModel
  onKeyframeActivate?: TimelineProps["onKeyframeActivate"]
  onMarkerActivate?: TimelineProps["onMarkerActivate"]
  onSceneMarkerActivate?: TimelineProps["onSceneMarkerActivate"]
}>

function TimelineBody(props: TimelineBodyProps) {
  const {model} = props
  const previewVisible = model.previewStart !== null && model.previewEnd !== null
  const previewLeft = timelinePercent(model.previewStart ?? model.visibleStart, model.visibleStart, model.visibleEnd)
  const previewRight = timelinePercent(model.previewEnd ?? model.visibleStart, model.visibleStart, model.visibleEnd)
  return <div
    data-time-view=""
    style={css`
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      width: 100%;
      gap: 2px;
      padding: 4px 10px 6px;
      overflow: clip;
    `}
  >
    <div
      aria-label="Visible frame range"
      style={css`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        width: 100%;
        height: 16px;
        color: var(--widget-text-content-readonly);
        font-size: var(--font-size-2xs);
      `}
    >
      <span>{formatTimelineFrame(model.visibleStart, model.showSeconds, model.framesPerSecond)}</span>
      <span>{formatTimelineFrame(model.visibleEnd, model.showSeconds, model.framesPerSecond)}</span>
    </div>
    <span
      aria-label="Preview range"
      hidden={!previewVisible}
      style={css`
        position: absolute;
        left: ${previewLeft}%;
        top: 20px;
        width: ${Math.max(0, previewRight - previewLeft)}%;
        height: 44px;
        background: var(--widget-regular-background-selected);
        opacity: 0.22;

        &[hidden] {
          display: none;
        }
      `}
    >
    </span>
    <TimelineKeyframes
      items={model.keyframes}
      visibleStart={model.visibleStart}
      visibleEnd={model.visibleEnd}
      onActivate={props.onKeyframeActivate}
      onLegacyActivate={props.onMarkerActivate}
    />
    <TimelineMarkers
      items={model.markers}
      visibleStart={model.visibleStart}
      visibleEnd={model.visibleEnd}
      onActivate={props.onSceneMarkerActivate}
    />
    <span
      aria-label={`Playhead at frame ${model.frameCurrent}`}
      style={css`
        position: absolute;
        left: ${timelinePercent(model.frameCurrent, model.visibleStart, model.visibleEnd)}%;
        top: 18px;
        display: block;
        width: 1px;
        height: 50px;
        background: var(--state-error);
      `}
    >
    </span>
  </div>
}

export function Timeline(props: TimelineProps) {
  const model = normalizeTimelineProps(props)
  return <SurfaceOwner
    label={props.title}
    timeline
    frameStart={model.frameStart}
    frameEnd={model.frameEnd}
    frameCurrent={model.frameCurrent}
    style={css`
      width: 640px;
      min-height: 140px;

      ${props.style}
    `}
  >
    <SurfaceHeader key="header">
      <SurfaceTitle key="title" text={props.title} />
      <TimelineOutput key="output" model={model} />
    </SurfaceHeader>
    <TimelineBody
      key="body"
      model={model}
      onKeyframeActivate={props.onKeyframeActivate}
      onMarkerActivate={props.onMarkerActivate}
      onSceneMarkerActivate={props.onSceneMarkerActivate}
    />
  </SurfaceOwner>
}

function normalizeTimelineProps(props: TimelineProps): TimelineModel {
  if (typeof props.title !== "string") throw new TypeError("Timeline title must be a string")
  const frameStart = finiteTimelineValue(props.frameStart ?? props.min ?? 1, "frameStart")
  const frameEnd = finiteTimelineValue(props.frameEnd ?? props.max ?? 100, "frameEnd")
  const frameCurrent = finiteTimelineValue(props.frameCurrent ?? props.current ?? frameStart, "frameCurrent")
  if (frameEnd <= frameStart) throw new RangeError("Timeline frameEnd must be greater than frameStart")
  if (frameCurrent < frameStart || frameCurrent > frameEnd) {
    throw new RangeError("Timeline frameCurrent must be inside the playback range")
  }
  const visibleStart = finiteTimelineValue(props.visibleStart ?? frameStart, "visibleStart")
  const visibleEnd = finiteTimelineValue(props.visibleEnd ?? frameEnd, "visibleEnd")
  if (visibleEnd <= visibleStart) throw new RangeError("Timeline visibleEnd must be greater than visibleStart")
  const previewStart = props.previewStart === undefined ? null : finiteTimelineValue(props.previewStart, "previewStart")
  const previewEnd = props.previewEnd === undefined ? null : finiteTimelineValue(props.previewEnd, "previewEnd")
  if ((previewStart === null) !== (previewEnd === null)) throw new Error("Timeline preview range requires both endpoints")
  if (previewStart !== null && previewEnd !== null && previewEnd < previewStart) {
    throw new RangeError("Timeline previewEnd must not be less than previewStart")
  }
  const framesPerSecond = finiteTimelineValue(props.framesPerSecond ?? 24, "framesPerSecond")
  if (framesPerSecond <= 0) throw new RangeError("Timeline framesPerSecond must be positive")
  const keyframes = props.keyframes === undefined
    ? legacyTimelineKeyframes(props.tracks ?? [], frameStart, frameEnd)
    : validateTimelineKeyframes(props.keyframes, frameStart, frameEnd)
  const markers = validateTimelineMarkers(props.markers ?? [], frameStart, frameEnd)
  return Object.freeze({
    frameStart,
    frameEnd,
    frameCurrent,
    visibleStart,
    visibleEnd,
    previewStart,
    previewEnd,
    showSeconds: props.showSeconds === true,
    framesPerSecond,
    keyframes,
    markers
  })
}

function validateTimelineKeyframes(
  items: readonly TimelineKeyframe[],
  minimum: number,
  maximum: number
): readonly NormalizedTimelineKeyframe[] {
  if (!Array.isArray(items)) throw new TypeError("Timeline keyframes must be an array")
  const keys = new Set<string>()
  return Object.freeze(items.map(item => {
    if (!item || typeof item !== "object") throw new TypeError("Timeline keyframe must be an object")
    assertTimelinePoint(item.key, item.frame, item.label, item.selected, keys, minimum, maximum, "keyframe")
    return Object.freeze({...item})
  }))
}

function validateTimelineMarkers(
  items: readonly TimelineMarker[],
  minimum: number,
  maximum: number
): readonly TimelineMarker[] {
  if (!Array.isArray(items)) throw new TypeError("Timeline markers must be an array")
  const keys = new Set<string>()
  return Object.freeze(items.map(item => {
    const frame = timelineMarkerFrame(item)
    assertTimelinePoint(item.key, frame, item.label, item.selected, keys, minimum, maximum, "marker")
    return Object.freeze({...item, frame})
  }))
}

function legacyTimelineKeyframes(
  tracks: readonly TimelineTrack[],
  minimum: number,
  maximum: number
): readonly NormalizedTimelineKeyframe[] {
  if (!Array.isArray(tracks)) throw new TypeError("Timeline tracks must be an array")
  const trackKeys = new Set<string>()
  const pointKeys = new Set<string>()
  const output: NormalizedTimelineKeyframe[] = []
  for (const track of tracks) {
    if (!track || typeof track !== "object") throw new TypeError("Timeline track must be an object")
    if (typeof track.key !== "string" || track.key.length === 0) throw new Error("Timeline track key must not be empty")
    if (trackKeys.has(track.key)) throw new Error(`Timeline track key must be unique: ${track.key}`)
    trackKeys.add(track.key)
    if (typeof track.label !== "string") throw new TypeError(`Timeline track ${track.key} label must be a string`)
    if (!Array.isArray(track.markers)) throw new TypeError(`Timeline track ${track.key} markers must be an array`)
    for (const marker of track.markers) {
      const frame = timelineMarkerFrame(marker)
      if (pointKeys.has(marker.key)) continue
      assertTimelinePoint(marker.key, frame, marker.label, marker.selected, pointKeys, minimum, maximum, "keyframe")
      output.push(Object.freeze({
        key: marker.key,
        frame,
        label: marker.label,
        selected: marker.selected,
        trackKey: track.key
      }))
    }
  }
  return Object.freeze(output)
}

function assertTimelinePoint(
  key: string,
  frame: number,
  label: string,
  selected: boolean | undefined,
  keys: Set<string>,
  minimum: number,
  maximum: number,
  kind: string
): void {
  if (typeof key !== "string" || key.length === 0) throw new Error(`Timeline ${kind} key must not be empty`)
  if (keys.has(key)) throw new Error(`Timeline ${kind} key must be unique: ${key}`)
  keys.add(key)
  if (!Number.isFinite(frame)) throw new TypeError(`Timeline ${kind} frame must be finite: ${key}`)
  if (frame < minimum || frame > maximum) throw new RangeError(`Timeline ${kind} is outside the playback range: ${key}`)
  if (typeof label !== "string") throw new TypeError(`Timeline ${kind} label must be a string: ${key}`)
  if (selected !== undefined && typeof selected !== "boolean") throw new TypeError(`Timeline ${kind} selected must be a boolean: ${key}`)
}

function timelineMarkerFrame(marker: TimelineMarker): number {
  return marker.frame ?? marker.tick ?? Number.NaN
}

function finiteTimelineValue(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`Timeline ${label} must be finite`)
  return value
}

function timelinePercent(frame: number, minimum: number, maximum: number): number {
  return Math.min(100, Math.max(0, (frame - minimum) / (maximum - minimum) * 100))
}

function formatTimelineFrame(frame: number, showSeconds: boolean, framesPerSecond: number): string {
  return showSeconds ? `${roundedTimelineValue(frame / framesPerSecond)}s` : String(roundedTimelineValue(frame))
}

function roundedTimelineValue(value: number): number {
  return Math.round(value * 1000) / 1000
}
