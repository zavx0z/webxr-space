import {createRoot, useState} from "@zavx0z/component"
import type {Document, Element, HTMLElement} from "@zavx0z/dom"
import {getScenario, type ModelScenario, type ScenarioResult} from "./scenarios.ts"

type StoryState = Readonly<{result: ScenarioResult; runs: number; pending: boolean; error: string}>

function ScenarioView(props: Readonly<{
  scenario: ModelScenario
  initial: ScenarioResult
  active(): boolean
}>) {
  const [state, setState] = useState<StoryState>({result: props.initial, runs: 1, pending: false, error: ""})
  const buttonLabel = state.pending ? "Выполняется…" : "Повторить сценарий"
  const status = state.error || `Выполнений: ${state.runs}. Результаты получены вызовами API NodeTree.`
  const rerun = async () => {
    if (state.pending || !props.active()) return
    setState(current => ({...current, pending: true, error: ""}))
    try {
      const result = await props.scenario.run()
      if (props.active()) setState(current => ({result, runs: current.runs + 1, pending: false, error: ""}))
    } catch (error) {
      if (props.active()) setState(current => ({...current, pending: false, error: error instanceof Error ? error.message : String(error)}))
    }
  }
  return (
    <section
      aria-label={props.scenario.label}
      data-story-component="nodetree-model"
      data-scenario-route={props.scenario.route}
      data-scenario-runs={String(state.runs)}
      style={css`
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 720px;
        padding: 20px;
        box-sizing: border-box;
        color: #e4e9f2;
        background: #161c27;
        border: 1px solid #344055;
        border-radius: 10px;
        font-family: sans-serif;
        font-size: 14px;
      `}
    >
      <h2
        style={css`
          margin: 0;
          font-size: 20px;
          color: #f4f7ff;
        `}
      >
        {props.scenario.label}
      </h2>
      <p
        style={css`
          margin: 0;
          color: #b9c7dc;
          line-height: 1.5;
        `}
      >
        {props.scenario.description}
      </p>
      <button
        type="button"
        disabled={state.pending}
        onClick={rerun}
        style={css`
          align-self: flex-start;
          padding: 8px 12px;
          border: 1px solid #6484b6;
          border-radius: 6px;
          color: #ffffff;
          background: #29476f;

          &:hover {
            background: #345987;
          }

          &:disabled {
            opacity: 0.5;
          }
        `}
      >
        {buttonLabel}
      </button>
      <p
        role="status"
        style={css`
          margin: 0;
          color: #91d7b0;
        `}
      >
        {status}
      </p>
      <ResultSection
        title="Вход и действия"
        values={state.result.input}
      />
      <ResultSection
        title="Результат"
        values={state.result.result}
      />
    </section>
  )
}

function ResultSection(props: Readonly<{title: string; values: Readonly<Record<string, unknown>>}>) {
  const rows = Object.entries(props.values).map(([name, value]) => ({name, value}))
  return (
    <section
      aria-label={props.title}
      style={css`
        display: flex;
        flex-direction: column;
        gap: 8px;
      `}
    >
      <h3
        style={css`
          margin: 0;
          font-size: 16px;
        `}
      >
        {props.title}
      </h3>
      {rows.map(row => (
        <ResultRow
          key={row.name}
          name={row.name}
          value={row.value}
        />
      ))}
    </section>
  )
}

function ResultRow(props: Readonly<{name: string; value: unknown}>) {
  const text = typeof props.value === "string" ? props.value : JSON.stringify(props.value, null, 2)
  return <div
    data-result-key={props.name}
    style={css`
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 10px;
      background: #0f1520;
      border-radius: 4px;
    `}
  >
    <strong
      style={css`
        color: #90b9f3;
        font-size: 12px;
      `}
    >
      {props.name}
    </strong>
    <p
      style={css`
        margin: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        line-height: 1.4;
      `}
    >
      {text}
    </p>
  </div>
}

export async function createCompiledModelStory(document: Document, route: string) {
  const scenario = getScenario(route)
  const initial = await scenario.run()
  let disposed = false
  const staging = document.createElement("div")
  const root = createRoot(staging)
  try {
    root.render(
      <ScenarioView
        scenario={scenario}
        initial={initial}
        active={() => !disposed}
      />,
    )
  } catch (error) {
    disposed = true
    root.unmount()
    throw error
  }
  const element = staging.firstElementChild as HTMLElement | null
  if (element === null) {
    root.unmount()
    throw new Error(`Сценарий NodeTree не создал semantic Element: ${route}`)
  }
  staging.removeChild(element)
  return Object.freeze({
    story: Object.freeze({
      element,
      componentRoot: root,
      props: Object.freeze({route, ...initial}),
      get source() {
        return Object.freeze({
          html: serialize(element),
          typescript: `// Production API: @zavx0z/nodetree\n// Полный исполняемый fixture: .storybook/stories/scenarios.ts\n${scenario.run.toString()}`,
        })
      },
      dispose() {
        if (disposed) return
        disposed = true
        root.unmount()
      },
    }),
  })
}

function serialize(element: Element): string {
  const attributes = element.getAttributeNames().map(name => ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`).join("")
  const children = [...element.childNodes].map(child => child.nodeType === 1
    ? serialize(child as Element)
    : escapeHtml(child.textContent ?? "")).join("")
  return `<${element.localName}${attributes}>${children}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
