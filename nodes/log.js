/**
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

export default MetaFor("node-log")
  .context((t) => ({
    state: t.string.optional(),
    status: t.boolean.optional(),
  }))
  .states({
    проверка: {
      создание: { status: true },
      удаление: { status: false },
    },
    ожидание: {
      проверка: { state: { null: false } },
    },
    создание: {
      ожидание: {},
    },
    удаление: {
      ожидание: {},
    },
  })
  .core({
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
    проверка: process()
      .action(({ core, context }) => {
        if (!core.parent) throw new Error("Отсутствует родительский актор")
        return core.evalCondition([context.state])
      })
      .success(({ data, update }) => {
        console.log(data)
        update({ status: data, state: null })
      })
      .error(({ error, update }) => {
        console.log("error", error)
        update({ state: null })
      }),
    создание: process()
      .action(({}) => {})
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
        .filter({ meta: "unknown", actor: "unknown", path: "/state", op: "replace" })
        .equal(({ update, patch }) => {
          const upd = update({ state: patch.value })
          console.log(upd)
        }),
    ],
  ])
  .view()
