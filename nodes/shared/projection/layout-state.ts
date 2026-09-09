import type {LayoutResult} from "@nodes/layout/types"
import type {NodeTreeSnapshot} from "@nodes/tree"
import type {NodeTreeLayout, NodeTreeStore} from "../node-tree/contracts.ts"
import {nodeSocketLayoutPortId} from "./geometry.ts"

export type NodeTreeLayoutState = Readonly<{
  snapshot: NodeTreeSnapshot
  topology: NodeTreeSnapshot
  layout: LayoutResult
  pending: boolean
}>

export type NodeTreeLayoutStore = Readonly<{
  subscribe(listener: () => void): () => void
  getSnapshot(): NodeTreeLayoutState
}>

type LayoutInput = LayoutResult | NodeTreeLayout
type LayoutReceipt = Readonly<{
  store: NodeTreeStore
  topology: NodeTreeSnapshot
}>
type LayoutCoverage = Readonly<{
  nodeIds: ReadonlySet<string>
  portIds: ReadonlySet<string>
}>
type CachedLayoutStore = Readonly<{
  store: NodeTreeLayoutStore
  reusable(): boolean
}>

const receipts = new WeakMap<NodeTreeLayout, LayoutReceipt>()
const layoutStores = new WeakMap<NodeTreeStore, WeakMap<LayoutInput, CachedLayoutStore>>()
const layoutCoverage = new WeakMap<LayoutResult, LayoutCoverage>()

export function registerNodeTreeLayout(
  receipt: NodeTreeLayout,
  store: NodeTreeStore,
  topology: NodeTreeSnapshot,
): void {
  if (receipts.has(receipt)) throw new Error("NodeTree Layout receipt is already registered")
  receipts.set(receipt, Object.freeze({store, topology}))
}

export function isNodeTreeLayoutCurrent(store: NodeTreeStore, topology: NodeTreeSnapshot): boolean {
  return store.getTopologySnapshot() === topology
}

/** Shares one accepted pair between the editor and its tree without owning subscriptions. */
export function getNodeTreeLayoutStore(store: NodeTreeStore, input: LayoutInput): NodeTreeLayoutStore {
  if (input === null || typeof input !== "object") {
    throw new TypeError("NodeTree Layout must be a LayoutResult or a registered receipt")
  }
  const receipt = receipts.get(input as NodeTreeLayout)
  if (receipt !== undefined && receipt.store !== store) {
    throw new Error("NodeTree Layout receipt belongs to another Store")
  }
  if (receipt === undefined && ("snapshot" in input || "layout" in input)) {
    throw new Error("NodeTree Layout receipt is not registered")
  }
  let byInput = layoutStores.get(store)
  if (byInput === undefined) {
    byInput = new WeakMap()
    layoutStores.set(store, byInput)
  }
  const cache = byInput
  const retained = cache.get(input)
  if (retained !== undefined && retained.reusable()) return retained.store
  const bound = receipt !== undefined
  const topology = receipt?.topology ?? store.getTopologySnapshot()
  const layout = bound ? (input as NodeTreeLayout).layout : input as LayoutResult
  const snapshot = bound ? (input as NodeTreeLayout).snapshot : store.getSnapshot()
  let subscribers = 0
  let state: NodeTreeLayoutState = Object.freeze({
    snapshot,
    topology,
    layout,
    pending: !isNodeTreeLayoutCurrent(store, topology) || bound && store.getSnapshot() !== snapshot,
  })
  const getSnapshot = (): NodeTreeLayoutState => {
    if (state.pending || isNodeTreeLayoutCurrent(store, state.topology) &&
      (!bound || store.getSnapshot() === state.snapshot)) return state
    const update = store.getTopologyUpdate()
    if (!bound && canAppendNode(store, state.topology, update, layout)) {
      state = Object.freeze({
        snapshot: update.snapshot,
        topology: update.snapshot,
        layout,
        pending: false,
      })
    } else {
      state = Object.freeze({...state, pending: true})
    }
    return state
  }
  const result: NodeTreeLayoutStore = Object.freeze({
    subscribe(listener) {
      const subscribe = bound ? store.subscribe : store.subscribeTopology
      const unsubscribe = subscribe(() => listener())
      subscribers += 1
      let subscribed = true
      return () => {
        if (!subscribed) return
        subscribed = false
        try {
          unsubscribe()
        } finally {
          subscribers -= 1
          if (subscribers === 0 && cache.get(input)?.store === result) cache.delete(input)
        }
      }
    },
    getSnapshot,
  })
  cache.set(input, Object.freeze({
    store: result,
    reusable: () => bound || subscribers > 0 || isNodeTreeLayoutCurrent(store, state.topology),
  }))
  return result
}

function coverageFor(layout: LayoutResult): LayoutCoverage {
  const retained = layoutCoverage.get(layout)
  if (retained !== undefined) return retained
  const coverage: LayoutCoverage = Object.freeze({
    nodeIds: new Set(layout.nodes.map(node => node.id)),
    portIds: new Set(layout.ports.map(port => port.id)),
  })
  layoutCoverage.set(layout, coverage)
  return coverage
}

function canAppendNode(
  store: NodeTreeStore,
  previous: NodeTreeSnapshot,
  update: ReturnType<NodeTreeStore["getTopologyUpdate"]>,
  layout: LayoutResult,
): boolean {
  const snapshot = update.snapshot
  if (update.mode !== "append-node" || snapshot !== store.getTopologySnapshot() ||
    snapshot.topologyRevision !== previous.topologyRevision + 1 ||
    snapshot.frames !== previous.frames || snapshot.links !== previous.links ||
    snapshot.nodes.length !== previous.nodes.length + 1 ||
    previous.nodes.some((node, index) => snapshot.nodes[index] !== node)) return false
  const node = snapshot.nodes[snapshot.nodes.length - 1]!
  const coverage = coverageFor(layout)
  return coverage.nodeIds.has(node.id) &&
    node.sockets.every(socket => coverage.portIds.has(nodeSocketLayoutPortId(node.id, socket.id)))
}
