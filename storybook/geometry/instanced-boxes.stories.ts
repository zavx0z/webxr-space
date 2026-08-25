import {
  BoxGeometry,
  Color,
  GridHelper,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Space,
  Vector3,
} from "@engine/core"
import {instancedBoxesStoryMetadata} from "../metadata"
import type {EngineStory} from "../story"

export const instancedBoxesStory: EngineStory = Object.freeze({
  ...instancedBoxesStoryMetadata,
  createScene() {
    const space = new Space()
    space.background = new Color(0x060a0f)
    space.add(new GridHelper(420, 21, 0x4d8b7a, 0x173a33))

    const side = 5
    const boxes = new InstancedMesh(
      new BoxGeometry({width: 22, height: 22, depth: 22}),
      new MeshBasicMaterial({color: 0x8af0cf}),
      side * side,
    )
    for (let row = 0; row < side; row += 1) {
      for (let column = 0; column < side; column += 1) {
        const index = row * side + column
        const height = 14 + ((row + column) % 4) * 13
        const matrix = new Matrix4().compose(
          new Vector3((column - 2) * 50, (row - 2) * 50, height),
          new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (row - column) * 0.13),
          new Vector3(1, 1, 0.7 + height / 45),
        )
        boxes.setMatrixAt(index, matrix)
      }
    }
    space.add(boxes)

    return {
      space,
      camera: {
        position: {x: 270, y: -330, z: 260},
        target: {x: 0, y: 0, z: 35},
        near: 1,
        far: 1600,
      },
    }
  },
})
