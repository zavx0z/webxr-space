import {component, fixedChildren, type ComponentKey, type ComponentValue} from "@zavx0z/component"
import {isCompiledTemplate} from "@zavx0z/template/compiled"

export type {JSX} from "@zavx0z/template/jsx-runtime"

export const Fragment = Symbol("Headless.Fragment")

/**
JSX в spec упаковывает уже скомпилированный компонент и props в публичный ComponentValue.
Production-TSX по-прежнему компилирует Template; этот транспорт не исполняет его функции.
*/
export function jsx(type: unknown, props: Record<string, unknown> | null, key: ComponentKey = null): ComponentValue {
  if (type === Fragment) {
    const children = props?.children
    return fixedChildren(Array.isArray(children) ? children : children == null ? [] : [children])
  }
  if (!isCompiledTemplate(type)) {
    throw new Error("Headless ожидает скомпилированный компонент: подключите @immersive/headless/preload до загрузки TSX")
  }
  return component(type, props ?? {}, key)
}

export {jsx as jsxs, jsx as jsxDEV}
