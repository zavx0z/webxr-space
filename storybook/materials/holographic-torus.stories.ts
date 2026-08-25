import {
  Color,
  GridHelper,
  HolographicMaterial,
  Mesh,
  Space,
  TorusGeometry,
} from "@engine/core"
import {holographicTorusStoryMetadata} from "../metadata"
import type {EngineStory} from "../story"

export const holographicTorusStory: EngineStory = Object.freeze({
  ...holographicTorusStoryMetadata,
  createScene() {
    const space = new Space()
    space.background = new Color(0x030811)
    space.add(new GridHelper(420, 21, 0x426886, 0x13273b))

    const torus = new Mesh(
      new TorusGeometry({radius: 68, tube: 20, radialSegments: 48, tubularSegments: 72}),
      new HolographicMaterial({
        color: 0x51dfff,
        opacity: 0.46,
        rimStrength: 2.2,
        scanDensity: 0.52,
        scanSharpness: 0.78,
        irregularity: 0.7,
      }),
    )
    torus.position.z = 92
    torus.rotation.set(0.72, 0.18, 0.28)
    space.add(torus)

    return {
      space,
      camera: {
        position: {x: 235, y: -285, z: 210},
        target: {x: 0, y: 0, z: 82},
        near: 1,
        far: 1400,
      },
    }
  },
})
