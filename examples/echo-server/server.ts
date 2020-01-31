import { Queue, queueTake, queuePut, queue } from './queue'
import { effect, Computation, co, resumeNow, Env, resumeLater, Resume, use, unsafeRunEffects, get, Cancel, Capabilities, uncancelable, fromEnv, Effect } from '../../src'
import { IncomingMessage, ServerResponse, createServer, OutgoingHttpHeaders } from 'http'
import { Readable } from 'stream'
import { ListenOptions } from 'net'

const cancelAll = (...cancels: readonly Cancel[]): Cancel => 
  () => {
    for(const cancel of cancels) cancel()
  }

interface Fork {
  fork <N>(comp: Computation<never, void, N>): Resume<void>
}

const fork = <Y extends Env<any, any>, N>(comp: Computation<Y, void, N>) =>
  fromEnv<Fork & Capabilities<Y>, void>(c => c.fork(use(comp, c) as Computation<never, void, N>))

const listen = (o: ListenOptions) =>
  effect<'listen', Queue<NodeConnection>, [ListenOptions]>(c => c.listen(o))

const accept = (s: Queue<NodeConnection>) =>
  effect<'accept', NodeConnection, [Queue<NodeConnection>]>(c => c.accept(s))

const respond = (con: NodeConnection, response: NodeResponse) =>
  effect<'respond', void, [NodeConnection, NodeResponse]>(c => c.respond(con, response))

type Log = Effect<'log', void, [string]>
const log = (s: string): Log => effect(c => c.log(s))

const now = effect<'now', Date>(c => c.now())

type NodeConnection = { request: IncomingMessage, response: ServerResponse }
type NodeResponse = { status: number, headers?: OutgoingHttpHeaders, body: Readable }

const handler = co(function* (c: NodeConnection) {
  const start = yield* now
  yield* respond(c, { status: 200, body: c.request })

  yield* log(`${start} ${c.request.method} ${c.request.url}`)
})

const main = co(function* () {
  const { config } = yield* get<{ config: ListenOptions }>()
  const q = yield* listen(config)

  yield* log(`listening on ${config.port}`)

  while(true) { 
    const connection = yield* accept(q)
    const h = handler(connection)
    yield* fork(h)
  }
})

const capabilities = {
  config: {
    port: Number(process.env['PORT']) || 8080
  },

  now: () => resumeNow(new Date()),
  
  log: (s: string) => resumeNow(void process.stdout.write(`${s}\n`)),
  
  fork: <N>(comp: Computation<never, void, N>): Resume<void> =>
    resumeLater(k => cancelAll(unsafeRunEffects(comp), k())),

  listen: (options: ListenOptions): Resume<Queue<NodeConnection>> =>
    resumeLater(k => {
      const q = queue<NodeConnection>()
      const s = createServer()      
      s.addListener('request', (request, response) => queuePut({ request, response }, q))
      s.listen(options)
      const cancel = k(q)
      return cancelAll(cancel, (() => s.close()) as Cancel)
    }),

  accept: (queue: Queue<NodeConnection>): Resume<NodeConnection> =>
    resumeLater(k => queueTake(k, queue)),

  respond: ({ response }: NodeConnection, { status, body }: NodeResponse): Resume<void> =>
    resumeLater(k => {
      body.pipe(response).writeHead(status)
      response.on('finish', k)
      return uncancelable
    }),
}

unsafeRunEffects(use(main(), capabilities))