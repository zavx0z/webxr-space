import {type Object3D} from "@engine/core"
import {UiSurface} from "@layout/core/surface"
import {drawStorybookPreviewChrome} from "@zavx0z/storybook/workbench"
import type {
  StorybookStoryArgs,
  StorybookStoryIndexItem,
  StorybookStoryModule,
} from "@zavx0z/storybook/stories"

export class LayoutStoryPreviewSurface extends UiSurface {
  readonly #previewParent: Object3D
  #index: StorybookStoryIndexItem | null = null
  #module: StorybookStoryModule | null = null
  #args: StorybookStoryArgs = Object.freeze({})
  #signature = ""

  constructor() {
    super({bgColor: null, borderColor: null})
    this.node.name = "LayoutStoryPreviewSurface"
    this.#previewParent = this.createRetainedParent()
    this.#previewParent.name = "LayoutStoryPreviewSurface.preview"
  }

  setStory(index: StorybookStoryIndexItem, module: StorybookStoryModule, args: StorybookStoryArgs): void {
    this.#index = index
    this.#module = module
    this.#args = args
    this.#signature = ""
    this.requestRender()
  }

  setArgs(args: StorybookStoryArgs): void {
    this.#args = args
    this.requestRender()
  }

  protected override render(): void {
    const index = this.#index
    const module = this.#module
    if (index === null || module === null) return
    const signature = `${index.route}:${JSON.stringify(this.#args)}:${this.rectW}:${this.rectH}:${this.pixelScale}`
    if (signature === this.#signature) return
    this.materializeRetainedParent(this.#previewParent, () => {
      drawStorybookPreviewChrome(this, this.rectW, this.rectH, {
        title: index.title,
        description: "Production policy, UI Elements/Components и source используют один frozen scenario.",
      })
      module.render(this, this.#args, {x: 0, y: 0, w: this.rectW, h: this.rectH})
    })
    this.#signature = signature
  }
}
