import type {Space} from "@engine/core"

export type StoryIcon = "architecture" | "geometry" | "hologram" | "text" | "thin-film"

export type CameraPreset = Readonly<{
  position: Readonly<{x: number; y: number; z: number}>
  target: Readonly<{x: number; y: number; z: number}>
  near?: number
  far?: number
}>

export type StoryScene = Readonly<{
  space: Space
  camera: CameraPreset
  resize?(viewport: Readonly<{width: number; height: number}>): void
}>

export type EngineStory = Readonly<{
  id: string
  group: "Foundations" | "Geometry" | "Materials" | "Text"
  title: string
  icon: StoryIcon
  materialIcon: string
  description: string
  sourceFile: string
  tags: readonly string[]
  source: string
  createScene(): StoryScene | Promise<StoryScene>
}>
