import { Resume } from './env'
import { op, Fx, doFx } from './fx'
import { race } from './array'
import { fail } from './fail'

export type Delay = { delay(ms: number): Resume<void> }

export const delay = (ms: number) => op<Delay>(c => c.delay(ms))

export const timeout = doFx(function* <C, A>(ms: number, c: Fx<C, A>) {
  return yield* race(c, delayFail(ms))
})

const delayFail = doFx(function* (ms: number) {
  yield* delay(ms)
  return yield* fail(undefined)
})
