import {describe, expect, test} from "bun:test"
import {Event, type HTMLButtonElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {Notification} from "./notification.tsx"
import {uiIcons} from "./icons.ts"
import {createDocument} from "./test-document.ts"

describe("compiled production Notification", () => {
  test("owns semantic status/alert tone and optional dismissal without a queue store", () => {
    expect(isCompiledTemplate(Notification)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const events: string[] = []
    root.render(Notification as any, {
      heading: "Export",
      message: "Finished",
      detail: "3 files",
      tone: "success",
      dismissible: true,
      onDismiss: (_event: Event) => events.push("dismiss")
    })
    const owner = host.querySelector("aside")!
    const dismiss = host.querySelector("button") as HTMLButtonElement
    expect(owner.getAttribute("role")).toBe("status")
    expect(owner.getAttribute("aria-live")).toBe("polite")
    expect(owner.getAttribute("data-tone")).toBe("success")
    expect(owner.textContent).toContain("ExportFinished3 files")
    expect(dismiss.querySelector("img")?.getAttribute("src")).toBe(uiIcons.close)
    dismiss.click()
    expect(events).toEqual(["dismiss"])

    root.render(Notification as any, {message: "Failed", tone: "error"})
    expect(host.querySelector("aside")).toBe(owner)
    expect(owner.getAttribute("role")).toBe("alert")
    expect(owner.getAttribute("aria-live")).toBe("assertive")
    expect(dismiss.parentElement!.hasAttribute("hidden")).toBe(true)
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 340, height: 120}})
    expect(renderer.flush().boxByNode.get(owner)?.width).toBe(280)
    expect(owner.className).toBe("")
    renderer.dispose()
    root.unmount()
  })
})
