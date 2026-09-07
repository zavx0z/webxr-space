import {expect, test} from "bun:test"
import {createDocument, readDocumentScrollIntoViewRequests, completeDocumentScrollIntoViewRequest,
  subscribeDocumentScrollIntoViewRequests} from "../src/index.ts"

test("scrollIntoView is a void DOM intent with normalized defaults and latest-target coalescing", () => {
  const document = createDocument()
  const root = document.createElement("section")
  const target = document.createElement("p")
  root.append(target)
  document.append(root)
  const version = document.version
  const stateVersion = document.stateVersion
  let notifications = 0
  const unsubscribe = subscribeDocumentScrollIntoViewRequests(document, () => notifications++)
  try {
    expect(target.scrollIntoView()).toBeUndefined()
    expect(readDocumentScrollIntoViewRequests(document)[0]).toMatchObject({target, block: "start", inline: "nearest", behavior: "auto"})
    target.scrollIntoView({block: "center", inline: "end"})
    const requests = readDocumentScrollIntoViewRequests(document)
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({block: "center", inline: "end"})
    expect(document.version).toBe(version)
    expect(document.stateVersion).toBe(stateVersion)
    expect(notifications).toBe(2)
    completeDocumentScrollIntoViewRequest(document, requests[0]!.id)
    expect(readDocumentScrollIntoViewRequests(document)).toHaveLength(0)
  } finally {unsubscribe()}
})

test("pre-mount scroll intents survive until attachment but pending mounted targets are dropped on removal", () => {
  const document = createDocument()
  const root = document.createElement("section")
  document.append(root)
  const target = document.createElement("p")
  target.scrollIntoView(false)
  expect(readDocumentScrollIntoViewRequests(document)[0]?.block).toBe("end")
  expect(readDocumentScrollIntoViewRequests(document, root)).toHaveLength(0)
  root.append(target)
  expect(readDocumentScrollIntoViewRequests(document, root)).toHaveLength(1)
  target.remove()
  expect(readDocumentScrollIntoViewRequests(document)).toHaveLength(0)
  root.append(target)
  expect(readDocumentScrollIntoViewRequests(document)).toHaveLength(0)
})

test("invalid or unsupported scrollIntoView options fail before publishing a request", () => {
  const document = createDocument()
  const target = document.createElement("p")
  expect(() => target.scrollIntoView({behavior: "smooth"} as never)).toThrow("Smooth scrolling is not implemented")
  expect(() => target.scrollIntoView({block: "wrong"} as never)).toThrow("scroll alignment")
  expect(() => target.scrollIntoView("bad" as never)).toThrow("boolean or object")
  expect(readDocumentScrollIntoViewRequests(document)).toHaveLength(0)
})
