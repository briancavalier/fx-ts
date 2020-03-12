import { Resume } from './env'
import { op, Computation, co } from './computation'
import { race } from './array'

export type Delay = { delay(ms: number): Resume<void> }
export const delay = (ms: number) => op<Delay>(c => c.delay(ms))

export const timeout = co(function* <Y, R, N>(ms: number, c: Computation<Y, R, N>) {
  return yield* race(c, delay(ms))
})