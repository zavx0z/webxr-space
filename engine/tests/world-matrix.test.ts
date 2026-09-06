import {expect, test} from "bun:test"
import {Object3D} from "../src/index.ts"

class CountedObject extends Object3D {
  updates = 0

  override updateMatrix(): void {
    this.updates += 1
    super.updateMatrix()
  }
}

test("world matrices retain the default recursive subtree update", () => {
  const root = new CountedObject()
  const child = new CountedObject()
  const grandchild = new CountedObject()
  root.add(child)
  child.add(grandchild)
  root.position.x = 10
  child.position.x = 20
  grandchild.position.x = 30

  root.updateWorldMatrix()
  expect([root.updates, child.updates, grandchild.updates]).toEqual([1, 1, 1])
  expect(grandchild.matrixWorld.elements[12]).toBe(60)

  root.position.x = 15
  root.updateWorldMatrix(true)
  expect([root.updates, child.updates, grandchild.updates]).toEqual([2, 2, 2])
  expect(grandchild.matrixWorld.elements[12]).toBe(65)
})

test("an ancestor-only matrix query excludes siblings and descendants", () => {
  const root = new CountedObject()
  const parent = new CountedObject()
  const target = new CountedObject()
  const child = new CountedObject()
  const sibling = new CountedObject()
  root.add(parent)
  root.add(sibling)
  parent.add(target)
  target.add(child)
  root.position.x = 5
  parent.position.x = 10
  parent.scale.x = 2
  target.position.x = 20

  target.updateWorldMatrix(true, {parents: true, children: false})
  expect(target.matrixWorld.elements[12]).toBe(55)
  expect([root.updates, parent.updates, target.updates]).toEqual([1, 1, 1])
  expect([child.updates, sibling.updates]).toEqual([0, 0])

  root.position.x = 15
  parent.scale.x = 3
  target.updateWorldMatrix(false, {parents: true, children: false})
  expect(target.matrixWorld.elements[12]).toBe(85)
  expect([root.updates, parent.updates, target.updates]).toEqual([2, 2, 2])
  expect([child.updates, sibling.updates]).toEqual([0, 0])
})

test("ancestor synchronization observes reparenting and detachment", () => {
  const first = new CountedObject()
  const second = new CountedObject()
  const target = new CountedObject()
  const child = new CountedObject()
  first.position.x = 10
  second.position.x = 100
  target.position.x = 5
  child.position.x = 2
  first.add(target)
  target.add(child)
  target.updateWorldMatrix(false, {parents: true, children: false})
  expect(target.matrixWorld.elements[12]).toBe(15)

  second.add(target)
  target.updateWorldMatrix(false, {parents: true})
  expect(target.matrixWorld.elements[12]).toBe(105)
  expect(child.matrixWorld.elements[12]).toBe(107)
  expect([first.updates, second.updates, target.updates, child.updates]).toEqual([1, 1, 2, 1])

  second.remove(target)
  target.updateWorldMatrix(false, {parents: true, children: false})
  expect(target.matrixWorld.elements[12]).toBe(5)
  expect([first.updates, second.updates, target.updates, child.updates]).toEqual([1, 1, 3, 1])
})

test("self-only synchronization does not implicitly traverse parents", () => {
  const root = new CountedObject()
  const target = new CountedObject()
  root.position.x = 12
  target.position.x = 4
  root.add(target)
  root.updateWorldMatrix(false, {children: false})
  target.updateWorldMatrix(false, {children: false})
  expect(target.matrixWorld.elements[12]).toBe(16)
  expect([root.updates, target.updates]).toEqual([1, 1])
})

test("visibility does not change the default world-matrix contract", () => {
  const root = new CountedObject()
  const hidden = new CountedObject()
  const child = new CountedObject()
  root.add(hidden)
  hidden.add(child)
  hidden.visible = false
  root.position.x = 10
  hidden.position.x = 20
  child.position.x = 30

  root.updateWorldMatrix()
  expect([root.updates, hidden.updates, child.updates]).toEqual([1, 1, 1])
  expect(child.matrixWorld.elements[12]).toBe(60)
  root.visible = false
  child.position.x = 35
  root.updateWorldMatrix(true)
  expect([root.updates, hidden.updates, child.updates]).toEqual([2, 2, 2])
  expect(child.matrixWorld.elements[12]).toBe(65)
})

test("visible-only matrix preparation prunes hidden subtrees and updates them when revealed", () => {
  const root = new CountedObject()
  const hidden = new CountedObject()
  const child = new CountedObject()
  const sibling = new CountedObject()
  root.add(hidden)
  root.add(sibling)
  hidden.add(child)
  hidden.visible = false
  root.position.x = 10
  hidden.position.x = 20
  child.position.x = 30

  root.updateWorldMatrix(true, {visibleOnly: true})
  expect([root.updates, hidden.updates, child.updates, sibling.updates]).toEqual([1, 0, 0, 1])
  root.position.x = 100
  hidden.position.x = 200
  child.position.x = 300
  hidden.visible = true
  root.updateWorldMatrix(true, {visibleOnly: true})
  expect([root.updates, hidden.updates, child.updates, sibling.updates]).toEqual([2, 1, 1, 2])
  expect(child.matrixWorld.elements[12]).toBe(600)

  root.visible = false
  root.updateWorldMatrix(true, {visibleOnly: true})
  expect([root.updates, hidden.updates, child.updates, sibling.updates]).toEqual([2, 1, 1, 2])
})

test("coordinate queries synchronize hidden ancestors and targets without traversing siblings", () => {
  const root = new CountedObject()
  const target = new CountedObject()
  const sibling = new CountedObject()
  root.add(target)
  root.add(sibling)
  root.visible = false
  target.visible = false
  root.position.x = 50
  target.position.x = 60

  target.updateWorldMatrix(true, {parents: true, children: false})
  expect(target.matrixWorld.elements[12]).toBe(110)
  expect([root.updates, target.updates, sibling.updates]).toEqual([1, 1, 0])

  root.position.x = 70
  target.visible = true
  target.updateWorldMatrix(true, {parents: true, children: false, visibleOnly: true})
  expect(target.matrixWorld.elements[12]).toBe(130)
  expect([root.updates, target.updates, sibling.updates]).toEqual([2, 2, 0])
})
