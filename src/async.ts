import { Resume, Cancel, resume } from './env'
import { op, Fx, doFx, get, runFx } from './fx'
import { fail, Fail } from './fail'
import { AllEffects, AnyResult } from './array'

export type AsyncTask<A> = (k: (a: A) => Cancel) => Cancel

export type Async = { async<A>(run: AsyncTask<A>): Resume<A> }

export const async = <A>(run: AsyncTask<A>): Fx<Async, A> => op(c => c.async(run))

export type Delay = { delay(ms: number): Fx<Async, void> }

export const delay = (ms: number): Fx<Delay & Async, void> => doFx(function* () {
  const { delay } = yield* get<Delay>()
  return yield* delay(ms)
})

export const timeout = <C, A>(ms: number, c: Fx<C, A>): Fx<Async & Delay & Fail, A> =>
  race(c, delayFail(ms))

const delayFail = (ms: number): Fx<Delay & Async & Fail, never> => doFx(function* () {
  yield* delay(ms)
  return yield* fail(new Error(`Timeout: ${ms}ms`))
})

// Return computation equivalent to the input computation that produces the earliest result
// TODO: Consider requiring the input computations to be Async
export const race = <Fxs extends readonly Fx<any, any>[]>(...cs: Fxs): Fx<AllEffects<Fxs>, AnyResult<Fxs>> =>
  op(c => resume<AnyResult<Fxs>>(k => {
    const cancels = cs.map((computation: Fxs[number]) =>
      runFx(computation, c, (x: AnyResult<Fxs>) => {
        cancelAll()
        return k(x)
      }))

    const cancelAll = () => cancels.forEach(c => c())
    return cancelAll
  }))
