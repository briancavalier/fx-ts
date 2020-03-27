import { Resume, Env } from './env'
import { op, Computation, co } from './computation'
import { race } from './array'
import { fail, Fail } from './fail'

export type Delay = { delay(ms: number): Resume<never, void> }
export const delay = (ms: number) => op<Delay>(c => c.delay(ms))

export const timeout = co(function* <Y, R, N>(ms: number, c: Computation<Y, R, N>) {
  return yield* race(c, delayFail(ms))
})

const delayFail = co(function* (ms: number): Generator<Env<Delay, never, void> | Env<Fail, unknown, unknown>, never, void> {
  yield* delay(ms)
  return (yield* fail) as never
})
