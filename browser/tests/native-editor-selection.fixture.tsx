import {HUD} from "@zavx0z/space/portals/hud"
import {useSpace} from "@zavx0z/browser"
import {ClipboardMenu} from "@zavx0z/ui/menus/clipboard-menu"
import {Editor} from "@zavx0z/ui/widgets/editor"
import type {CodeEditorModel} from "@zavx0z/ui/code-editor-model"

function ClipboardHud() {
  const clipboard = useSpace(state => state.clipboard)
  return <ClipboardMenu controller={clipboard} />
}

function AlphaRegion(props: Readonly<{model: CodeEditorModel}>) {
  return (
    <section
      style={css`
        display: flex;
        flex-direction: row;
        width: 100%;
        height: 100%;
      `}
    >
      <aside
        style={css`
          display: block;
          width: 220px;
          flex-shrink: 0;
        `}
      >
        <p>Source files</p>
        <p>Scopes</p>
      </aside>
      <Editor
        title="Alpha"
        value={props.model.snapshot.value}
        model={props.model}
        readOnly={false}
        languageId="typescript"
        style={css`
          width: 0;
          flex-grow: 1;
        `}
      />
    </section>
  )
}

export function NativeEditorSelectionFixture(props: Readonly<{alpha: CodeEditorModel; beta: CodeEditorModel}>) {
  return (
    <space>
      <viewpoint
        x={10}
      y={-140}
      z={10}
        fov={Math.PI / 2}
        controls={false}
      />
      <display
        id="alpha"
        width={158.75}
        height={280 * 25.4 / 96}
        style={css`
          display: block;
          width: 600px;
          height: 280px;
        `}
      >
        <AlphaRegion model={props.alpha} />
      </display>
      <display
        id="beta"
        width={158.75}
        height={280 * 25.4 / 96}
        style={css`
          translate: 652mm 0 0;
          display: block;
          width: 600px;
          height: 280px;
        `}
      >
        <Editor
          title="Beta"
          value={props.beta.snapshot.value}
          model={props.beta}
          readOnly={false}
          languageId="typescript"
        />
      </display>
      <HUD>
        <ClipboardHud />
      </HUD>
    </space>
  )
}
