import {flexRowCss} from "@layout/core/flex-css"
import {planStorybookShell, type StorybookFrame} from "@zavx0z/storybook/workbench"
import {nodeStorybookGroup, type NodeStorybookRoute} from "./ui-navigation.ts"

export type NodeComponentStorybookFrames = Readonly<{
  backdrop: StorybookFrame
  catalog: StorybookFrame
  section: StorybookFrame
  editor: StorybookFrame
  sockets: StorybookFrame
  storyPreview: StorybookFrame
  reference: StorybookFrame
  detail: StorybookFrame
  dock: StorybookFrame
  story: StorybookFrame
}>

const hidden = (): StorybookFrame => ({x: 0, y: 0, w: 0, h: 0, visible: false})

/** Adapts the generic shell only to package-specific preview surfaces. */
export function planNodeComponentStorybookFrames(
  width: number,
  height: number,
  route: NodeStorybookRoute = "node-editor/scene/default",
): NodeComponentStorybookFrames {
  const shell = planStorybookShell(width, height, {
    responsive: {
      compactBelow: 980,
      compactPanels: ["catalog", "section", "dock", "info"],
    },
  })
  const compact = shell.compact
  let editor = hidden()
  let sockets = hidden()
  let storyPreview = hidden()
  let reference = hidden()
  let detail = hidden()
  const story = compact ? hidden() : shell.info
  const group = nodeStorybookGroup(route)
  if (group === "editor") editor = shell.preview
  else if (group === "parameter" || group === "socket") {
    storyPreview = shell.preview
  }
  else flexRowCss({
    x: shell.preview.x,
    y: shell.preview.y,
    w: shell.preview.w,
    h: shell.preview.h,
    gap: 18,
    items: [
      {width: "1fr", draw: (x, y, w, h) => { reference = {x, y, w, h} }},
      {width: "1fr", draw: (x, y, w, h) => { detail = {x, y, w, h} }},
    ],
  })
  return {
    backdrop: {x: 0, y: 0, w: width, h: height},
    catalog: shell.catalog,
    section: shell.section,
    editor,
    sockets,
    storyPreview,
    reference,
    detail,
    dock: compact ? hidden() : shell.dock,
    story,
  }
}
