import { co, get } from '../../../src'
import { getJson } from './http'
import { Location } from './model'

export const  getLocation = co(function* (host: string) {
  const { ipstackKey } = yield* get<{ ipstackKey: string }>()
  const location = yield* getJson<Location>(`http://api.ipstack.com/${host}?hostname=1&access_key=${ipstackKey}`)
  if (location instanceof Error) return location
  if (typeof location.latitude === 'number' && typeof location.longitude === 'number') return location as Location
  return new Error(`Could not get location for ${host}`)
})
