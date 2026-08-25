import {type Object3D} from "@engine/core"
import {UiSurface} from "@layout/core/surface"
import {clearReadOnlyTextParticipants} from "@ui/elements/input"
import {drawStorybookPreviewChrome} from "@zavx0z/storybook/workbench"
import type {
  StorybookStoryArgs,
  StorybookStoryIndexItem,
  StorybookStoryModule,
} from "@zavx0z/storybook/stories"

export type ComponentsStoryPreviewDiagnostics = Readonly<{
  route: string
  layoutPlans: number
  materializations: number
}>

export class ComponentsStoryPreviewSurface extends UiSurface {
  readonly #previewParent: Object3D
  #storyIndex: StorybookStoryIndexItem | null = null
  #storyModule: StorybookStoryModule | null = null
  #args: StorybookStoryArgs = Object.freeze({})
  #materialized: Readonly<{
    signature: string
    w: number
    h: number
    pixelScale: number
    font: unknown
  }> | null = null
  #layoutPlans = 0
  #materializations = 0

  constructor() {
    super({bgColor: null, borderColor: null})
    this.node.name = "ComponentsStoryPreviewSurface"
    this.#previewParent = this.createRetainedParent()
    this.#previewParent.name = "ComponentsStoryPreviewSurface.preview"
  }

  get diagnostics(): ComponentsStoryPreviewDiagnostics {
    return Object.freeze({
      route: this.#storyIndex?.route ?? "",
      layoutPlans: this.#layoutPlans,
      materializations: this.#materializations,
    })
  }

  setStory(
    index: StorybookStoryIndexItem,
    module: StorybookStoryModule,
    args: StorybookStoryArgs,
  ): void {
    if (this.#storyIndex?.route !== index.route) clearReadOnlyTextParticipants(this)
    this.#storyIndex = index
    this.#storyModule = module
    this.#args = args
    this.requestRender()
  }

  setArgs(args: StorybookStoryArgs): void {
    this.#args = args
    this.requestRender()
  }

  protected override render(): void {
    const index = this.#storyIndex
    const module = this.#storyModule
    if (index === null || module === null) return
    const signature = `${index.route}:${JSON.stringify(this.#args)}`
    const previous = this.#materialized
    const geometryChanged = previous === null || previous.w !== this.rectW || previous.h !== this.rectH ||
      previous.pixelScale !== this.pixelScale || previous.font !== this.font
    if (!geometryChanged && previous.signature === signature) return
    if (geometryChanged) this.#layoutPlans += 1
    this.materializeRetainedParent(this.#previewParent, () => {
      drawStorybookPreviewChrome(this, this.rectW, this.rectH, {
        title: index.title,
        description: "Рабочий компонент, параметры и TypeScript используют один сценарий.",
      })
      module.render(this, this.#args, {x: 0, y: 0, w: this.rectW, h: this.rectH})
    })
    this.#materializations += 1
    this.#materialized = {
      signature,
      w: this.rectW,
      h: this.rectH,
      pixelScale: this.pixelScale,
      font: this.font,
    }
  }
}
