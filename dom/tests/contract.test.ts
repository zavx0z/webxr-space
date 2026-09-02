import {describe, expect, test} from "bun:test"
import {Event, createDocument} from "@zavx0z/dom"

describe("Semantic DOM contract", () => {
  test("[DOM-001] Каждый Element принадлежит ровно одному Document", () => {
    const firstDocument = createDocument()
    const secondDocument = createDocument()
    const element = firstDocument.createElement("div")
    const secondRoot = secondDocument.createElement("div")
    secondDocument.appendChild(secondRoot)

    expect(
      element.ownerDocument,
      "DOM-001: созданный Element должен принадлежать создавшему Document",
    ).toBe(firstDocument)

    secondRoot.appendChild(element)

    expect(
      element.ownerDocument,
      "DOM-001: cross-Document insertion должен передать Element новому Document",
    ).toBe(secondDocument)
    expect(
      element.ownerDocument === firstDocument,
      "DOM-001: Element не может одновременно принадлежать двум Document",
    ).toBe(false)
  })

  test("[DOM-002] Document сохраняет identity Element до его явного удаления", () => {
    const document = createDocument()
    const root = document.createElement("div")
    const element = document.createElement("span")
    document.appendChild(root)
    root.appendChild(element)

    element.setAttribute("data-state", "ready")
    element.textContent = "stable"

    expect(
      document.querySelector("[data-state=ready]"),
      "DOM-002: query после мутаций должен вернуть исходный Element",
    ).toBe(element)
    expect(
      root.firstElementChild,
      "DOM-002: мутации атрибута и текста не должны заменять Element",
    ).toBe(element)

    root.removeChild(element)

    expect(
      document.querySelector("[data-state=ready]"),
      "DOM-002: явно удалённый Element больше не должен находиться в Document",
    ).toBeNull()
    expect(
      element.parentNode,
      "DOM-002: удаление должно отсоединять тот же объект",
    ).toBeNull()
  })

  test("[DOM-003] Same-Document reparent сохраняет identity, listeners, focus и состояние Element", () => {
    const document = createDocument()
    const root = document.createElement("div")
    const left = document.createElement("div")
    const right = document.createElement("div")
    const input = document.createElement("input")
    document.appendChild(root)
    root.append(left, right)
    left.appendChild(input)

    let changes = 0
    input.addEventListener("change", () => {
      changes += 1
    })
    input.value = "draft"
    input.focus()

    const moved = right.appendChild(input)
    input.dispatchEvent(new Event("change", {bubbles: true}))

    expect(moved, "DOM-003: appendChild должен вернуть перемещённый объект").toBe(input)
    expect(
      right.firstElementChild,
      "DOM-003: новый parent должен содержать исходный Element",
    ).toBe(input)
    expect(
      document.activeElement,
      "DOM-003: same-Document reparent не должен сбрасывать focus",
    ).toBe(input)
    expect(input.value, "DOM-003: reparent не должен сбрасывать live field state").toBe("draft")
    expect(changes, "DOM-003: listener должен пережить reparent и сработать один раз").toBe(1)
  })

  test("[DOM-004] Атрибуты, события, focus и состояние полей принадлежат semantic Element", () => {
    const document = createDocument()
    const root = document.createElement("div")
    const primary = document.createElement("input")
    const secondary = document.createElement("input")
    document.appendChild(root)
    root.append(primary, secondary)

    let primaryInputs = 0
    primary.setAttribute("data-owner", "primary")
    primary.value = "owned"
    primary.addEventListener("input", () => {
      primaryInputs += 1
    })
    primary.focus()

    secondary.dispatchEvent(new Event("input", {bubbles: true}))
    primary.dispatchEvent(new Event("input", {bubbles: true}))

    expect(
      primary.getAttribute("data-owner"),
      "DOM-004: атрибут должен читаться с exact semantic Element",
    ).toBe("primary")
    expect(
      secondary.getAttribute("data-owner"),
      "DOM-004: соседний Element не должен разделять атрибуты",
    ).toBeNull()
    expect(primary.value, "DOM-004: live value должен принадлежать primary input").toBe("owned")
    expect(secondary.value, "DOM-004: соседний input должен сохранить собственное значение").toBe("")
    expect(primaryInputs, "DOM-004: listener должен принадлежать только primary input").toBe(1)
    expect(document.activeElement, "DOM-004: focus owner должен быть exact primary input").toBe(primary)

    secondary.focus()
    expect(
      document.activeElement,
      "DOM-004: focus должен перейти к exact secondary input без переноса его состояния",
    ).toBe(secondary)
    expect(primary.value, "DOM-004: смена focus не должна переносить field state").toBe("owned")
  })
})
