import { Queue, queueTake, queuePut, queue } from './queue'
import { op, Computation, co, resumeNow, Env, resumeLater, Resume, use, unsafeRunEffects, get, Cancel, Capabilities, uncancelable } from '../../src'
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
  op<Fork & Capabilities<Y>, void>(c => c.fork(use(comp, c) as Computation<never, void, N>))

type HttpServer = {
  listen (o: ListenOptions): Resume<Queue<NodeConnection>>
  accept (q: Queue<NodeConnection>): Resume<NodeConnection>
  respond (c: NodeConnection, r: NodeResponse): Resume<void>
}

const listen = (o: ListenOptions) =>
  op<HttpServer, Queue<NodeConnection>>(c => c.listen(o))

const accept = (s: Queue<NodeConnection>) =>
  op<HttpServer, NodeConnection>(c => c.accept(s))

const respond = (con: NodeConnection, response: NodeResponse) =>
  op<HttpServer, void>(c => c.respond(con, response))

interface Log {
  log (s: string): void
}

const log = (s: string) =>
  op<Log, void>(c => resumeNow(c.log(s)))

interface Time {
  now (): Date
}

const now = op<Time, Date>(c => resumeNow(c.now()))

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

  const logging = yield* get<Log>()
  let id = 0

  while(true) { 
    const connection = yield* accept(q)
    const requestId = id++
    const h = use(handler(connection), {
      log: (s: string) => logging.log(`[${requestId}] ${s}`)
    })
    yield* fork(h)
  }
})

const capabilities = {
  config: {
    port: Number(process.env['PORT']) || 8080
  },

  now: () => new Date(),
  
  log: (s: string) => void process.stdout.write(`${s}\n`),
  
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