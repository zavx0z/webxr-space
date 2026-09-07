import {layoutFixed} from "@zavx0z/layout/fixed"
import {layoutAdaptiveWithDiagnostics} from "@zavx0z/layout/adaptive"
import {layoutTopDown} from "@zavx0z/layout/top-down"
import {layoutCoffmanGraham} from "@zavx0z/layout/coffman-graham"
import {
  fixedGraph,
  conflictingFixedGraph,
  adaptiveGraph,
  invalidAdaptiveGraph,
  topDownGraph,
  coffmanGrahamGraph,
} from "./fixtures.ts"

export type LayoutReport = Readonly<{
  route: string
  title: string
  description: string
  status: "result" | "expected-error"
  input: unknown
  output: unknown
  summary: readonly string[]
  source: string
}>

type NumericResult = Readonly<{
  direction: string
  bounds: Readonly<{x: number; y: number; width: number; height: number}>
  nodes: readonly unknown[]
  ports: readonly Readonly<{id: string; side: string}>[]
  edges: readonly unknown[]
}>

export function algorithmReport(route: string): LayoutReport {
  const [, policy, variant] = route.split("/")
  if (policy === "fixed" || route.startsWith("protocol/")) {
    const invalid = variant === "invalid"
    const input = invalid ? conflictingFixedGraph() : fixedGraph(variant === "down" ? "DOWN" : "RIGHT", route.endsWith("compound"))
    return evaluate(route, "Фиксированная раскладка", "Источник выходит через EAST, приёмник входит через WEST. Вход содержит размеры; результат содержит вычисленные координаты и ортогональные маршруты.", "fixed", "layoutFixed", input, () => layoutFixed(input), invalid)
  }
  if (policy === "adaptive") {
    const invalid = variant === "no-assignment"
    const input = invalid ? invalidAdaptiveGraph() : adaptiveGraph(variant === "compound", variant === "down" ? "DOWN" : "RIGHT")
    return evaluate(route, "Адаптивная раскладка", "Два ребра используют один точный source/shared. Алгоритм выбирает одну допустимую сторону этого порта и возвращает фактическую диагностику ограниченного поиска.", "adaptive", "layoutAdaptiveWithDiagnostics", input, () => layoutAdaptiveWithDiagnostics(input), invalid)
  }
  if (policy === "top-down") {
    const input = topDownGraph(variant === "cycle")
    return evaluate(route, "Раскладка сверху вниз", "Измеренный плоский DAG: SOUTH → NORTH, маршруты из cubic Bézier segments. Здесь показан числовой контракт; подключение этих сторон к NodeEditor ещё не реализовано.", "top-down", "layoutTopDown", input, () => layoutTopDown(input), variant === "cycle")
  }
  if (policy === "coffman-graham") {
    const input = coffmanGrahamGraph(variant === "narrow" ? 2 : 3, variant === "cycle")
    return evaluate(route, "Коффман–Грэм", "Ограничение числа нод в слое, SOUTH → NORTH, кубические маршруты и массив остаточных пересечений. Это числовой результат; проекция в NodeEditor требует отдельного договора.", "coffman-graham", "layoutCoffmanGraham", input, () => layoutCoffmanGraham(input), variant === "cycle")
  }
  throw new Error(`Неизвестный числовой пример: ${route}`)
}

function evaluate(
  route: string,
  title: string,
  description: string,
  policy: string,
  api: string,
  input: unknown,
  run: () => unknown,
  expectError: boolean,
): LayoutReport {
  const source = `import {${api}} from "@zavx0z/layout/${policy}"\n\nconst graph = ${JSON.stringify(input, null, 2)}\nconst result = ${api}(graph)`
  let output: unknown
  try {
    output = run()
  } catch (error) {
    if (!expectError) throw error
    const serialized = serializeError(error)
    const expected = policy === "fixed"
      ? serialized.message.startsWith("Port has conflicting edge roles:")
      : policy === "adaptive"
        ? serialized.code === "NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT"
        : serialized.code === "CYCLE_DETECTED"
    if (!expected) throw error
    return {route, title, description, status: "expected-error", input, output: serialized, summary: ["Ожидаемый отказ получен из production API", serialized.message], source}
  }
  if (expectError) throw new Error(`Ожидаемая ошибка не возникла: ${route}`)
  const envelope = output as {result?: NumericResult}
  const result = envelope.result ?? output as NumericResult
  return {
    route,
    title,
    description,
    status: "result",
    input,
    output,
    summary: [
      `Направление: ${result.direction}`,
      `Ноды: ${result.nodes.length} · порты: ${result.ports.length} · рёбра: ${result.edges.length}`,
      `Границы: ${format(result.bounds.width)} × ${format(result.bounds.height)} · начало (${format(result.bounds.x)}, ${format(result.bounds.y)})`,
      `Стороны: ${result.ports.map(port => `${port.id} → ${port.side}`).join(", ")}`,
    ],
    source,
  }
}

function format(value: number): string {
  return Number(value.toFixed(2)).toString()
}

export function serializeError(error: unknown): {name: string; message: string; code?: unknown; witness?: unknown} {
  if (!(error instanceof Error)) return {name: "Error", message: String(error)}
  return {
    name: error.name,
    message: error.message,
    ...("code" in error ? {code: error.code} : {}),
    ...("witness" in error ? {witness: error.witness} : {}),
  }
}
