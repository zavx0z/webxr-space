import type {EngineStory} from "./story"

export type EngineStoryMetadata = Omit<EngineStory, "createScene">

export const coordinateSpaceStoryMetadata: EngineStoryMetadata = Object.freeze({
  id: "foundations-coordinate-space",
  group: "Foundations",
  title: "Система координат Z-up",
  icon: "architecture",
  materialIcon: "Hub",
  description: "Retained-сцена в миллиметрах с осью Z вверх и единым наследуемым деревом трансформаций.",
  sourceFile: "packages/core/storybook/foundations/coordinate-space.stories.ts",
  tags: ["Z-up", "миллиметры", "retained-сцена"],
  source: `const space = new Space()
space.background = new Color(0x070b12)
space.add(new GridHelper(360, 18))
space.add(new AxesHelper(120))

const box = new Mesh(
  new BoxGeometry({width: 90, height: 70, depth: 60}),
  new MeshBasicMaterial({color: 0x79a7ff}),
)
box.position.z = 30
space.add(box)`,
})

export const instancedBoxesStoryMetadata: EngineStoryMetadata = Object.freeze({
  id: "geometry-instanced-boxes",
  group: "Geometry",
  title: "Инстансированные боксы",
  icon: "geometry",
  materialIcon: "ViewInAr",
  description: "Одна геометрия и один материал создают поле model-матриц без копирования данных отрисовки.",
  sourceFile: "packages/core/storybook/geometry/instanced-boxes.stories.ts",
  tags: ["инстансинг", "общая геометрия", "GPU-буферы"],
  source: `const boxes = new InstancedMesh(
  new BoxGeometry({width: 22, height: 22, depth: 22}),
  new MeshBasicMaterial({color: 0x8af0cf}),
  25,
)

for (let index = 0; index < boxes.count; index += 1) {
  boxes.setMatrixAt(index, matrixFor(index))
}
space.add(boxes)`,
})

export const holographicTorusStoryMetadata: EngineStoryMetadata = Object.freeze({
  id: "materials-holographic-torus",
  group: "Materials",
  title: "Голографический тор",
  icon: "hologram",
  materialIcon: "AutoAwesome",
  description: "Прозрачная поверхность без текстур: один ограниченный mesh-проход и линии сканирования в мировом пространстве.",
  sourceFile: "packages/core/storybook/materials/holographic-torus.stories.ts",
  tags: ["аналитический материал", "прозрачный проход", "без текстур"],
  source: `const torus = new Mesh(
  new TorusGeometry({
    radius: 68,
    tube: 20,
    radialSegments: 48,
    tubularSegments: 72,
  }),
  new HolographicMaterial({
    color: 0x51dfff,
    opacity: 0.46,
    rimStrength: 2.2,
  }),
)
space.add(torus)`,
})

export const thinFilmSphereStoryMetadata: EngineStoryMetadata = Object.freeze({
  id: "materials-thin-film-sphere",
  group: "Materials",
  title: "Тонкоплёночная сфера",
  icon: "thin-film",
  materialIcon: "BlurOn",
  description: "Замкнутая поверхность с аналитическим эффектом Френеля, спектральной интерференцией и ограниченными бликами без постобработки.",
  sourceFile: "packages/core/storybook/materials/thin-film-sphere.stories.ts",
  tags: ["тонкая плёнка", "Френель", "один проход"],
  source: `const shell = new Mesh(
  new SphereGeometry({radius: 72, widthSegments: 48, heightSegments: 32}),
  new ThinFilmMaterial({
    color: 0x4ecbff,
    rimColor: 0xf1fbff,
    opacity: 0.5,
    iridescence: 0.88,
    highlightSize: 0.42,
  }),
)
space.add(shell)`,
})

export const textStencilClippingStoryMetadata: EngineStoryMetadata = Object.freeze({
  id: "text-stencil-clipping",
  group: "Text",
  title: "Трафаретная обрезка текста",
  icon: "text",
  materialIcon: "TextFields",
  description: "Две отдельные скруглённые панели стоят на одной вертикальной board с обычной Z-up камерой и задают public presentation clips. Контентный clip отступает на 4 world units: внутрь 2-unit рамки и ещё на AA-зазор. Пиксели длинной левой строки не заходят под border. На той же высоте остаётся только независимый CLEAN LABEL; подписи вынесены отдельной строкой.",
  sourceFile: "packages/core/storybook/text/stencil-clipping.stories.ts",
  tags: ["обрезка представления", "цепочка скруглённых границ", "трафарет текста"],
  source: `const PANEL_BORDER_WIDTH = 2
const PANEL_CLIP_INSET = 4 // border + AA gap

const board = new Object3D()
board.rotation.x = Math.PI / 2
space.add(board)

const leftClip: PresentationClipShape = {
  kind: "rounded-rect",
  coordinateSpace: leftPanel,
  center: [0, 0],
  halfSize: [135 - PANEL_CLIP_INSET, 100 - PANEL_CLIP_INSET],
  radii: [
    24 - PANEL_CLIP_INSET,
    24 - PANEL_CLIP_INSET,
    24 - PANEL_CLIP_INSET,
    24 - PANEL_CLIP_INSET,
  ],
}

overflow.presentationClips = [leftClip]
cleanLabel.presentationClips = [rightClip]`,
})

export const ENGINE_STORYBOOK_METADATA_BY_ROUTE = Object.freeze({
  "space/coordinate-system/z-up": coordinateSpaceStoryMetadata,
  "instanced-mesh/geometry/boxes": instancedBoxesStoryMetadata,
  "holographic-material/geometry/torus": holographicTorusStoryMetadata,
  "thin-film-material/geometry/sphere": thinFilmSphereStoryMetadata,
  "text/presentation-clip/stencil": textStencilClippingStoryMetadata,
})
