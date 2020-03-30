import { Resume } from './env'
import { withEnv, Fx, doFx } from './fx'
import { race } from './array'
import { fail } from './fail'

export type Delay = { delay(ms: number): Resume<void> }

export const delay = (ms: number) => withEnv<Delay>(c => c.delay(ms))

export const timeout = doFx(function* <Y, R>(ms: number, c: Fx<Y, R>) {
  return yield* race(c, delayFail(ms))
})

const delayFail = doFx(function* (ms: number) {
  yield* delay(ms)
  return yield* fail(undefined)
})
