import { doFx, fail } from '../../../../src'
import { GetLocation, Location } from '../domain/model'
import { getJson, HttpEnv } from './http'

// ipstack types and API
// Note that getLocation is a concrete implementation of
// the GetLocation domain interface and instantiates the specific
// set of effects that it requires.

export type IpStackConfig = {
  ipstackKey: string
}

export const getLocation: GetLocation<HttpEnv & IpStackConfig> = (host: string) => doFx(function* ({ ipstackKey }: IpStackConfig) {
  const location = yield* getJson<Partial<Location>>(`http://api.ipstack.com/${host}?hostname=1&access_key=${ipstackKey}`)
  if (location.latitude == null || location.longitude == null) return yield* fail(new Error('Invalid location'))
  return location as Location
})
