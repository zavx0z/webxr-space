import type {
  StorybookStoryGroupInput,
  StorybookStoryPath,
} from "@zavx0z/storybook/stories"
import {
  coordinateSpaceStoryMetadata,
  holographicTorusStoryMetadata,
  instancedBoxesStoryMetadata,
  textStencilClippingStoryMetadata,
  thinFilmSphereStoryMetadata,
} from "./metadata"

/**
 * Owner metadata and lazy loaders for the public `@engine/core` stories.
 *
 * This file is development-only: `packages/core/package.json#exports` and the
 * production TypeScript project deliberately exclude `storybook/**`.
 */
export const ENGINE_STORYBOOK_GROUPS = [
  {
    id: "foundations",
    label: "Основы",
    components: [
      {
        id: "space",
        label: "Пространство",
        apiName: "Space",
        tags: coordinateSpaceStoryMetadata.tags,
        sections: [
          {
            id: "coordinate-system",
            label: "Система координат",
            variants: [
              {
                id: "z-up",
                label: "Ось Z вверх",
                title: coordinateSpaceStoryMetadata.title,
                load: () => import("./foundations/coordinate-space.stories")
                  .then(({coordinateSpaceStory}) => coordinateSpaceStory),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "geometry",
    label: "Геометрия",
    components: [
      {
        id: "instanced-mesh",
        label: "Инстансированный mesh",
        apiName: "InstancedMesh",
        tags: instancedBoxesStoryMetadata.tags,
        sections: [
          {
            id: "geometry",
            label: "Геометрия",
            variants: [
              {
                id: "boxes",
                label: "Боксы",
                title: instancedBoxesStoryMetadata.title,
                load: () => import("./geometry/instanced-boxes.stories")
                  .then(({instancedBoxesStory}) => instancedBoxesStory),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "materials",
    label: "Материалы",
    components: [
      {
        id: "holographic-material",
        label: "Голографический материал",
        apiName: "HolographicMaterial",
        tags: holographicTorusStoryMetadata.tags,
        sections: [
          {
            id: "geometry",
            label: "Геометрия",
            variants: [
              {
                id: "torus",
                label: "Тор",
                title: holographicTorusStoryMetadata.title,
                load: () => import("./materials/holographic-torus.stories")
                  .then(({holographicTorusStory}) => holographicTorusStory),
              },
            ],
          },
        ],
      },
      {
        id: "thin-film-material",
        label: "Тонкоплёночный материал",
        apiName: "ThinFilmMaterial",
        tags: thinFilmSphereStoryMetadata.tags,
        sections: [
          {
            id: "geometry",
            label: "Геометрия",
            variants: [
              {
                id: "sphere",
                label: "Сфера",
                title: thinFilmSphereStoryMetadata.title,
                load: () => import("./materials/thin-film-sphere.stories")
                  .then(({thinFilmSphereStory}) => thinFilmSphereStory),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "text",
    label: "Текст",
    components: [
      {
        id: "text",
        label: "Текст",
        apiName: "Text",
        tags: textStencilClippingStoryMetadata.tags,
        sections: [
          {
            id: "presentation-clip",
            label: "Обрезка представления",
            variants: [
              {
                id: "stencil",
                label: "Трафарет",
                title: textStencilClippingStoryMetadata.title,
                load: () => import("./text/stencil-clipping.stories")
                  .then(({textStencilClippingStory}) => textStencilClippingStory),
              },
            ],
          },
        ],
      },
    ],
  },
] as const satisfies readonly StorybookStoryGroupInput<unknown>[]

export const ENGINE_STORYBOOK_REPRESENTATIVE = Object.freeze({
  component: "space",
  section: "coordinate-system",
  variant: "z-up",
}) satisfies StorybookStoryPath
