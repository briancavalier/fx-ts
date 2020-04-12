import { Fx } from '../../../../src'

// Domain model

export type AdoptablePets = {
  readonly location: Location,
  readonly radiusMiles: number,
  readonly pets: Pets
}

export type Pets = readonly Pet[]

export type Pet = {
  readonly name: string,
  readonly url: string,
  readonly photoUrl?: string
}

export type GeoLocation = {
  readonly longitude: number,
  readonly latitude: number
}

export type Location = GeoLocation & {
  readonly city?: string
}

export const defaultLocation: Location = {
  latitude: 40.440624,
  longitude: -79.995888,
  city: 'Pittsburgh'
}

// Domain model access interfaces.
// These are implemented by infrastructure

export type GetPets<Effects> = (l: GeoLocation, radiusMiles: number) => Fx<Effects, Pets>

export type GetLocation<Effects> = (host: string) => Fx<Effects, Location>
