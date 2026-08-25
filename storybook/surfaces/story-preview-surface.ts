import {UiSurface} from "@layout/core/surface"
import {drawStorybookPreviewChrome} from "@zavx0z/storybook/workbench"
import type {
  StorybookStoryArgs,
  StorybookStoryIndexItem,
  StorybookStoryModule,
} from "@zavx0z/storybook/stories"

export class NodeStoryPreviewSurface extends UiSurface {
  #index: StorybookStoryIndexItem | null = null
  #module: StorybookStoryModule | null = null
  #args: StorybookStoryArgs = Object.freeze({})

  constructor() {
    super({bgColor: null, borderColor: null})
    this.node.name = "NodeStoryPreviewSurface"
  }

  setStory(
    index: StorybookStoryIndexItem,
    module: StorybookStoryModule,
    args: StorybookStoryArgs,
  ): void {
    this.#index = index
    this.#module = module
    this.#args = args
    this.requestRender()
  }

  setArgs(args: StorybookStoryArgs): void {
    this.#args = args
    this.requestRender()
  }

  protected override render(): void {
    const index = this.#index
    drawStorybookPreviewChrome(this, this.rectW, this.rectH, index === null ? {} : {
      title: index.title,
      description: index.componentId === "parameter"
        ? "Рабочие Parameter, Field, Socket и TypeScript используют одно состояние сценария."
        : "Рабочий Socket, параметры и TypeScript используют одно состояние сценария.",
    })
    if (index === null || this.#module === null) return
    this.#module.render(this, this.#args, {x: 0, y: 0, w: this.rectW, h: this.rectH})
  }
}
