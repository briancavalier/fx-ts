import { doFx, fail, get } from '../../../../src'
import { Location } from '../domain/model'
import { getJson } from './http'

export type IpStackConfig = { ipstackKey: string }

export const getLocation = (host: string) => doFx(function* () {
  const { ipstackKey } = yield* get<IpStackConfig>()
  const location = yield* getJson<Partial<Location>>(`http://api.ipstack.com/${host}?hostname=1&access_key=${ipstackKey}`)
  if (location.latitude == null || location.longitude == null) return yield* fail(new Error('Invalid location'))
  return location as Location
})
