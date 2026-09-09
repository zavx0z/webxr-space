type Branch<Value> = Readonly<{
  id: number
  key: object
  value: Value
  left: Branch<Value> | null
  right: Branch<Value> | null
  height: number
  size: number
}>

// Identity allocation does not keep objects alive after their map snapshots die.
// Entries themselves own their keys and values, just as entries in a normal Map do.
const objectIds = new WeakMap<object, number>()
let nextObjectId = 0

function identity(key: object): number {
  const existing = objectIds.get(key)
  if (existing !== undefined) return existing
  if (nextObjectId === Number.MAX_SAFE_INTEGER) throw new RangeError("Object identity space exhausted")
  const id = ++nextObjectId
  objectIds.set(key, id)
  return id
}

function branch<Value>(
  id: number,
  key: object,
  value: Value,
  left: Branch<Value> | null,
  right: Branch<Value> | null,
): Branch<Value> {
  return Object.freeze({
    id,
    key,
    value,
    left,
    right,
    height: 1 + Math.max(left?.height ?? 0, right?.height ?? 0),
    size: 1 + (left?.size ?? 0) + (right?.size ?? 0),
  })
}

function balance<Value>(
  id: number,
  key: object,
  value: Value,
  left: Branch<Value> | null,
  right: Branch<Value> | null,
): Branch<Value> {
  const difference = (left?.height ?? 0) - (right?.height ?? 0)
  if (difference > 1 && left !== null) {
    if ((left.left?.height ?? 0) >= (left.right?.height ?? 0)) {
      return branch(left.id, left.key, left.value, left.left, branch(id, key, value, left.right, right))
    }
    const middle = left.right!
    return branch(
      middle.id,
      middle.key,
      middle.value,
      branch(left.id, left.key, left.value, left.left, middle.left),
      branch(id, key, value, middle.right, right),
    )
  }
  if (difference < -1 && right !== null) {
    if ((right.right?.height ?? 0) >= (right.left?.height ?? 0)) {
      return branch(right.id, right.key, right.value, branch(id, key, value, left, right.left), right.right)
    }
    const middle = right.left!
    return branch(
      middle.id,
      middle.key,
      middle.value,
      branch(id, key, value, left, middle.left),
      branch(right.id, right.key, right.value, middle.right, right.right),
    )
  }
  return branch(id, key, value, left, right)
}

function find<Value>(root: Branch<Value> | null, id: number): Branch<Value> | null {
  let current = root
  while (current !== null) {
    if (id === current.id) return current
    current = id < current.id ? current.left : current.right
  }
  return null
}

function put<Value>(root: Branch<Value> | null, id: number, key: object, value: Value): Branch<Value> {
  if (root === null) return branch(id, key, value, null, null)
  if (id === root.id) {
    return Object.is(value, root.value) ? root : branch(id, key, value, root.left, root.right)
  }
  if (id < root.id) {
    const left = put(root.left, id, key, value)
    return left === root.left ? root : balance(root.id, root.key, root.value, left, root.right)
  }
  const right = put(root.right, id, key, value)
  return right === root.right ? root : balance(root.id, root.key, root.value, root.left, right)
}

function removeMinimum<Value>(root: Branch<Value>): Branch<Value> | null {
  if (root.left === null) return root.right
  return balance(root.id, root.key, root.value, removeMinimum(root.left), root.right)
}

function remove<Value>(root: Branch<Value> | null, id: number): Branch<Value> | null {
  if (root === null) return null
  if (id < root.id) {
    const left = remove(root.left, id)
    return left === root.left ? root : balance(root.id, root.key, root.value, left, root.right)
  }
  if (id > root.id) {
    const right = remove(root.right, id)
    return right === root.right ? root : balance(root.id, root.key, root.value, root.left, right)
  }
  if (root.left === null) return root.right
  if (root.right === null) return root.left
  let successor = root.right
  while (successor.left !== null) successor = successor.left
  return balance(successor.id, successor.key, successor.value, root.left, removeMinimum(root.right))
}

/**
 * Immutable object-identity lookup for retained renderer bindings.
 *
 * An AVL tree provides O(log N) lookup and O(log N) newly allocated branches per
 * change. Unchanged subtrees are shared, but no version points to a previous map:
 * its tree contains exactly `size` entries, regardless of its update history.
 *
 * Keys and values are retained by snapshots, not cloned or deeply frozen.
 * The weak identity registry does not turn this collection into a WeakMap.
 */
export class PersistentObjectMap<Value> {
  #root: Branch<Value> | null = null

  constructor() {
    Object.freeze(this)
  }

  get size(): number {
    return this.#root?.size ?? 0
  }

  get(key: object): Value | undefined {
    const id = objectIds.get(key)
    return id === undefined ? undefined : find(this.#root, id)?.value
  }

  has(key: object): boolean {
    const id = objectIds.get(key)
    return id !== undefined && find(this.#root, id) !== null
  }

  with(key: object, value: Value): PersistentObjectMap<Value> {
    const root = put(this.#root, identity(key), key, value)
    return root === this.#root ? this : this.#fork(root)
  }

  without(key: object): PersistentObjectMap<Value> {
    const id = objectIds.get(key)
    if (id === undefined) return this
    const root = remove(this.#root, id)
    return root === this.#root ? this : this.#fork(root)
  }

  #fork(root: Branch<Value> | null): PersistentObjectMap<Value> {
    const next = new PersistentObjectMap<Value>()
    // Only the new wrapper is initialized; no method changes an existing root.
    next.#root = root
    return next
  }
}
