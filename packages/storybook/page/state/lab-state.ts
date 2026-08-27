import {UI_COMPONENT_GRAPH} from "../fixtures/graph.ts"
import {loadUiGraphStories, type UiGraphStoryPreview} from "../stories.ts"

/** Package-owned immutable state assembled before the graph surface is mounted. */
export class UiComponentGraphLabState {
  private constructor(
    readonly graph: typeof UI_COMPONENT_GRAPH,
    readonly previews: ReadonlyMap<string, UiGraphStoryPreview>,
  ) {}

  static async create(): Promise<UiComponentGraphLabState> {
    return new UiComponentGraphLabState(
      UI_COMPONENT_GRAPH,
      await loadUiGraphStories(UI_COMPONENT_GRAPH),
    )
  }
}
