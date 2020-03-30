import { Resume } from './env'
import { op, Computation, co } from './computation'
import { race } from './array'
import { fail } from './fail'

export type Delay = { delay(ms: number): Resume<void> }
export const delay = (ms: number) => op<Delay>(c => c.delay(ms))

export const timeout = co(function* <Y, R, N>(ms: number, c: Computation<Y, R, N>) {
  return yield* race(c, delayFail(ms))
})

const delayFail = co(function* (ms: number) {
  yield* delay(ms)
  return yield* fail(undefined)
})
