import type {CloseableBatchSession} from "../types/session.ts"

/**
Передаёт одну session всей batch-операции и гарантирует её закрытие.

@param create - Создаёт session ровно один раз после валидации входа.

@param operation - Выполняет все элементы batch в заимствованной session.

@returns Результат operation после успешного закрытия session.

@throws Ошибка operation передаётся после попытки закрыть session.
*/
export async function usingBatchSession<T extends CloseableBatchSession, R>(
  create: () => T,
  operation: (session: T) => Promise<R>,
): Promise<R> {
  const session = create()
  try {
    return await operation(session)
  } finally {
    await session.close()
  }
}
