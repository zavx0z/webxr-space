import {Space} from "@zavx0z/space/staging/space"
import {ViewPoint} from "@zavx0z/space/cameras/view-point"
import {Display} from "@zavx0z/space/portals/display"
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
    <Space>
      <ViewPoint
        position={{x: 10, y: -140, z: 10}}
        fov={Math.PI / 2}
        controls={false}
      />
      <Display
        id="alpha"
        size={{width: 600, height: 280}}
        resolution={{width: 600, height: 280}}
        style={css`
          display: block;
          width: 100%;
          height: 100%;
        `}
      >
        <AlphaRegion model={props.alpha} />
      </Display>
      <Display
        id="beta"
        position={{x: 652, y: 0, z: 0}}
        size={{width: 600, height: 280}}
        resolution={{width: 600, height: 280}}
        style={css`
          display: block;
          width: 100%;
          height: 100%;
        `}
      >
        <Editor
          title="Beta"
          value={props.beta.snapshot.value}
          model={props.beta}
          readOnly={false}
          languageId="typescript"
        />
      </Display>
      <HUD>
        <ClipboardHud />
      </HUD>
    </Space>
  )
}
