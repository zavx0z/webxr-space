/**
Существующий Worker entrypoint фиксированной политики.

Client управляет запросами и dispose, executor выполняет тот же чистый алгоритм.
Другие политики доступны через собственные точные client/executor subpaths.

@packageDocumentation
*/
export {FixedWorkerClient} from "../../../algorithms/fixed/src/worker/client.ts"
export {runFixedWorkerRequest} from "../../../algorithms/fixed/src/worker/executor.ts"
