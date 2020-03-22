import { co, get } from '../../../src'
import { GeoLocation, Pets } from './model'
import { postJson, getJson } from './http'

export type PetfinderToken = {
  access_token: string
}

export type PetfinderAuth = {
  grant_type: 'client_credentials',
  client_id: string,
  client_secret: string
}

export const getPets = co(function* (l: GeoLocation, radiusMiles: number) {
  const { petfinderAuth } = yield* get<{ petfinderAuth: PetfinderAuth }>()
  const token = yield* postJson<PetfinderAuth, PetfinderToken>('https://api.petfinder.com/v2/oauth2/token', petfinderAuth)

  if (token instanceof Error) return token

  return yield* getJson<Pets>(`https://api.petfinder.com/v2/animals?location=${l.latitude},${l.longitude}&distance=${Math.ceil(radiusMiles)}`, {
    Authorization: `Bearer ${token.access_token}`
  })
})
