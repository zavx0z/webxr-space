import {
  Color,
  GridHelper,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  ThinFilmMaterial,
} from "@engine/core"
import {thinFilmSphereStoryMetadata} from "../metadata"
import type {EngineStory} from "../story"

export const thinFilmSphereStory: EngineStory = Object.freeze({
  ...thinFilmSphereStoryMetadata,
  createScene() {
    const root = new Object3D()
    root.add(new GridHelper(420, 21, 0x5d648e, 0x20243c))

    const core = new Mesh(
      new SphereGeometry({radius: 55, widthSegments: 36, heightSegments: 24}),
      new MeshBasicMaterial({color: 0x11172a}),
    )
    core.position.z = 78
    root.add(core)

    const shell = new Mesh(
      new SphereGeometry({radius: 72, widthSegments: 48, heightSegments: 32}),
      new ThinFilmMaterial({
        color: 0x4ecbff,
        rimColor: 0xf1fbff,
        opacity: 0.5,
        rimStrength: 1.8,
        iridescence: 0.88,
        filmThickness: 0.84,
        highlightSize: 0.42,
      }),
    )
    shell.position.z = 78
    root.add(shell)

    return {
      root,
      background: new Color(0x05070e),
      camera: {
        position: {x: 220, y: -280, z: 205},
        target: {x: 0, y: 0, z: 78},
        near: 1,
        far: 1400,
      },
    }
  },
})
