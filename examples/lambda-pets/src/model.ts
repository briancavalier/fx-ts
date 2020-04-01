// Domain model
export type GeoLocation = {
  longitude: number,
  latitude: number
}

export type Location = GeoLocation & {
  city?: string
}

export type Pets = {
  animals: readonly Pet[]
}

export type Pet = {
  name: string,
  url: string,
  photos: readonly Photo[]
}

export type Photo = {
  medium: string
}

export const defaultLocation: Location = {
  latitude: 40.440624,
  longitude: -79.995888,
  city: 'Pittsburgh'
}
