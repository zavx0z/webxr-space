import {describe, expect, test} from "bun:test"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {BadgeFixture} from "./badge.fixture.tsx"
import {Badge} from "./badge.tsx"
import {createDocument} from "./document.fixture.ts"

describe("compiled production Badge", () => {
  test("retains its semantic owner and text through the adjacent consumer fixture", () => {
    expect(isCompiledTemplate(Badge)).toBe(true)
    expect(isCompiledTemplate(BadgeFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)

    root.render(BadgeFixture as any, {label: "Ready", tone: "success", title: "Status"})
    const owner = host.querySelector("span") as import("@zavx0z/dom").HTMLSpanElement
    const text = owner.firstChild
    expect(owner.getAttribute("data-tone")).toBe("success")
    expect(owner.title).toBe("Status")

    root.render(BadgeFixture as any, {label: "Waiting", tone: "warning"})
    expect(host.querySelector("span")).toBe(owner)
    expect(owner.firstChild).toBe(text)
    expect(owner.textContent).toBe("Waiting")
    expect(owner.className).toBe("")
    root.unmount()
  })
})
