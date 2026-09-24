import {expect, test} from "bun:test"
import {layoutFixed} from "@nodes/layout/fixed"
import {layoutAdaptiveWithDiagnostics} from "@nodes/layout/adaptive/diagnostics"
import {layoutTopDown} from "@nodes/layout/top-down"
import {layoutCoffmanGraham} from "@nodes/layout/coffman-graham"
import {runFixedWorkerRequest} from "@nodes/layout/worker/fixed/executor"
import {FixedWorkerClient} from "@nodes/layout/worker/fixed/client"
import {AdaptiveWorkerClient} from "@nodes/layout/worker/adaptive/client"
import {TopDownWorkerClient} from "@nodes/layout/worker/top-down/client"
import {CoffmanGrahamWorkerClient} from "@nodes/layout/worker/coffman-graham/client"
import {WorkerRemoteError} from "@nodes/layout/worker/transport"
import {runAdaptiveWorkerRequest} from "@nodes/layout/worker/adaptive/executor"
import {runTopDownWorkerRequest} from "@nodes/layout/worker/top-down/executor"
import {runCoffmanGrahamWorkerRequest} from "@nodes/layout/worker/coffman-graham/executor"
import {
  fixedGraph,
  conflictingFixedGraph,
  adaptiveGraph,
  invalidAdaptiveGraph,
  topDownGraph,
  coffmanGrahamGraph,
} from "./layout.fixture.ts"

test("[LAYOUT-WORKER] executors сохраняют числовой результат и сериализуют отказ", () => {
  const fixed = fixedGraph()
  const fixedResponse = runFixedWorkerRequest({type: "layout", requestId: 1, generation: 7, graph: fixed})
  expect(fixedResponse).toMatchObject({type: "layout-result", requestId: 1, generation: 7, result: layoutFixed(fixed)})
  expect(runFixedWorkerRequest({type: "layout", requestId: 2, generation: 8, graph: conflictingFixedGraph()}))
    .toMatchObject({type: "layout-error", requestId: 2, generation: 8})

  const adaptive = adaptiveGraph()
  const adaptiveResult = layoutAdaptiveWithDiagnostics(adaptive)
  expect(runAdaptiveWorkerRequest({type: "layout", requestId: 3, generation: 7, graph: adaptive}))
    .toMatchObject({type: "layout-result", result: adaptiveResult.result, diagnostics: adaptiveResult.diagnostics})
  expect(runAdaptiveWorkerRequest({type: "layout", requestId: 4, generation: 8, graph: invalidAdaptiveGraph()}))
    .toMatchObject({type: "layout-error", error: {code: "NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT"}})

  const topDown = topDownGraph()
  expect(runTopDownWorkerRequest({type: "layout", requestId: 5, generation: 7, graph: topDown}))
    .toMatchObject({type: "layout-result", result: layoutTopDown({graph: topDown})})
  expect(runTopDownWorkerRequest({type: "layout", requestId: 6, generation: 8, graph: topDownGraph(true)}))
    .toMatchObject({type: "layout-error", error: {code: "CYCLE_DETECTED"}})

  const coffman = coffmanGrahamGraph(2)
  expect(runCoffmanGrahamWorkerRequest({type: "layout", requestId: 7, generation: 7, graph: coffman}))
    .toMatchObject({type: "layout-result", result: layoutCoffmanGraham(coffman)})
  expect(runCoffmanGrahamWorkerRequest({type: "layout", requestId: 8, generation: 8, graph: coffmanGrahamGraph(2, true)}))
    .toMatchObject({type: "layout-error", error: {code: "CYCLE_DETECTED"}})
})

function testWorker(path: string): Worker {
  const worker = new Worker(new URL(path, import.meta.url), {type: "module"})
  worker.unref()
  return worker
}

test("[LAYOUT-WORKER] отдельные Worker возвращают результат и typed отказ", async () => {
  const fixed = new FixedWorkerClient(testWorker("./fixed-worker.fixture.ts"))
  try {
    const graph = fixedGraph()
    expect((await fixed.layout({generation: 7, graph})).result).toEqual(layoutFixed(graph))
    expect(await fixed.layout({generation: 8, graph: conflictingFixedGraph()}).then(() => null, error => error)).toBeInstanceOf(WorkerRemoteError)
  } finally { fixed.dispose() }

  const adaptive = new AdaptiveWorkerClient(testWorker("./adaptive-worker.fixture.ts"))
  try {
    const graph = adaptiveGraph()
    expect((await adaptive.layout({generation: 7, graph})).result).toEqual(layoutAdaptiveWithDiagnostics(graph).result)
    expect(await adaptive.layout({generation: 8, graph: invalidAdaptiveGraph()}).then(() => null, error => error)).toBeInstanceOf(WorkerRemoteError)
  } finally { adaptive.dispose() }

  const topDown = new TopDownWorkerClient(testWorker("./top-down-worker.fixture.ts"))
  try {
    const graph = topDownGraph()
    expect((await topDown.layout({generation: 7, graph})).result).toEqual(layoutTopDown({graph}))
    expect(await topDown.layout({generation: 8, graph: topDownGraph(true)}).then(() => null, error => error)).toBeInstanceOf(WorkerRemoteError)
  } finally { topDown.dispose() }

  const coffman = new CoffmanGrahamWorkerClient(testWorker("./coffman-graham-worker.fixture.ts"))
  try {
    const graph = coffmanGrahamGraph(2)
    expect((await coffman.layout({generation: 7, graph})).result).toEqual(layoutCoffmanGraham(graph))
    expect(await coffman.layout({generation: 8, graph: coffmanGrahamGraph(2, true)}).then(() => null, error => error)).toBeInstanceOf(WorkerRemoteError)
  } finally { coffman.dispose() }
}, 30_000)

test("[LAYOUT-WORKER] cancelBefore и dispose отклоняют устаревшие запросы", async () => {
  const client = new FixedWorkerClient(testWorker("./fixed-worker.fixture.ts"))
  const graph = fixedGraph()
  try {
    const old = client.layout({generation: 1, graph}).then(() => "unexpected", error => error.message as string)
    const current = client.layout({generation: 2, graph})
    client.cancelBefore(2)
    expect(await old).toBe("Stale layout generation: 1")
    expect((await current).generation).toBe(2)
    const pending = client.layout({generation: 3, graph}).then(() => "unexpected", error => error.message as string)
    client.dispose()
    expect(await pending).toBe("Layout Worker is disposed")
    expect(await client.layout({generation: 4, graph}).then(() => "unexpected", error => error.message as string)).toBe("Layout Worker is disposed")
  } finally { client.dispose() }
}, 30_000)
