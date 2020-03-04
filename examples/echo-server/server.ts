import { Queue, queueTake, queuePut, queue } from './queue'
import { Computation, co, resumeNow, Env, resumeLater, Resume, use, unsafeRun, get, uncancelable, fromEnv, op, Pure } from '../../src'
import { IncomingMessage, ServerResponse, createServer, OutgoingHttpHeaders } from 'http'
import { Readable } from 'stream'
import { ListenOptions } from 'net'

type Fork = { fork <Y extends Pure<any>, N>(comp: Computation<Y, void, N>): Resume<void> }
const fork = <Y extends Env<any, any>, N>(comp: Computation<Y, void, N>): Computation<Y | Env<Fork, void>, void, N> =>
  fromEnv(c => c.fork(use(comp, c)))

type Listen = { listen(l: ListenOptions): Resume<Queue<NodeConnection>> }
const listen = (o: ListenOptions) => op<Listen>(c => c.listen(o))

type Accept = { accept(q: Queue<NodeConnection>): Resume<NodeConnection> }
const accept = (s: Queue<NodeConnection>) => op<Accept>(c => c.accept(s))

type Respond = { respond(con: NodeConnection, response: NodeResponse): Resume<void> }
const respond = (con: NodeConnection, response: NodeResponse) => op<Respond>(c => c.respond(con, response))

type Log = { log(s: string): Resume<void> }
const log = (s: string) => op<Log>(c => c.log(s))

type Now = { now(): Resume<number> }
const now = op<Now>(c => c.now())

type NodeConnection = { request: IncomingMessage, response: ServerResponse }
type NodeResponse = { status: number, headers?: OutgoingHttpHeaders, body: Readable }

const handler = co(function* (c: NodeConnection) {
  const start = yield* now
  const { requestId } = yield* get<{ requestId: number }>()

  yield* respond(c, { status: 200, body: c.request })

  yield* log(`${requestId} ${start} ${c.request.method} ${c.request.url}`)
})

const main = co(function* () {
  const { config } = yield* get<{ config: ListenOptions }>()
  const q = yield* listen(config)

  yield* log(`listening on ${config.port}`)

  let requestId = 1
  while(true) { 
    const connection = yield* accept(q)
    const h = use(handler(connection), { requestId })
    yield* fork(h)
    ++requestId
  }
})

const capabilities = {
  config: {
    port: Number(process.env['PORT']) || 8080
  },

  now: () => resumeNow(Date.now()),
  
  log: (s: string) => resumeNow(void process.stdout.write(`${s}\n`)),
  
  fork: <N>(comp: Computation<never, void, N>): Resume<void> =>
    resumeLater(k => {
      k()
      return unsafeRun(comp)
    }),

  listen: (options: ListenOptions): Resume<Queue<NodeConnection>> =>
    resumeLater(k => {
      const q = queue<NodeConnection>()
      const s = createServer()      
      s.addListener('request', (request, response) => queuePut({ request, response }, q))
      s.listen(options)
      k(q)
      return () => s.close()
    }),

  accept: (queue: Queue<NodeConnection>): Resume<NodeConnection> =>
    resumeLater(k => queueTake(k, queue)),

  respond: ({ response }: NodeConnection, { status, body }: NodeResponse): Resume<void> =>
    resumeLater(k => {
      body.pipe(response).writeHead(status).on('finish', k)
      return uncancelable
    }),
}

unsafeRun(use(main(), capabilities))