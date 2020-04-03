import { doFx, get } from '../../../src'
import { getJson, postJson } from './http'
import { GeoLocation, Pets } from './model'

export type PetfinderToken = {
  access_token: string
}

export type PetfinderAuth = {
  grant_type: 'client_credentials',
  client_id: string,
  client_secret: string
}

export type PetfinderConfig = { petfinderAuth: PetfinderAuth }

export const getPets = (l: GeoLocation, radiusMiles: number) => doFx(function* () {
  const { petfinderAuth } = yield* get<PetfinderConfig>()
  const token = yield* postJson<PetfinderAuth, PetfinderToken>('https://api.petfinder.com/v2/oauth2/token', petfinderAuth)

  return yield* getJson<Pets>(`https://api.petfinder.com/v2/animals?location=${l.latitude},${l.longitude}&distance=${Math.ceil(radiusMiles)}`, {
    Authorization: `Bearer ${token.access_token}`
  })
})
