import {defineOwnerStory} from "../story-types.ts"

function story(route: string) {
  return defineOwnerStory(route, async document => {
    const {createComponentStory} = await import("../compiled/component-stories.tsx")
    return createComponentStory(document, route)
  })
}

export const story_frame_basic = story("components/frame/basic")
export const story_frame_nested = story("components/frame/nested")
export const story_frame_states = story("components/frame/states")
export const story_link_orthogonal = story("components/link/orthogonal")
export const story_link_cubic = story("components/link/cubic")
export const story_link_states = story("components/link/states")
export const story_link_disabled = story("components/link/disabled")
export const story_link_live_store = story("components/link/live-store")
export const story_node_tree_live_store = story("components/node-tree/live-store")
export const story_node_tree_viewport = story("components/node-tree/viewport")
export const story_node_tree_interaction = story("components/node-tree/interaction")
export const story_node_editor_navigation = story("components/node-editor/navigation")
export const story_node_editor_controlled = story("components/node-editor/controlled")
export const story_node_editor_readonly = story("components/node-editor/readonly")
export const story_node_tree_topology = story("components/node-tree/topology")

export const story_link_arrows = story("components/link/arrows")
export const story_link_filled_arrows = story("components/link/filled-arrows")
export const story_link_types = story("components/link/types")
export const story_link_color = story("components/link/color")
export const story_link_mixed_markers = story("components/link/mixed-markers")
