import {describe, expect, test} from "bun:test"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "./document.fixture.ts"
import {TypographyFixture} from "./typography.fixture.tsx"
import {Typography} from "./typography.tsx"

describe("compiled production Typography", () => {
  test("retains text identity while its adjacent consumer fixture changes variant", () => {
    expect(isCompiledTemplate(Typography)).toBe(true)
    expect(isCompiledTemplate(TypographyFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)

    root.render(TypographyFixture as any, {text: "Heading", variant: "title"})
    const owner = host.querySelector("span")!
    const text = owner.firstChild
    expect(owner.getAttribute("data-variant")).toBe("title")

    root.render(TypographyFixture as any, {text: "Caption", variant: "caption"})
    expect(host.querySelector("span")).toBe(owner)
    expect(owner.firstChild).toBe(text)
    expect(owner.getAttribute("data-variant")).toBe("caption")
    expect(owner.textContent).toBe("Caption")
    root.unmount()
  })
})
