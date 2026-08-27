import type {StorybookStorySource} from "@zavx0z/storybook/stories"

export function layoutStorySource(policy: string, typescript: string): StorybookStorySource {
  return Object.freeze({
    html: `<node-layout class="node-layout" data-policy="${policy}"></node-layout>`,
    css: `.node-layout {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}`,
    typescript,
  })
}
