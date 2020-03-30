import { Computation, Yield, Next, Return, op, runComputation } from './computation'
import { Capabilities, Env, resume, uncancelable } from './env'

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
  op((c: AllCapabilities<Computations>) => resume<AllResult<Computations>>(k => {
    let remaining = cs.length
    const results = Array(remaining) as Writeable<AllResult<Computations>>

    const cancels = cs.map((computation: Computations[typeof i], i) =>
      runComputation(computation, c, (x: AnyResult<Computations>) => {
        results[i] = x
        return --remaining === 0 ? k(results) : uncancelable
      }))

    return () => cancels.forEach(c => c())
  }))

// Return computation equivalent to the input computation that produces the earliest result
// TODO: Consider requiring the input computations to be Async
export const race = <Computations extends readonly Computation<any, any, any>[]>(...cs: Computations): Computation<Env<AllCapabilities<Computations>, AnyResult<Computations>>, AnyResult<Computations>, AnyResult<Computations>> =>
  op((c: AllCapabilities<Computations>) => resume<AnyResult<Computations>>(k => {
    const cancels = cs.map((computation: Computations[number]) =>
      runComputation(computation, c, (x: AnyResult<Computations>) => {
        cancelAll()
        return k(x)
      }))

    const cancelAll = () => cancels.forEach(c => c())
    return cancelAll
  }))
