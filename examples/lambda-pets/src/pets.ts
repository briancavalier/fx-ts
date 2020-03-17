import { Resume, op } from '../../../src'
import { GeoLocation, Pets } from './domain'

export type AuthPets<Token> = { authPets(): Resume<Token | Error> }
export const authPets = <Token>() =>
  op<AuthPets<Token>>(c => c.authPets())

export type GetPets<Token> = { getPets(t: Token, l: GeoLocation, radiusMiles: number): Resume<Pets | Error> }
export const getPets = <Token>(t: Token, l: GeoLocation, radiusMiles: number) =>
  op<GetPets<Token>>(c => c.getPets(t, l, radiusMiles))
