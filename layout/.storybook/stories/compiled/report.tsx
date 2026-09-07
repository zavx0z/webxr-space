import {createRoot, useState} from "@zavx0z/component"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {algorithmReport, type LayoutReport} from "../reports.ts"
import {workerReport} from "../worker-reports.ts"
import type {OwnerStoryPresentation} from "../story-types.ts"

function ReportView(props: Readonly<{initial: LayoutReport; run: () => Promise<LayoutReport>}>) {
  const [report, setReport] = useState(props.initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const buttonLabel = pending ? "Вычисление…" : "Вычислить снова"
  const outputHeading = report.status === "expected-error" ? "Диагностика отказа" : "Вычисленный результат"
  return <section
    aria-label={report.title}
    data-layout-story={report.route}
    data-layout-status={error === "" ? report.status : "error"}
    style={css`
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 720px;
      padding: 20px;
      background-color: #171b22;
      color: #e0e6ee;
      font-size: 14px;
    `}
  >
    <h2
      style={css`
        margin: 0;
        font-size: 20px;
      `}
    >
      {report.title}
    </h2>
    <p
      style={css`
        margin: 0;
        white-space: normal;
        line-height: 21px;
      `}
    >
      {report.description}
    </p>
    <button
      disabled={pending}
      onClick={async () => {
        setPending(true)
        setError("")
        try {
          setReport(await props.run())
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setPending(false)
        }
      }}
      style={css`
        align-self: flex-start;
        padding: 8px 14px;
        color: #ffffff;
        background-color: #36516f;
        border-radius: 5px;
        border: 1px solid #607d9f;

        &:disabled {
          opacity: 0.5;
        }
      `}
    >
      {buttonLabel}
    </button>
    <p
      role="alert"
      hidden={error === ""}
      style={css`
        margin: 0;
        color: #ffadad;
        white-space: normal;
      `}
    >
      {error}
    </p>
    {report.summary.map(line => <ReportLine
      key={line}
      line={line}
    />)}
    <h3
      style={css`
        margin: 0;
        font-size: 16px;
      `}
    >
      Входные данные
    </h3>
    <pre
      aria-label="Числовой вход"
      style={css`
        margin: 0;
        padding: 12px;
        max-height: 260px;
        overflow: auto;
        white-space: pre-wrap;
        line-height: 18px;
        font-size: 12px;
        background-color: #10141a;
        border: 1px solid #354150;
      `}
    >
      {JSON.stringify(report.input, null, 2)}
    </pre>
    <h3
      style={css`
        margin: 0;
        font-size: 16px;
      `}
    >
      {outputHeading}
    </h3>
    <pre
      aria-label="Числовой результат"
      style={css`
        margin: 0;
        padding: 12px;
        max-height: 340px;
        overflow: auto;
        white-space: pre-wrap;
        line-height: 18px;
        font-size: 12px;
        background-color: #10141a;
        border: 1px solid #354150;
      `}
    >
      {JSON.stringify(report.output, null, 2)}
    </pre>
  </section>
}

function ReportLine(props: Readonly<{line: string}>) {
  return <p
    data-summary={props.line}
    style={css`
      margin: 0;
      white-space: normal;
      line-height: 20px;
    `}
  >
    {props.line}
  </p>
}

export async function createReportStory(document: Document, route: string): Promise<Readonly<{story: OwnerStoryPresentation}>> {
  const abort = new AbortController()
  const run = async () => {
    abort.signal.throwIfAborted()
    return route.startsWith("workers/") ? workerReport(route, abort.signal) : algorithmReport(route)
  }
  const initial = await run()
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<ReportView
    initial={initial}
    run={run}
  />)
  const element = staging.firstElementChild as HTMLElement | null
  if (element === null) {
    root.unmount()
    throw new Error(`Layout story не создала корневой элемент: ${route}`)
  }
  staging.removeChild(element)
  return {
    story: {
      element,
      componentRoot: root,
      get source() {
        return {html: serialize(element), typescript: initial.source}
      },
      props: {...initial},
      dispose() {
        abort.abort()
        root.unmount()
        element.parentNode?.removeChild(element)
      },
    },
  }
}

function serialize(element: Element): string {
  const attributes = element.getAttributeNames().map(name => ` ${name}="${escape(element.getAttribute(name) ?? "")}"`).join("")
  const content = [...element.childNodes].map((node: Node) => node.nodeType === 3
    ? escape(node.textContent ?? "")
    : node.nodeType === 1 ? serialize(node as Element) : "").join("")
  return `<${element.localName}${attributes}>${content}</${element.localName}>`
}

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
