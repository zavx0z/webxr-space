import {describe, expect, test} from "bun:test"
import {Text, createDocument} from "@zavx0z/dom"
import {
  component,
  createContext,
  createRoot,
  provideContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "@zavx0z/component"
import type {
  ComponentValue,
  StateDispatch,
} from "@zavx0z/component"
import {
  bindChild,
  bindText,
  defineCompiledTemplate,
  writeBinding,
} from "@zavx0z/template/compiled"

function mountedRoot() {
  const document = createDocument()
  const container = document.createElement("div")
  document.appendChild(container)
  return {container, document, root: createRoot(container)}
}

function textTemplate<Props extends object>(
  displayName: string,
  read: (props: Readonly<Props>) => unknown,
) {
  return defineCompiledTemplate<Props>({
    bindingCount: 1,
    displayName,
    mount(document) {
      const span = document.createElement("span")
      const text = document.createTextNode("")
      span.appendChild(text)
      return {bindings: [bindText(text)], nodes: [span]}
    },
    render(props, values) {
      writeBinding(values, 0, read(props))
    },
  })
}

function childTemplate<Props extends object>(
  displayName: string,
  read: (props: Readonly<Props>) => ComponentValue,
) {
  return defineCompiledTemplate<Props>({
    bindingCount: 1,
    displayName,
    mount(document) {
      const wrapper = document.createElement("div")
      const start = document.createComment("child:start")
      const end = document.createComment("child:end")
      wrapper.append(start, end)
      return {bindings: [bindChild(start, end)], nodes: [wrapper]}
    },
    render(props, values) {
      writeBinding(values, 0, read(props))
    },
  })
}

describe("Compiled Component contract", () => {
  test("[CMP-001] Component использует ownerDocument контейнера и не создаёт собственный Document", () => {
    const mountedDocuments: Array<ReturnType<typeof createDocument>> = []
    const template = defineCompiledTemplate<Record<string, never>>({
      bindingCount: 0,
      displayName: "OwnerDocumentContract",
      mount(document) {
        mountedDocuments.push(document)
        return {bindings: [], nodes: [document.createElement("span")]}
      },
      render() {},
    })
    const first = mountedRoot()
    const second = mountedRoot()

    first.root.render(template, {})
    second.root.render(template, {})

    expect(
      mountedDocuments,
      "CMP-001: mount должен получить exact ownerDocument каждого контейнера",
    ).toEqual([first.document, second.document])
    expect(
      first.container.querySelector("span")?.ownerDocument,
      "CMP-001: первый component Node должен принадлежать Document первого контейнера",
    ).toBe(first.container.ownerDocument)
    expect(
      second.container.querySelector("span")?.ownerDocument,
      "CMP-001: второй component Node должен принадлежать Document второго контейнера",
    ).toBe(second.container.ownerDocument)
  })

  test("[CMP-002] Обновление сохраняет identity компонента и состояние hooks", () => {
    let mounts = 0
    let dispatch: StateDispatch<number> | null = null
    let firstDispatch: StateDispatch<number> | null = null
    const template = defineCompiledTemplate<Record<string, never>>({
      bindingCount: 1,
      displayName: "StateIdentityContract",
      mount(document) {
        mounts += 1
        const span = document.createElement("span")
        const text = document.createTextNode("")
        span.appendChild(text)
        return {bindings: [bindText(text)], nodes: [span]}
      },
      render(_, values) {
        const [count, setCount] = useState(1)
        firstDispatch ??= setCount
        dispatch = setCount
        writeBinding(values, 0, count)
      },
    })
    const {container, root} = mountedRoot()

    root.render(template, {})
    const span = container.querySelector("span")
    const text = span?.firstChild
    dispatch!(value => value + 1)

    expect(container.querySelector("span"), "CMP-002: state update не должен remount Element").toBe(span)
    expect(
      container.querySelector("span")?.firstChild,
      "CMP-002: state update не должен заменять addressed Text",
    ).toBe(text)
    expect((text as Text).data, "CMP-002: hook state должен пережить rerender").toBe("2")
    expect(dispatch, "CMP-002: dispatch identity должна быть стабильной").toBe(firstDispatch)
    expect(mounts, "CMP-002: один component instance должен mount ровно один раз").toBe(1)
  })

  test("[CMP-003] Context разрешается от ближайшего provider и обновляет его потребителей", () => {
    const Theme = createContext("fallback")
    const Leaf = textTemplate<Record<string, never>>(
      "ContextLeafContract",
      () => useContext(Theme),
    )
    const Inner = childTemplate<{theme: string}>("InnerContextContract", props =>
      provideContext(Theme, props.theme, component(Leaf, {}, "leaf")))
    const Outer = childTemplate<{inner: string; outer: string}>("OuterContextContract", props =>
      provideContext(
        Theme,
        props.outer,
        component(Inner, {theme: props.inner}, "inner"),
      ))

    const fallback = mountedRoot()
    fallback.root.render(Leaf, {})
    expect(
      fallback.container.textContent,
      "CMP-003: consumer без provider должен получить context fallback",
    ).toBe("fallback")

    const {container, root} = mountedRoot()
    root.render(Outer, {inner: "inner", outer: "outer"})
    const text = container.querySelector("span")?.firstChild
    expect(
      container.textContent,
      "CMP-003: ближайший inner provider должен перекрыть outer provider",
    ).toBe("inner")

    root.render(Outer, {inner: "updated", outer: "ignored"})
    expect(
      container.querySelector("span")?.firstChild,
      "CMP-003: context update должен сохранить identity consumer Text",
    ).toBe(text)
    expect(
      container.textContent,
      "CMP-003: изменение ближайшего provider должно обновить consumer",
    ).toBe("updated")
  })

  test("[CMP-004] Эффект выполняется после принятого обновления, а его cleanup вызывается ровно один раз", () => {
    const events: string[] = []
    let containerText = () => ""
    const template = textTemplate<{fail: boolean; value: number}>(
      "EffectCommitContract",
      props => {
        useEffect(() => {
          events.push(`setup:${props.value}:${containerText()}`)
          return () => events.push(`cleanup:${props.value}`)
        }, [props.value])
        if (props.fail) throw new Error("CMP-004 rejected update")
        return props.value
      },
    )
    const {container, root} = mountedRoot()
    containerText = () => container.textContent

    root.render(template, {fail: false, value: 1})
    root.render(template, {fail: false, value: 2})
    expect(() => root.render(template, {fail: true, value: 3})).toThrow(
      "CMP-004 rejected update",
    )

    expect(
      events,
      "CMP-004: effect должен видеть committed DOM, cleanup — выполняться перед следующим setup",
    ).toEqual(["setup:1:1", "cleanup:1", "setup:2:2"])
    expect(container.textContent, "CMP-004: rejected update не должен менять committed DOM").toBe("2")

    root.unmount()
    expect(
      events,
      "CMP-004: unmount должен вызвать cleanup последнего эффекта ровно один раз",
    ).toEqual(["setup:1:1", "cleanup:1", "setup:2:2", "cleanup:2"])
  })

  test("[CMP-005] Unmount очищает состояние, подписки и эффекты компонента", () => {
    let dispatch: StateDispatch<number> | null = null
    let externalValue = 7
    let lastNotify: (() => void) | null = null
    let activeNotify: (() => void) | null = null
    let subscriptions = 0
    let unsubscriptions = 0
    let effectCleanups = 0
    const subscribe = (notify: () => void) => {
      subscriptions += 1
      activeNotify = notify
      lastNotify = notify
      return () => {
        unsubscriptions += 1
        if (activeNotify === notify) activeNotify = null
      }
    }
    const getSnapshot = () => externalValue
    const template = textTemplate<Record<string, never>>(
      "UnmountContract",
      () => {
        const [localValue, setLocalValue] = useState(0)
        dispatch = setLocalValue
        const snapshot = useSyncExternalStore(subscribe, getSnapshot)
        useEffect(() => () => {
          effectCleanups += 1
        }, [])
        return `${localValue}:${snapshot}`
      },
    )
    const {container, root} = mountedRoot()

    root.render(template, {})
    expect(container.textContent, "CMP-005: mounted state и snapshot должны быть видимы").toBe("0:7")
    expect(subscriptions, "CMP-005: external store должен получить одну подписку").toBe(1)

    root.unmount()
    root.unmount()
    externalValue = 8
    const notifyAfterUnmount = lastNotify as (() => void) | null
    notifyAfterUnmount?.()

    expect(container.textContent, "CMP-005: unmount должен удалить component region").toBe("")
    expect(activeNotify, "CMP-005: unmount должен освободить active subscription").toBeNull()
    expect(unsubscriptions, "CMP-005: unsubscribe должен выполниться ровно один раз").toBe(1)
    expect(effectCleanups, "CMP-005: effect cleanup должен выполниться ровно один раз").toBe(1)
    expect(
      () => dispatch!(1),
      "CMP-005: stale state dispatch не должен оживлять unmounted component",
    ).toThrow("Cannot update an unmounted component")
  })
})
