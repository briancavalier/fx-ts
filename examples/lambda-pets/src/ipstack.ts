import { get, doFx } from '../../../src'
import { getJson } from './http'
import { Location } from './model'

export const  getLocation = doFx(function* (host: string) {
  const { ipstackKey } = yield* get<{ ipstackKey: string }>()
  return yield* getJson<Location>(`http://api.ipstack.com/${host}?hostname=1&access_key=${ipstackKey}`)
})
