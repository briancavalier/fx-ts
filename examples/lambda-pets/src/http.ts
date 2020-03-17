import { resumeLater, Resume, op, co } from "../../../src"
import { request as httpsRequest } from 'https'
import { IncomingMessage, RequestOptions, request } from 'http'
import { parse as parseUrl } from 'url'

type Request = Get | Post
type Get = Req & { method: 'GET' }
type Post = Req & { method: 'POST', body: string }
type Req = { url: string, headers: { [name: string]: string } }

export type Http = { http<A>(r: Request): Resume<A | Error> }
export const http = <A>(r: Request) => op<Http, A | Error>(c => c.http(r))

export const getJson = co(function*<A>(url: string, headers: { [name: string]: string } = {}) {
  return yield* http<A>({ method: 'GET', url, headers })
})

export const postJson = co(function*<A, R>(url: string, a: A, headers: { [name: string]: string } = {}) {
  return yield* http<R>({ method: 'POST', url, headers, body: JSON.stringify(a) })
})

export const httpImpl = {
  http: <A>(r: Request): Resume<A | Error> =>
    resumeLater(k => {
      console.log(r.method, r.url)
      const ro = { method: r.method, ...parseUrl(r.url), headers: r.headers }
      const req = ro.protocol === 'https:' ? httpsRequest(ro) : request(ro)
      req.on('response', m => readResponse<A>(r, m).then(k, k)).on('error', k)

      if(r.method === 'POST') req.write(r.body)
      
      req.end()
      return () => req.abort()
    }),
}

const readResponse = async <A>(r: RequestOptions, m: IncomingMessage): Promise<A> => {
  let data = ''
  for await (const d of m) data += d
  if (m.statusCode !== 200) throw new Error(`Request failed ${m.statusCode}: ${data} ${JSON.stringify(r)}`)
  return JSON.parse(data)
}