import { Computation, Yield, Next, Return, op, runComputation } from './computation'
import { Capabilities, resumeLater, Env, runResume } from './env'

// Arrays and tuples of computations
// Strongly-typed variadic operations support homogeneous arrays as well as
// heterogeneous tuples of any length.

export type AllCapabilities<C extends readonly Computation<any, any, any>[]> = Capabilities<Yield<C[number]>>
export type AllNexts<C extends readonly Computation<any, any, any>[]> = Next<C[number]>

export type AllResult<C extends readonly Computation<any, any, any>[]> = { [K in keyof C]: Return<C[K]> }

export type AnyResult<C extends readonly Computation<any, any, any>[]> = Return<C[number]>

type Writeable<T> = { -readonly [P in keyof T]: T[P] }

// Turn a list of computations into a computation of a list
export const zip = <Computations extends readonly Computation<any, any, any>[]>(...cs: Computations): Computation<Env<AllCapabilities<Computations>, AllResult<Computations>>, AllResult<Computations>, AllNexts<Computations>> =>
  op((c: AllCapabilities<Computations>) => resumeLater<AllResult<Computations>>(k => {
    let remaining = cs.length
    const results = Array(remaining) as Writeable<AllResult<Computations>>

    const cancels = cs.map((computation: Computations[typeof i], i) =>
      runResume(runComputation(computation)(c), (x: AnyResult<Computations>) => {
        results[i] = x
        if (--remaining === 0) k(results)
      }))

    return () => cancels.forEach(c => c())
  }))

// Return computation equivalent to the input computation that produces the earliest result
// TODO: Consider requiring the input computations to be Async
export const race = <Computations extends readonly Computation<any, any, any>[]>(...cs: Computations): Computation<Env<AllCapabilities<Computations>, AnyResult<Computations>>, AnyResult<Computations>, any> =>
  op((c: AllCapabilities<Computations>) => resumeLater<AnyResult<Computations>>(k => {
    const cancels = cs.map((computation: Computations[number]) =>
      runResume(runComputation(computation)(c), (x: AnyResult<Computations>) => {
        cancelAll()
        k(x)
      }))

    const cancelAll = () => cancels.forEach(c => c())
    return cancelAll
  }))
