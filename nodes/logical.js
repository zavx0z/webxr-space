/**
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

export const meta = MetaFor("logical")
  .context((t) => ({
    state: t.string.optional(),
    status: t.boolean.optional(),
    children: t.array.required(/** @type {string[]} */ ([])),

    error: t.string.optional({ label: "Ошибка" }),
  }))
  .states({
    "сбор данных": {
      "передача дочерних элементов": {},
    },
    "передача дочерних элементов": {
      ошибка: { error: { null: false } },
      завершение: {},
    },
    ошибка: {},
    завершение: {},
    ожидание: {
      "сбор данных": { state: { null: false } },
    },
    создание: {
      ожидание: {},
    },
    удаление: {
      ожидание: {},
    },
  })
  .core({
    /** @type {NodeLogical|null} */
    node: null,
    data: {},
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
    "сбор данных": process()
      .action(({ core, context, self }) => {
        if (!core.node) throw new Error("Нода не передана")

        console.log(core.node)
        return {}
      })
      .success(({ data, update }) => {
        console.log(data)
        update({ ...data, state: null })
      })
      .error(({ error, update }) => {
        console.log("error", error)
        update({ state: null })
      }),
    "передача дочерних элементов": process()
      .action(async ({ core, self }) => {
        if (!core.node) throw new Error("Отсутствует схема компонентов")
        const [{ Actor }, { default: meta }] = await Promise.all([
          import("everywhere-everything/actor"),
          import("nodes/nodes.js"),
        ])
        const child = core.node.child
        const id = `${self.meta}:${self.path}`
        Actor.appendChild(self.actor, meta, { id, core: { child } })
      })
      .error(({ error, update }) => update({ error: error.message })),
    создание: process()
      .action(async ({ core }) => {
        if (!core.schema) throw new Error("Отсутствует схема компонентов")

        const { meta } = await import("./node.js")
        const { Actor } = await import("everywhere-everything/actor")

        // Actor.fromSchema(meta, "canvas/0", { child: core.schema.child })
      })
      .error(({ error }) => console.log(error)),
    удаление: process()
      .action(({}) => {})
      .error(({ error }) => console.log(error)),
    ожидание: process()
      .action(({}) => {})
      .success(({ update }) => update({ status: null }))
      .error(({ error }) => console.log(error)),
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
        .equal(({ update, patch }) => {
          const upd = update({ state: patch.value })
          console.log(upd)
        }),
    ],
  ])
  .view()
export default meta
