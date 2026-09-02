import type { PartAttrMeta } from "./meta.t"
import { processBasicAttributes, processSemanticAttributes, processTemplateLiteralAttribute } from "../parser"
import { createNode } from "."
import type { ParseContext } from "../parser.t"
import type { NodeMeta } from "./meta.t"

const processRootBinding = (
  source: string,
  root: "mass" | "energy",
  context: ParseContext,
): NonNullable<NodeMeta[typeof root]> =>
  source.trim() === root
    ? {data: `/${root}`}
    : processSemanticAttributes(source, context) || source

/** Создает NodeMeta из PartMeta. */
export const createNodeDataMeta = (
  node: PartAttrMeta,
  context: ParseContext = { pathStack: [], level: 0 }
): NodeMeta => {
  const attributes = processBasicAttributes(node, context)
  const src = attributes.string?.src
  if (src !== undefined) {
    delete attributes.string!.src
    if (Object.keys(attributes.string!).length === 0) delete attributes.string
  }
  const processed = processTemplateLiteralAttribute(node.tag, context)
  let result: NodeMeta = {
    tag: processed || node.tag,
    type: "meta",
    ...(src === undefined ? {} : {src}),
    ...attributes,
    // Добавляем дочерние элементы, если они есть
    ...(node.child && { child: node.child.map((child) => createNode(child, context)) }),
  }
  // Обрабатываем семантические атрибуты
  if ("mass" in node && node.mass) {
    result.mass = processRootBinding(node.mass, "mass", context)
  }
  if ("energy" in node && node.energy) {
    result.energy = processRootBinding(node.energy, "energy", context)
  }
  if ("fields" in node && node.fields) {
    result.fields = processSemanticAttributes(node.fields, context) || node.fields
  }
  return result
}
