/**
Пространственная основа платформы: преобразования объектов, геометрия,
материалы, raycast, загрузка моделей, анимация и данные шрифтов.

ViewPoint принимает уже маршрутизированные команды orbit/pan/zoom.
Browser владеет Canvas, вводом и кадрами; конкретные ресурсы GPU и рисование
принадлежат `@zavx0z/webgpu`.

Система координат неизменна: правая, +X вправо, +Y вперёд, +Z вверх.
Единица расстояния — миллиметр, углы задаются в радианах, глубина clip space
лежит в [0, 1]. Камера не имеет настраиваемого up. glTF нормализуется
преобразованием импортированного дерева объектов.

@packageDocumentation
*/

export * from "./core/object-3d"
export * from "./core/presentation-clip"
export * from "./core/buffer-geometry"
export * from "./geometries/plane-geometry"
export * from "./geometries/textured-plane-geometry"
export * from "./geometries/sphere-geometry"
export * from "./geometries/torus-geometry"
export * from "./geometries/box-geometry"
export * from "./core/view-point"
export * from "./core/mesh"
export * from "./core/instanced-mesh"
export * from "./core/instance-layer"
export * from "./core/instanced-rounded-rect"
export * from "./core/instanced-stroked-path"
export * from "./core/wireframe-instanced-mesh"
export * from "./core/skinned-mesh"
export * from "./scenes/space"
export * from "./loaders/gltf-loader"
export * from "./materials"
export * from "./materials/glass-material"
export * from "./math"
export * from "./helpers/grid-helper"
export * from "./helpers/axes-helper"
export * from "./lights/light"
export * from "./lights/directional-light"
export * from "./text/true-type-font"
export * from "./objects/line"
export * from "./objects/line-segments"
export * from "./objects/text"
export * from "./materials/text-material"
export * from "./animation"
export * from "./core/raycaster"
