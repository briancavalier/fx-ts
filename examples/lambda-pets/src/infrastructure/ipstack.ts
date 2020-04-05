import { doFx, get } from '../../../../src'
import { Location } from '../domain/model'
import { getJson } from './http'

export type IpStackConfig = { ipstackKey: string }

export const getLocation = (host: string) => doFx(function* () {
  const { ipstackKey } = yield* get<IpStackConfig>()
  return yield* getJson<Location>(`http://api.ipstack.com/${host}?hostname=1&access_key=${ipstackKey}`)
})
