import {expect, test} from "bun:test"
import {TextureLoader} from "../src/texture-loader.ts"
import type {GifDecoderConstructor} from "../src/gif-animation.ts"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"
import {createDocument} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {ImageMaterial, Mesh} from "@zavx0z/engine"

test("GIF reuses one texture, resumes after dimension discovery and stops with its last material", async () => {
  const globals = globalThis as unknown as {ImageDecoder?: GifDecoderConstructor; GPUTextureUsage?: unknown}
  const originalDecoder = globals.ImageDecoder
  const originalUsage = globals.GPUTextureUsage
  const originalFetch = globalThis.fetch
  const uploaded: number[] = []
  let created = 0
  let closed = 0
  let decodedClosed = 0
  let decoded = 0
  const src = "https://fixture.invalid/animated.gif"
  globals.GPUTextureUsage = {TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4}
  globals.ImageDecoder = class {
    static async isTypeSupported() { return true }
    tracks = {ready: Promise.resolve(), selectedTrack: {frameCount: 2, repetitionCount: Infinity}}
    async decode({frameIndex}: {frameIndex: number}) {
      decoded++
      return {image: {
        timestamp: frameIndex,
        duration: 20_000,
        displayWidth: 2,
        displayHeight: 2,
        close() { decodedClosed++ },
      } as VideoFrame}
    }
    close() { closed++ }
  }
  globalThis.fetch = (async () => new Response("GIF89a")) as unknown as typeof fetch
  const device = {
    createTexture() {
      created++
      return {destroy() {}}
    },
    queue: {copyExternalImageToTexture({source}: {source: VideoFrame}) { uploaded.push(source.timestamp) }},
  } as unknown as GPUDevice
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:100px;height:100px")
  const scroll = document.createElement("div")
  scroll.setAttribute("style", "width:100px;height:40px;overflow:hidden")
  const image = document.createElement("img")
  image.src = src
  image.width = 2
  image.height = 2
  image.setAttribute("style", "display:block")
  document.append(root)
  root.append(scroll)
  scroll.append(image)
  const filler = document.createElement("div")
  filler.setAttribute("style", "height:200px")
  scroll.append(filler)
  const second = document.createElement("img")
  second.src = src
  second.width = 2
  second.height = 2
  second.setAttribute("style", "display:none")
  root.append(second)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 100, height: 100}})
  let presentations = 0
  const backend = new RendererWebGpuBackend({
    invalidateGeometry() {},
    requestPresentation() { presentations++ },
  })
  let dimensionReady!: () => void
  const dimensions = new Promise<void>(resolve => { dimensionReady = resolve })
  const measured = () => {
    if (TextureLoader.status(src) !== "ready") return
    TextureLoader.removeChangeListener(src, measured)
    dimensionReady()
  }
  try {
    TextureLoader.load(device, src, measured)
    await dimensions
    expect(closed).toBe(1)
    expect(uploaded).toEqual([0])
    backend.applyFrame(renderer.flush())
    await new Promise(resolve => setTimeout(resolve, 65))
    const material = backend.root.children.find(node => node instanceof Mesh && node.material instanceof ImageMaterial) as Mesh
    const callback = (material.material as ImageMaterial).onTextureChange!
    scroll.scrollTop = 10
    backend.applyFrame(renderer.flush())
    const hiddenCount = uploaded.length
    const hiddenPresentations = presentations
    expect(material.visible).toBe(false)
    // A cached bind-group lookup must not revive a visibility-controlled listener.
    TextureLoader.load(device, src, callback)
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(uploaded).toHaveLength(hiddenCount)
    expect(presentations).toBe(hiddenPresentations)
    expect(closed).toBe(1)
    second.setAttribute("style", "display:block")
    backend.applyFrame(renderer.flush())
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(uploaded.length).toBeGreaterThan(hiddenCount)
    expect(presentations - hiddenPresentations).toBe(uploaded.length - hiddenCount)
    second.setAttribute("style", "display:none")
    backend.applyFrame(renderer.flush())
    const bothHiddenCount = uploaded.length
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(uploaded).toHaveLength(bothHiddenCount)
    scroll.scrollTop = 0
    backend.applyFrame(renderer.flush())
    await new Promise(resolve => setTimeout(resolve, 60))
    expect(uploaded.length).toBeGreaterThan(bothHiddenCount)
    image.remove()
    backend.applyFrame(renderer.flush())
    const count = uploaded.length
    expect(uploaded).toContain(1)
    expect(created).toBe(1)
    expect(closed).toBe(2)
    expect(presentations).toBeGreaterThan(1)
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(uploaded).toHaveLength(count)
    expect(decodedClosed).toBe(decoded)
    expect(TextureLoader.peek(src)).toMatchObject({width: 2, height: 2, status: "ready"})
  } finally {
    TextureLoader.removeChangeListener(src, measured)
    backend.dispose()
    renderer.dispose()
    globalThis.fetch = originalFetch
    if (originalDecoder === undefined) delete globals.ImageDecoder
    else globals.ImageDecoder = originalDecoder
    if (originalUsage === undefined) delete globals.GPUTextureUsage
    else globals.GPUTextureUsage = originalUsage
  }
})
