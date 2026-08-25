import type {StorybookStoryArgs} from "@zavx0z/storybook/stories"
import {nodeEditorStoryState, type NodeEditorStoryState} from "../ui-story-catalog.ts"

export type NodeEditorStoryStateAdapter = Readonly<{
  select(selection: NodeEditorStoryState["selection"]): boolean
  publish(target: NodeEditorStoryState): void
}>

export function applyNodeEditorStoryState(
  args: StorybookStoryArgs,
  adapter: NodeEditorStoryStateAdapter,
): NodeEditorStoryState {
  const state = nodeEditorStoryState(args)
  adapter.publish(state)
  adapter.select(state.selection)
  return state
}
