import type {StorybookStorySource} from "@zavx0z/storybook/stories"

export function nodeComponentStorySource(component: string, typescript: string): StorybookStorySource {
  return Object.freeze({
    html: `<node-editor class="node-component-story" data-component="${component}"></node-editor>`,
    css: `.node-component-story {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}`,
    typescript,
  })
}

export function parameterStorySource(input: Readonly<{
  kind: string
  variant: string
  typescript: string
}>): StorybookStorySource {
  return Object.freeze({
    html: `<node-parameter class="node-parameter-story" data-kind="${input.kind}" data-variant="${input.variant}"></node-parameter>`,
    css: `.node-parameter-story {
  display: flex;
  width: min(520px, 58%);
  height: 100%;
  margin: 0 auto;
  align-items: center;
  justify-content: center;
}`,
    typescript: input.typescript,
  })
}

export function socketStorySource(input: Readonly<{
  kind: string
  direction: string
  shape: string
  selected: boolean
  typescript: string
}>): StorybookStorySource {
  return Object.freeze({
    html: `<node-socket class="node-socket-story" data-kind="${input.kind}" data-direction="${input.direction}" data-shape="${input.shape}"${input.selected ? " selected" : ""}></node-socket>`,
    css: `.node-socket-story {
  display: block;
  width: min(520px, 58%);
  min-width: 280px;
  height: min(260px, 36%);
  min-height: 190px;
  margin: auto;
}`,
    typescript: input.typescript,
  })
}

export function socketOverviewStorySource(kind: string | null, typescript: string): StorybookStorySource {
  return Object.freeze({
    html: `<section class="socket-overview"${kind === null ? "" : ` data-kind="${kind}"`}></section>`,
    css: `.socket-overview {
  display: grid;
  width: 100%;
  height: 100%;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
  overflow: auto;
}`,
    typescript,
  })
}
