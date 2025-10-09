/**
 * @typedef
 */

export default MetaFor("node-log")
  .context((t) => ({
    queue: t.array.required(/**@type {Array<String>} */ ([])),
  }))
  .states({
    idle: {},
    создание: {},
    удаление: {},
  })
  .core({
    childSchema: null,
    context: null,
    state: null,
  })
  .processes()
  .reactions((reaction) => [
    [
      ["idle", "создание", "удаление"],
      reaction({ label: "Добавляет в очередь состояние" })
        .filter({ meta: "unknown", actor: "unknown", path: "/state", op: "replace" })
        .equal(({ update, patch, context }) => {
          update({ queue: [...context.queue, patch.value] })
        }),
    ],
  ])
  .view()
