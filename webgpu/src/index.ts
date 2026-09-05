/// <reference types="@webgpu/types" />
/// <reference path="./types/assets.d.ts" />

export {Renderer} from "./renderer/index.ts"
export type {
  RenderComposition,
  RenderBoundedView,
  RendererPhysicalViewport,
  RenderOverlay,
} from "./renderer/index.ts"
export {TextureLoader, normaliseSvgRootDimensions} from "./texture-loader.ts"
export type {
  ExternalTexturePool,
  PendingExternalSource,
  ReplaceExternalSourceOptions,
  TextureEntry,
  TextureStatus,
} from "./texture-loader.ts"
export {RendererWebGpuBackend} from "./webgpu-backend.ts"
export type {
  RendererWebGpuBackendDiagnostics,
  RendererWebGpuBackendOptions,
  RendererFontFace,
} from "./webgpu-backend.ts"
export {RendererWebGpuScreenOverlay} from "./screen-overlay.ts"
export type {RendererWebGpuScreenOverlayOptions} from "./screen-overlay.ts"
export {RendererWebGpuDocumentPlane} from "./document-plane.ts"
export type {
  RendererWebGpuDocumentPlaneIntersection,
  RendererWebGpuDocumentPlaneOptions,
  RendererWebGpuDocumentPoint,
} from "./document-plane.ts"
