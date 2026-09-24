import {Inspector} from "@zavx0z/ui/widgets/inspector"
import {Panel} from "@zavx0z/ui/surfaces/panel"
import {uiIcons} from "@zavx0z/ui/themes/icons"

export function InspectorFixture() {
  return <Inspector
    ariaLabel="Инспектор свойств"
    categoriesLabel="Категории"
    categories={[{id: "props", label: "P", iconSrc: uiIcons.settings, title: "Props", panelIds: ["props"]}]}
    selectedCategoryId="props"
    query=""
    searchLabel="Поиск"
    searchPlaceholder="Поиск"
    context={{label: "Button", iconSrc: uiIcons.resource}}
    onQueryChange={() => {}}
  >
    <Panel
      label="Свойства"
      title="Свойства"
      expanded={true}
      onToggle={() => {}}
    >
      <StaticContent />
    </Panel>
  </Inspector>
}

function StaticContent() {
  return <div>Поле</div>
}
