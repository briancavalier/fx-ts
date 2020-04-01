import { get, doFx } from '../../../src'
import { getJson } from './http'
import { Location } from './model'

export type IpStackConfig = { ipstackKey: string }

export const getLocation = doFx(function* (host: string) {
  const { ipstackKey } = yield* get<IpStackConfig>()
  return yield* getJson<Location>(`http://api.ipstack.com/${host}?hostname=1&access_key=${ipstackKey}`)
})
