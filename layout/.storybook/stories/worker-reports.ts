import {layoutFixed} from "@zavx0z/layout/fixed"
import {layoutAdaptiveWithDiagnostics} from "@zavx0z/layout/adaptive"
import {layoutTopDown} from "@zavx0z/layout/top-down"
import {layoutCoffmanGraham} from "@zavx0z/layout/coffman-graham"
import {WorkerRemoteError} from "@zavx0z/layout/worker/transport"
import {fixedGraph, conflictingFixedGraph, adaptiveGraph, invalidAdaptiveGraph, topDownGraph, coffmanGrahamGraph} from "./fixtures.ts"
import type {LayoutReport} from "./reports.ts"
import {transportFaultReport} from "./worker-transport-probe.ts"

type Client<Graph, Response> = Readonly<{
  layout(input: Readonly<{generation: number; graph: Graph}>): Promise<Response>
  dispose(): void
}>

export async function workerReport(route: string, signal?: AbortSignal): Promise<LayoutReport> {
  const [, policy, variant] = route.split("/")
  const failure = variant === "failure"
  signal?.throwIfAborted()
  if (policy === "transport") return variant === "faults" ? transportFaultReport(route) : transportLifecycleReport(route, signal)
  if (policy === "fixed") {
    const {createClient} = await import("./workers/fixed.ts")
    const graph = failure ? conflictingFixedGraph() : fixedGraph()
    return runWorker(route, createClient(), graph, () => ({result: layoutFixed(graph)}), failure, signal)
  }
  if (policy === "adaptive") {
    const {createClient} = await import("./workers/adaptive.ts")
    const graph = failure ? invalidAdaptiveGraph() : adaptiveGraph()
    return runWorker(route, createClient(), graph, () => layoutAdaptiveWithDiagnostics(graph), failure, signal)
  }
  if (policy === "top-down") {
    const {createClient} = await import("./workers/top-down.ts")
    const graph = topDownGraph(failure)
    return runWorker(route, createClient(), graph, () => ({result: layoutTopDown(graph)}), failure, signal)
  }
  if (policy === "coffman-graham") {
    const {createClient} = await import("./workers/coffman-graham.ts")
    const graph = coffmanGrahamGraph(2, failure)
    return runWorker(route, createClient(), graph, () => ({result: layoutCoffmanGraham(graph)}), failure, signal)
  }
  throw new Error(`Неизвестный Worker: ${route}`)
}

async function runWorker<Graph, Response extends Readonly<{requestId: number; generation: number; result: unknown}>>(
  route: string,
  client: Client<Graph, Response>,
  graph: Graph,
  direct: () => Readonly<{result: unknown; diagnostics?: unknown}>,
  failure: boolean,
  signal?: AbortSignal,
): Promise<LayoutReport> {
  const policy = route.split("/")[1]!
  const source = [
    `// Отдельный same-origin module Worker: .storybook/stories/workers/${policy}.ts`,
    `import {createClient} from "./workers/${policy}.ts"`,
    `const graph = ${JSON.stringify(graph, null, 2)}`,
    "const client = createClient()",
    "try {",
    "  const response = await client.layout({generation: 7, graph})",
    "} finally {",
    "  client.dispose()",
    "}",
  ].join("\n")
  try {
    let response: Response
    try {
      response = await bounded(client.layout({generation: 7, graph}), signal)
    } catch (error) {
      if (!failure || !(error instanceof WorkerRemoteError)) throw error
      const code = "code" in error.serialized ? error.serialized.code : undefined
      const expected = policy === "fixed"
        ? error.message.startsWith("Port has conflicting edge roles:")
        : policy === "adaptive" ? code === "NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT" : code === "CYCLE_DETECTED"
      if (!expected) throw error
      return {
        route,
        title: `${policy} · ошибка из Worker`,
        description: "Production executor выполняется в отдельном module Worker. Публичный client получает сериализованный отказ; расчёт в основном потоке не подставляется.",
        status: "expected-error",
        input: {generation: 7, graph},
        output: error.serialized,
        summary: ["Получен WorkerRemoteError", error.message, "Worker освобождён через client.dispose()"],
        source,
      }
    }
    if (failure) throw new Error(`Worker не вернул ожидаемую ошибку: ${route}`)
    const expected = direct()
    const equivalent = JSON.stringify(response.result) === JSON.stringify(expected.result)
    const diagnosticsEqual = JSON.stringify("diagnostics" in response ? response.diagnostics : undefined) === JSON.stringify(expected.diagnostics)
    if (!equivalent || !diagnosticsEqual) throw new Error(`Worker result отличается от direct API: ${route}`)
    return {
      route,
      title: `${policy} · отдельный Worker`,
      description: "Тот же числовой graph рассчитан прямым API и отдельным module Worker через production client/executor. Сравнение результата и диагностики выполнено после получения сообщения.",
      status: "result",
      input: {generation: 7, graph},
      output: {response, direct: expected, equivalent, diagnosticsEqual},
      summary: [`requestId: ${response.requestId} · generation: ${response.generation}`, "Числовой результат совпадает с прямым API", "Диагностика совпадает", "Worker освобождён через client.dispose()"],
      source,
    }
  } finally {
    client.dispose()
  }
}

async function transportLifecycleReport(route: string, signal?: AbortSignal): Promise<LayoutReport> {
  const {createClient} = await import("./workers/fixed.ts")
  const client = createClient()
  const graph = fixedGraph()
  try {
    const obsolete = client.layout({generation: 1, graph}).then(() => "unexpected-success", error => error.message as string)
    const current = client.layout({generation: 2, graph})
    client.cancelBefore(2)
    const [cancelled, response] = await bounded(Promise.all([obsolete, current]), signal)
    if (!cancelled.startsWith("Stale layout generation")) throw new Error(cancelled)
    const pending = client.layout({generation: 3, graph}).then(() => "unexpected-success", error => error.message as string)
    client.dispose()
    const disposedPending = await pending
    const disposedNew = await client.layout({generation: 4, graph}).then(() => "unexpected-success", error => error.message as string)
    if (disposedPending !== "Layout Worker is disposed" || disposedNew !== "Layout Worker is disposed") throw new Error("Dispose оставил запрос активным")
    return {
      route,
      title: "Worker transport · поколения и освобождение",
      description: "Два запроса отправлены одному настоящему Fixed Worker. cancelBefore отклоняет старое ожидание; dispose прекращает владение Worker и отклоняет оставшийся и новый запросы.",
      status: "result",
      input: {generations: [1, 2, 3, 4], graph},
      output: {cancelled, response, disposedPending, disposedNew},
      summary: [`Старое поколение: ${cancelled}`, `Текущее: requestId ${response.requestId}, generation ${response.generation}`, `Незавершённый запрос: ${disposedPending}`, `После dispose: ${disposedNew}`],
      source: "const old = client.layout({generation: 1, graph})\nconst current = client.layout({generation: 2, graph})\nclient.cancelBefore(2)\nawait current\nclient.dispose()",
    }
  } finally {
    client.dispose()
  }
}

function bounded<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
    }
    const onAbort = () => {
      cleanup()
      reject(signal!.reason)
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error("Отдельный Layout Worker не ответил за 15 секунд"))
    }, 15_000)
    signal?.addEventListener("abort", onAbort, {once: true})
    if (signal?.aborted) onAbort()
    pending.then(value => {cleanup(); resolve(value)}, error => {cleanup(); reject(error)})
  })
}
