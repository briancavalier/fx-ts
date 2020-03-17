import { Resume, op } from '../../../src'
import { Location } from './domain'

export type IpLocationService = { getIpLocation(hostOrIp: string): Resume<Partial<Location> | Error> }
export const getIpLocation = (hostOrIp: string) => op<IpLocationService>(c => c.getIpLocation(hostOrIp))
