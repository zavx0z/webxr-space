import {defineOwnerStory, withStoryProps} from "../story-types.ts"
import {homeIcon} from "../../../themes/icons.ts"

const items = Object.freeze([
  Object.freeze({id: "home", label: "Главная", iconSrc: homeIcon}),
  Object.freeze({id: "package", label: "@webxr/nodes"}),
  Object.freeze({id: "layout", label: "Раскладка"}),
  Object.freeze({id: "adaptive", label: "Адаптивная"}),
  Object.freeze({id: "shared", label: "Общий сокет"}),
  Object.freeze({id: "right", label: "Справа"}),
])

export const story_basic_default = defineOwnerStory(
  "components/navigation/breadcrumbs/basic/default",
  async document => {
    const {createCompiledBreadcrumbsProductionStory} = await import(
      "../compiled/compiled-breadcrumbs-production-story.tsx"
    )
    return withStoryProps(createCompiledBreadcrumbsProductionStory(document, {items}), {items})
  },
)
