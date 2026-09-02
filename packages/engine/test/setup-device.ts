import {setupGlobals} from "bun-webgpu"

setupGlobals()

let device: GPUDevice | null = null

/** Returns one shared WebGPU device for shader and pipeline tests. */
export async function setupDevice(): Promise<GPUDevice> {
  if (device !== null) return device
  if (!navigator.gpu) throw new Error("WebGPU is unavailable in the Bun test runtime")

  const adapter = await navigator.gpu.requestAdapter()
  if (adapter === null) throw new Error("The Bun test runtime could not create a WebGPU adapter")

  device = await adapter.requestDevice()
  return device
}
