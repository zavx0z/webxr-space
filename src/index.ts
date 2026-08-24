/**
 * Чистый TypeScript engine автоматической раскладки compound-графов.
 *
 * Package принимает только заранее измеренный {@link LayoutGraph} и владеет
 * координатами нод, уплотнением compound-контейнеров, generated gateways и
 * orthogonal routing.
 * UI documents, текст, Flex, renderer, DOM и product vocabulary находятся за
 * границей.
 * Built for [MetaFor](https://github.com/zavx0z/metafor).
 * @packageDocumentation
 */

export * from "../types/index.ts"
export {
  layoutFixed,
  type FixedLayoutGraph,
  type FixedLayoutResult,
} from "./fixed.ts"
