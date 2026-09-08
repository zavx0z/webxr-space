import {ViewPoint} from "@zavx0z/space/cameras/view-point"
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
    <xr-space>
      <ViewPoint
        position={{x: 10, y: -140, z: 10}}
        fov={Math.PI / 2}
        controls={false}
      />
      <display
        id="alpha"
        dpi={96}
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
        dpi={96}
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
    </xr-space>
  )
}
