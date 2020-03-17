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