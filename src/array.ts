import { Fx, Yield, Return, withEnv, runFxWith } from './fx'
import { Capabilities, Env, resume, uncancelable } from './env'

// Arrays and tuples of computations
// Strongly-typed variadic operations support homogeneous arrays as well as
// heterogeneous tuples of any length.

export type AllCapabilities<C extends readonly Fx<any, any>[]> = Capabilities<Yield<C[number]>>

export type AllResult<C extends readonly Fx<any, any>[]> = { [K in keyof C]: Return<C[K]> }

export type AnyResult<C extends readonly Fx<any, any>[]> = Return<C[number]>

type Writeable<T> = { -readonly [P in keyof T]: T[P] }

// Turn a list of computations into a computation of a list
export const zip = <Fxs extends readonly Fx<any, any>[]>(...cs: Fxs): Fx<Env<AllCapabilities<Fxs>, AllResult<Fxs>>, AllResult<Fxs>> =>
  withEnv((c: AllCapabilities<Fxs>) => resume<AllResult<Fxs>>(k => {
    let remaining = cs.length
    const results = Array(remaining) as Writeable<AllResult<Fxs>>

    const cancels = cs.map((computation: Fxs[typeof i], i) =>
      runFxWith(computation, c, (x: AnyResult<Fxs>) => {
        results[i] = x
        return --remaining === 0 ? k(results) : uncancelable
      }))

    return () => cancels.forEach(c => c())
  }))

// Return computation equivalent to the input computation that produces the earliest result
// TODO: Consider requiring the input computations to be Async
export const race = <Fxs extends readonly Fx<any, any>[]>(...cs: Fxs): Fx<Env<AllCapabilities<Fxs>, AnyResult<Fxs>>, AnyResult<Fxs>> =>
  withEnv((c: AllCapabilities<Fxs>) => resume<AnyResult<Fxs>>(k => {
    const cancels = cs.map((computation: Fxs[number]) =>
      runFxWith(computation, c, (x: AnyResult<Fxs>) => {
          cancelAll()
          return k(x)
        }))

    const cancelAll = () => cancels.forEach(c => c())
    return cancelAll
  }))
