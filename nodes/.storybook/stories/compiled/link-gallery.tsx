import {Arrow} from "@webxr/nodes/markers/arrow"
import type {MarkerProps} from "@webxr/nodes/markers"
import {Link, type LinkRoute} from "@webxr/nodes/link"
import {SOCKET_KINDS, socketPreset, type SocketKind} from "@nodes/sockets/presets"

type Example = Readonly<{
  id: string
  label: string
  kind?: SocketKind
  color?: string
  start?: "open" | "filled"
  end?: "open" | "filled"
}>

export function isLinkGalleryVariant(variant: string): boolean {
  return ["arrows", "filled-arrows", "mixed-markers", "types", "color"].includes(variant)
}

/** Все образцы используют один настоящий Link; подпись описывает переданные props. */
export function linkExamples(variant: string): readonly Example[] {
  if (variant === "types") return [
    {id: "neutral", label: "Без kind — обычная связь"},
    ...SOCKET_KINDS.map(kind => ({id: kind, label: `${socketPreset(kind).label} · kind="${kind}"`, kind})),
  ]
  if (variant === "color") return [
    {id: "color-only", label: 'color="#26a69a" · без kind', color: "#26a69a"},
    {id: "color-over-kind", label: 'color="#ef8b32" · kind="custom"', kind: "custom", color: "#ef8b32"},
  ]
  if (variant === "mixed-markers") return [
    {id: "mixed", label: "Открытая → заполненная", start: "open", end: "filled"},
    {id: "reverse-mixed", label: "Заполненная → открытая", start: "filled", end: "open"},
  ]
  const marker = variant === "filled-arrows" ? "filled" as const : "open" as const
  return [
    {id: "start", label: "Стрелка в начале", start: marker},
    {id: "end", label: "Стрелка в конце", end: marker},
    {id: "both", label: "Стрелки с двух сторон", start: marker, end: marker},
  ]
}

const route: LinkRoute = {kind: "orthogonal", points: [{x: 20, y: 46}, {x: 380, y: 46}]}

export function LinkGallery(props: Readonly<{variant: string}>) {
  const examples = linkExamples(props.variant)
  const description = props.variant === "types"
    ? "Без kind связь серая. Явный kind задаёт цвет типа; custom остаётся отдельным типом."
    : props.variant === "color"
      ? "Явный color имеет приоритет и не добавляет отсутствующий kind."
      : props.variant === "filled-arrows"
        ? 'Заполненный Arrow передаётся компонентом в startMarker и endMarker.'
        : "Компоненты startMarker/endMarker выбираются независимо. Без компонента маркера нет."
  return <section
    aria-label="Варианты Link"
    style={css`
      display: flex;
      flex-direction: column;
      width: ${props.variant === "types" ? 844 : 432}px;
      gap: 12px;
      padding: 16px;
      color: var(--widget-regular-content);
    `}
  >
    <p>{description}</p>
    <div
      style={css`
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      `}
    >
      {examples.map(example => <LinkSample
        key={example.id}
        example={example}
      />)}
    </div>
  </section>
}

function LinkSample(props: Readonly<{example: Example}>) {
  const example = props.example
  return <section
    aria-label={example.label}
    style={css`
      display: flex;
      flex-direction: column;
      position: relative;
      width: 400px;
      height: 68px;
      padding: 8px;
      border: 1px solid var(--widget-regular-outline);
      box-sizing: border-box;
    `}
  >
    <span>{example.label}</span>
    <Link
      id={`example-${example.id}`}
      title={example.label}
      route={route}
      kind={example.kind}
      color={example.color}
      startMarker={example.start === "filled" ? FilledArrow : example.start === "open" ? Arrow : undefined}
      endMarker={example.end === "filled" ? FilledArrow : example.end === "open" ? Arrow : undefined}
    />
  </section>
}

function FilledArrow(props: MarkerProps) {
  return <Arrow
    context={props.context}
    variant="filled"
  />
}

/** Source — самодостаточный авторский пример с теми же публичными props. */
export function linkGallerySource(variant: string): string {
  const examples = JSON.stringify(linkExamples(variant), null, 2)
  return [
    'import {Link, type LinkRoute} from "@webxr/nodes/link"',
    'import {Arrow} from "@webxr/nodes/markers/arrow"',
    'import type {MarkerProps} from "@webxr/nodes/markers"',
    'import type {SocketKind} from "@nodes/sockets/presets"',
    'type Item = {id: string; label: string; kind?: SocketKind; color?: string; start?: "open" | "filled"; end?: "open" | "filled"}',
    `const examples: readonly Item[] = ${examples}`,
    'const route: LinkRoute = {kind: "orthogonal", points: [{x: 20, y: 46}, {x: 380, y: 46}]}',
    'function FilledArrow(props: MarkerProps) {',
    '  return <Arrow',
    '    context={props.context}',
    '    variant="filled"',
    '  />',
    '}',
    'function Sample(props: Readonly<{item: Item}>) {',
    '  const item = props.item',
    '  return <section',
    '    style={css`',
    '      display: flex;',
    '      flex-direction: column;',
    '      position: relative;',
    '      width: 400px;',
    '      height: 68px;',
    '    `}',
    '  >',
    '    <span>{item.label}</span>',
    '    <Link',
    '      id={item.id}',
    '      title={item.label}',
    '      route={route}',
    '      kind={item.kind}',
    '      color={item.color}',
    '      startMarker={item.start === "filled" ? FilledArrow : item.start === "open" ? Arrow : undefined}',
    '      endMarker={item.end === "filled" ? FilledArrow : item.end === "open" ? Arrow : undefined}',
    '    />',
    '  </section>',
    '}',
    'export function Example() {',
    '  return <div',
    '    style={css`',
    '      display: flex;',
    '      flex-wrap: wrap;',
    '      gap: 12px;',
    '    `}',
    '  >',
    '    {examples.map(item => <Sample',
    '      key={item.id}',
    '      item={item}',
    '    />)}',
    '  </div>',
    '}',
  ].join("\n")
}
