import type {TypeDocNavigationHandle} from "../types/navigation.ts"

type NavigationTarget = Readonly<{
  declaration: string
  path: readonly string[]
  element: HTMLElement
}>
type VisibleTarget = Readonly<{
  target: NavigationTarget
  bounds: DOMRect
}>

function navigationKey(declaration: string, path: readonly string[]) {
  return JSON.stringify([declaration, path])
}

function intersects(viewport: DOMRect, bounds: DOMRect) {
  return bounds.width > 0
    && bounds.height > 0
    && bounds.bottom > viewport.top
    && bounds.top < viewport.bottom
    && bounds.right > viewport.left
    && bounds.left < viewport.right
}

/**
Создаёт внутренний реестр целей одного смонтированного TypeDoc.
Регистрация использует полный tuple декларации и пути, поэтому `input.output`
и вложенность `input` → `output` не совпадают.
*/
export function createTypeDocNavigation() {
  const targets = new Map<string, NavigationTarget>()
  const handle = Object.freeze<TypeDocNavigationHandle>({
    navigate(declaration, path) {
      const target = targets.get(navigationKey(declaration, path))?.element
      if (!target) return false
      target.scrollIntoView({block: "start", inline: "nearest"})
      return true
    },
    locate(viewport) {
      const viewportBounds = viewport.getBoundingClientRect()
      if (viewportBounds.width <= 0 || viewportBounds.height <= 0) return null
      const visible: VisibleTarget[] = [...targets.values()]
        .filter(target => target.element.ownerDocument === viewport.ownerDocument)
        .map(target => ({target, bounds: target.element.getBoundingClientRect()}))
        .filter(({bounds}) => intersects(viewportBounds, bounds))
      if (visible.length === 0) return null
      const atTop = visible.filter(({bounds}) => bounds.top <= viewportBounds.top && bounds.bottom > viewportBounds.top)
      const [current] = (atTop.length > 0 ? atTop : visible).sort((left, right) => {
        if (atTop.length > 0) return right.target.path.length - left.target.path.length || right.bounds.top - left.bounds.top
        return left.bounds.top - right.bounds.top || right.target.path.length - left.target.path.length
      })
      if (!current) return null
      return Object.freeze({
        declaration: current.target.declaration,
        path: Object.freeze([...current.target.path]),
      })
    },
  })
  return Object.freeze({
    handle,
    register(declaration: string, path: readonly string[], element: HTMLElement | null) {
      const key = navigationKey(declaration, path)
      if (element) targets.set(key, Object.freeze({
        declaration,
        path: Object.freeze([...path]),
        element,
      }))
      else targets.delete(key)
    },
    dispose() { targets.clear() },
  })
}
