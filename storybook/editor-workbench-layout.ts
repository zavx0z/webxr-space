import {
  planStorybookShell,
  type StorybookResponsivePolicy,
  type StorybookShellFrames,
} from "@zavx0z/storybook/workbench"

export const EDITOR_COMPACT_WIDTH = 980
export const EDITOR_DOCK_HEIGHT = 220
export const EDITOR_RESPONSIVE_POLICY: StorybookResponsivePolicy = Object.freeze({
  compactBelow: EDITOR_COMPACT_WIDTH,
  compactPanels: Object.freeze(["catalog", "section", "info"] as const),
})

export function planEditorWorkbench(width: number, height: number): StorybookShellFrames {
  return planStorybookShell(width, height, {
    dockHeight: EDITOR_DOCK_HEIGHT,
    responsive: EDITOR_RESPONSIVE_POLICY,
  })
}
