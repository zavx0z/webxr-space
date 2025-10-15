/**
 * @typedef {import("@metafor/meta").NodeLogical} NodeLogical
 * @typedef {import("@metafor/actor").Actor} Actor
 */

export const meta = MetaFor("logical")
  .context((t) => ({
    state: t.string.optional(),
    status: t.boolean.optional(),
    children: t.array.required(/** @type {string[]} */ ([])),

    error: t.string.optional({ label: "Ошибка" }),
  }))
  .states({
    данные: {
      дети: {},
    },
    дети: {
      ошибка: { error: { null: false } },
      ожидание: {},
    },
    ожидание: {},
    создание: {
      ожидание: {},
    },
    удаление: {
      ожидание: {},
    },
    ошибка: {},
    конец: {},
  })
  .core({
    /** @type {NodeLogical|null} */
    node: null,
    /** @type {Actor|null} */
    parent: null,
    /** @type {NodeLogical|null} */
    schema: null,
    context: null,
    state: null,
    /** @type {(([state]:[string|null]) => boolean)} */
    evalCondition: (state) => false,
  })
  .processes((process) => ({
    данные: process()
      .action(({ core, context, self }) => {
        if (!core.node) throw new Error("Нода не передана")
        return {}
      })
      .success(({ data, update }) => update({ ...data, state: null }))
      .error(({ error, update }) => update({ error: error.message })),
    дети: process()
      .action(async ({ core, self }) => {
        if (!core.node) throw new Error("Отсутствует схема компонентов")
        const [{ Actor }, { default: meta }] = await Promise.all([import("@metafor/actor"), import("nodes/nodes.js")])
        const child = core.node.child
        Actor.appendChild(self.actor, meta, { core: { child } })
      })
      .error(({ error, update }) => update({ error: error.message })),
    создание: process()
      .action(async ({ core }) => {
        if (!core.schema) throw new Error("Отсутствует схема компонентов")
        const { meta } = await import("./node.js")
        const { Actor } = await import("@metafor/actor")

        // Actor.fromSchema(meta, "canvas/0", { child: core.schema.child })
      })
      .error(({ error, update }) => update({ error: error.message })),
    удаление: process()
      .action(({}) => {})
      .error(({ error, update }) => update({ error: error.message })),
  }))
  .reactions((reaction) => [
    [
      ["ожидание", "создание", "удаление"],
      reaction({ label: "Обновление состояния родительского актора" })
        .filter(({ self }) => ({
          actor: self.actor.split("/")[1],
          path: "/state",
          op: "replace",
        }))
        .equal(({ update, patch }) => update({ state: patch.value })),
    ],
  ])
  .view()
export default meta
