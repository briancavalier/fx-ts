
import { AllEffects, AnyResult } from './array'
import { Cancel, Resume, resume } from './env'
import { fail, Fail } from './fail'
import { doFx, Fx, get, op, unsafeRunFxWith } from './fx'

export type AsyncTask<A> = (k: (a: A) => Cancel) => Cancel

export type TryAsyncTask<A> = (k: (r: TryAsyncResult<A>) => Cancel) => Cancel
export type TryAsyncResult<A> =
  | { ok: true, value: A }
  | { ok: false, error: Error }

// ------------------------------------------------------------
// Async effect
// Resolves AsyncTask<A> to A
export type Async = { async<A>(run: AsyncTask<A>): Resume<A> }

export const async = <A>(run: AsyncTask<A>): Fx<Async, A> => op(c => c.async(run))

export const tryAsync = <A>(tryRun: TryAsyncTask<A>): Fx<Async & Fail, A> => doFx(function* () {
  const r = yield* async(tryRun)
  return r.ok ? r.value : yield* fail(r.error)
})

export type Delay = { delay(ms: number): Fx<Async, void> }

export const delay = (ms: number): Fx<Delay & Async, void> => doFx(function* () {
  const { delay } = yield* get<Delay>()
  return yield* delay(ms)
})

export const timeout = <C, A>(ms: number, fx: Fx<C, A>): Fx<C & Async & Delay & Fail, A> =>
  race(fx, delayFail(ms))

const delayFail = (ms: number): Fx<Delay & Async & Fail, never> => doFx(function* () {
  yield* delay(ms)
  return yield* fail(new Error(`Timeout: ${ms}ms`))
})

// Return computation equivalent to the input computation that produces the earliest result
export const race = <C1, C2, A, B, Fxs extends readonly Fx<any, any>[]>(fx1: Fx<C1, A>, fx2: Fx<C2, B>, ...fxs: Fxs): Fx<C1 & C2 & AllEffects<Fxs>, A | B | AnyResult<Fxs>> =>
  raceArray([fx1, fx2, ...fxs])

const raceArray = <Fxs extends readonly Fx<any, any>[]>(fxs: Fxs): Fx<AllEffects<Fxs>, AnyResult<Fxs>> =>
  op(c => resume(k => {
    const cancels = fxs.map((fx: Fxs[number]) =>
      unsafeRunFxWith(fx, c, (x: AnyResult<Fxs>) => {
        cancelAll()
        return k(x)
      }))

    const cancelAll = () => cancels.forEach(c => c())
    return cancelAll
  }))
