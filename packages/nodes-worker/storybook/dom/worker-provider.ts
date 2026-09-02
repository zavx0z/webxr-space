import type {
  WorkerProtocolExchange,
  WorkerProtocolMessage,
} from "../../dom/worker-protocol.ts"

export type WorkerDomExchangeProvider = Readonly<{
  id: string
  createExchange(generation: number): WorkerProtocolExchange
  source(generation: number): string
}>

export function asWorkerProtocolMessage<T extends Readonly<{
  type: string
  requestId: number
  generation: number
}>>(message: T): WorkerProtocolMessage {
  return message as unknown as WorkerProtocolMessage
}
