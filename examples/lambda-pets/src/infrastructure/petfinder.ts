import { doFx, Fx } from '../../../../src'
import { GeoLocation, GetPets, Pets } from '../domain/model'
import { getJson, HttpEnv, postJson } from './http'

// Petfinder types and APIs
// Note that getPets is a concrete implementation of
// the GetPets domain interface and instantiates the specific
// set of effects that it requires.

export type PetfinderPets = {
  animals: readonly Animal[]
}

export type Animal = {
  name: string,
  url: string,
  photos: readonly Photo[]
}

export type Photo = {
  medium: string
}

export type PetfinderToken = {
  access_token: string
}

export type PetfinderAuth = {
  grant_type: 'client_credentials',
  client_id: string,
  client_secret: string
}

export type PetfinderConfig = {
  petfinderAuth: PetfinderAuth
}

export const getPets: GetPets<HttpEnv & PetfinderConfig> = (l: GeoLocation, radiusMiles: number): Fx<HttpEnv & PetfinderConfig, Pets> => doFx(function* ({ petfinderAuth }: PetfinderConfig) {
  const token = yield* postJson<PetfinderAuth, PetfinderToken>('https://api.petfinder.com/v2/oauth2/token', petfinderAuth)

  const { animals } = yield* getJson<PetfinderPets>(`https://api.petfinder.com/v2/animals?location=${l.latitude},${l.longitude}&distance=${Math.ceil(radiusMiles)}`, {
    Authorization: `Bearer ${token.access_token}`
  })

  return animals.map(a => ({
    name: a.name,
    url: a.url,
    photoUrl: a.photos[0]?.medium
  }))
})
