import {
  Color,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  type PresentationClipShape,
  RoundedRectMaterial,
  Text,
  TextMaterial,
} from "@engine/core"
import {loadDocumentDefaultFont} from "@engine/core/default-font"
import {textStencilClippingStoryMetadata} from "../metadata"
import type {EngineStory} from "../story"

const PANEL_WIDTH = 270
const PANEL_HEIGHT = 200
const PANEL_RADIUS = 24
const PANEL_BORDER_WIDTH = 2
const PANEL_CLIP_INSET = 4

const panel = (x: number, fill: number): Readonly<{mesh: Mesh; clip: PresentationClipShape}> => {
  const mesh = new Mesh(
    new PlaneGeometry({width: PANEL_WIDTH, height: PANEL_HEIGHT}),
    new RoundedRectMaterial({
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      radius: PANEL_RADIUS,
      fill,
      border: 0x5f7694,
      borderWidth: PANEL_BORDER_WIDTH,
    }),
  )
  mesh.position.set(x, 0, 0)
  const clip: PresentationClipShape = {
    kind: "rounded-rect",
    coordinateSpace: mesh,
    center: [0, 0],
    halfSize: [PANEL_WIDTH / 2 - PANEL_CLIP_INSET, PANEL_HEIGHT / 2 - PANEL_CLIP_INSET],
    radii: [
      PANEL_RADIUS - PANEL_CLIP_INSET,
      PANEL_RADIUS - PANEL_CLIP_INSET,
      PANEL_RADIUS - PANEL_CLIP_INSET,
      PANEL_RADIUS - PANEL_CLIP_INSET,
    ],
  }
  return {mesh, clip}
}

export const textStencilClippingStory: EngineStory = Object.freeze({
  ...textStencilClippingStoryMetadata,
  async createScene() {
    const font = await loadDocumentDefaultFont()
    const root = new Object3D()
    const board = new Object3D()
    board.rotation.x = Math.PI / 2
    root.add(board)

    const left = panel(-142, 0x162a45)
    const right = panel(142, 0x173a2e)
    board.add(left.mesh)
    board.add(right.mesh)

    const divider = new Mesh(
      new PlaneGeometry({width: 4, height: 220}),
      new MeshBasicMaterial({color: 0x91a5c3}),
    )
    divider.position.z = 1
    board.add(divider)

    const leftCaption = new Text(
      "LEFT · ROUNDED PIXEL CLIP",
      font,
      14,
      new TextMaterial({color: 0xb8c6da}),
    )
    leftCaption.position.set(-250, 58, 3)
    leftCaption.presentationClips = [left.clip]
    board.add(leftCaption)

    const rightCaption = new Text(
      "RIGHT · INDEPENDENT COVER",
      font,
      14,
      new TextMaterial({color: 0xb8d8cd}),
    )
    rightCaption.position.set(25, 58, 3)
    rightCaption.presentationClips = [right.clip]
    board.add(rightCaption)

    const lineY = -30
    const overflow = new Text(
      "LEFT OVERFLOW MUST STOP AT THE ROUNDED PANEL · OVERFLOW OVERFLOW OVERFLOW",
      font,
      28,
      new TextMaterial({color: 0x79a7ff}),
    )
    overflow.position.set(-250, lineY, 3)
    overflow.presentationClips = [left.clip]
    board.add(overflow)

    const cleanLabel = new Text(
      "CLEAN LABEL",
      font,
      28,
      new TextMaterial({color: 0x8af0cf}),
    )
    cleanLabel.position.set(25, lineY, 3)
    cleanLabel.presentationClips = [right.clip]
    board.add(cleanLabel)

    return {
      root,
      background: new Color(0x090c12),
      camera: {
        position: {x: 0, y: -480, z: 0},
        target: {x: 0, y: 0, z: 0},
        near: 1,
        far: 1200,
      },
    }
  },
})
