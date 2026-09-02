import {describe, expect, it} from "bun:test"
import {
  Comment,
  Event,
  HTMLButtonElement,
  HTMLElement,
  Text,
  createDocument,
  type MutationBatch
} from "@zavx0z/dom"
import {compile, html} from "./dom"

describe("direct DOM compiler", () => {
  it("updates addressed text and attributes without replacing stable nodes", () => {
    const document = createDocument()
    const host = document.createElement("div")
    document.appendChild(host)

    const program = compile((state: {label: string; title: string; disabled: boolean}) => html`
      <button id="save" title=${state.title} disabled=${state.disabled}>${state.label}</button>
    `)
    const instance = program.mount(host, {
      label: "Save",
      title: "Save changes",
      disabled: true
    })

    const button = host.children[0]
    const authoredRoots = instance.rootNodes
    expect(authoredRoots.some(node => node instanceof Comment)).toBe(false)
    expect(button).toBeInstanceOf(HTMLButtonElement)
    const label = button!.childNodes.find(node => node instanceof Text && node.data === "Save")
    expect(label).toBeInstanceOf(Text)
    expect((button as HTMLButtonElement).title).toBe("Save changes")
    expect((button as HTMLButtonElement).disabled).toBe(true)

    const batches: MutationBatch[] = []
    const unsubscribe = document.subscribeMutations(batch => batches.push(batch))
    instance.update({label: "Saved", title: "Already saved", disabled: false})

    expect(host.children[0]).toBe(button)
    expect(instance.rootNodes).toEqual(authoredRoots)
    expect(button!.childNodes.find(node => node instanceof Text && node.data === "Saved")).toBe(label)
    expect((button as HTMLButtonElement).title).toBe("Already saved")
    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(batches).toHaveLength(1)
    expect(batches[0]!.records.map(record => record.type).sort()).toEqual([
      "attributes",
      "attributes",
      "characterData"
    ])

    instance.update({label: "Saved", title: "Already saved", disabled: false})
    expect(batches).toHaveLength(1)
    unsubscribe()
  })

  it("uses native EventTarget listeners and replaces only the changed handler", () => {
    const document = createDocument()
    const host = document.createElement("div")
    document.appendChild(host)
    const calls: string[] = []
    const bubbled: string[] = []
    host.addEventListener("click", event => bubbled.push((event.target as HTMLElement).id))

    const first = () => calls.push("first")
    const second = () => calls.push("second")
    const program = compile((state: {onClick: () => void}) => html`
      <button id="action" onclick=${state.onClick}>Run</button>
    `)
    const instance = program.mount(host, {onClick: first})
    const button = host.children[0] as HTMLButtonElement

    button.click()
    instance.update({onClick: second})
    button.click()

    expect(calls).toEqual(["first", "second"])
    expect(bubbled).toEqual(["action", "action"])

    instance.dispose()
    button.dispatchEvent(new Event("click", {bubbles: true}))
    expect(calls).toEqual(["first", "second"])
  })

  it("keeps a nested template in place and replaces only a changed branch", () => {
    const document = createDocument()
    const host = document.createElement("div")
    document.appendChild(host)

    const row = (label: string) => html`<span title="row">${label}</span>`
    const program = compile((state: {visible: boolean; label: string}) => html`
      <section>${state.visible ? row(state.label) : null}</section>
    `)
    const instance = program.mount(host, {visible: true, label: "One"})
    const section = host.children[0]!
    const span = section.children[0]!
    const label = span.childNodes.find(node => node instanceof Text && node.data === "One")

    instance.update({visible: true, label: "Two"})
    expect(host.children[0]).toBe(section)
    expect(section.children[0]).toBe(span)
    expect(span.childNodes.find(node => node instanceof Text && node.data === "Two")).toBe(label)

    instance.update({visible: false, label: "ignored"})
    expect(host.children[0]).toBe(section)
    expect(section.children).toHaveLength(0)

    instance.update({visible: true, label: "Three"})
    expect(host.children[0]).toBe(section)
    expect(section.children[0]).not.toBe(span)
    expect(section.children[0]!.textContent).toBe("Three")
  })

  it("reconciles array items by position and preserves surviving element identity", () => {
    const document = createDocument()
    const host = document.createElement("div")
    document.appendChild(host)

    const program = compile((items: readonly string[]) => html`
      <ul>${items.map(item => html`<li>${item}</li>`)}</ul>
    `)
    const instance = program.mount(host, ["A", "B"])
    const list = host.children[0]!
    const first = list.children[0]!
    const second = list.children[1]!

    instance.update(["A1", "B1", "C"])
    expect(list.children[0]).toBe(first)
    expect(list.children[1]).toBe(second)
    expect(list.children.map(element => element.textContent)).toEqual(["A1", "B1", "C"])

    instance.update(["A2"])
    expect(list.children[0]).toBe(first)
    expect(list.children.map(element => element.textContent)).toEqual(["A2"])
  })

  it("accepts an existing DOM Node and disposes the complete mounted region", () => {
    const document = createDocument()
    const host = document.createElement("div")
    document.appendChild(host)
    const supplied = document.createElement("span")
    supplied.textContent = "Native node"

    const instance = compile((node: HTMLElement) => html`<div>${node}</div>`).mount(host, supplied)
    expect(host.children[0]!.children[0]).toBe(supplied)

    instance.dispose()
    expect(host.childNodes).toHaveLength(0)
    expect(supplied.isConnected).toBe(false)
  })

  it("never reparses dynamic strings as markup or attributes", () => {
    const document = createDocument()
    const host = document.createElement("div")
    document.appendChild(host)
    const hostileText = '<span onclick="bad">not markup</span>'
    const hostileTitle = 'safe" onclick="bad'

    compile((state: {text: string; title: string}) => html`
      <div title=${state.title}>${state.text}</div>
    `).mount(host, {text: hostileText, title: hostileTitle})

    const element = host.children[0]!
    expect(element.childElementCount).toBe(0)
    expect(element.textContent).toBe(hostileText)
    expect(element.getAttribute("title")).toBe(hostileTitle)
    expect(element.hasAttribute("onclick")).toBe(false)
  })

  it("uses stable Comment regions that do not contribute to text content", () => {
    const document = createDocument()
    const host = document.createElement("div")
    document.appendChild(host)
    const program = compile((value: string) => html`${value}`)
    const instance = program.mount(host, "first")
    const start = host.childNodes[0]!
    const text = host.childNodes[1]!
    const part = host.childNodes[2]!
    const end = host.childNodes[3]!

    expect(start).toBeInstanceOf(Comment)
    expect(part).toBeInstanceOf(Comment)
    expect(end).toBeInstanceOf(Comment)
    expect(text).toBeInstanceOf(Text)
    expect(instance.rootNodes).toEqual([text])
    expect(host.textContent).toBe("first")

    instance.update("second")
    expect(host.childNodes).toEqual([start, text, part, end])
    expect(instance.rootNodes).toEqual([text])
    expect(host.textContent).toBe("second")
  })

  it("fails closed for dynamic tag names and non-listener event values", () => {
    const document = createDocument()
    const host = document.createElement("div")
    document.appendChild(host)
    const tag = "button"

    expect(() => compile(() => html`<${tag}>Bad</${tag}>`).mount(host, undefined)).toThrow(
      "Element names must be static"
    )
    expect(() => compile(() => html`<button onclick=${"alert(1)"}>Bad</button>`).mount(host, undefined)).toThrow(
      "onclick requires a function"
    )
  })
})
