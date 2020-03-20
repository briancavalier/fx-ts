import { Computation, Yield, Next, Return, op, runComputation } from './computation'
import { Capabilities, Env, runResume, resume, uncancelable, Step } from './env'

// Arrays and tuples of computations
// Strongly-typed variadic operations support homogeneous arrays as well as
// heterogeneous tuples of any length.

export type AllCapabilities<C extends readonly Computation<any, any, any>[]> = Capabilities<Yield<C[number]>>
export type AllNexts<C extends readonly Computation<any, any, any>[]> = Next<C[number]>

export type AllResult<C extends readonly Computation<any, any, any>[]> = { [K in keyof C]: Return<C[K]> }

export type AnyResult<C extends readonly Computation<any, any, any>[]> = Return<C[number]>

type Writeable<T> = { -readonly [P in keyof T]: T[P] }

// Turn a list of computations into a computation of a list
export const zip = <Computations extends readonly Computation<any, any, any>[]>(...cs: Computations): Computation<Env<AllCapabilities<Computations>, never, AllResult<Computations>>, AllResult<Computations>, AllNexts<Computations>> =>
  op((c: AllCapabilities<Computations>) => resume<never, AllResult<Computations>>(k => {
    let remaining = cs.length
    const results = Array(remaining) as Writeable<AllResult<Computations>>

    const cancels = cs.map((computation: Computations[typeof i], i) =>
      runResume(runComputation(computation)(c) as any, (s: Step<never, AnyResult<Computations>>) => {
        results[i] = s.value
        return --remaining === 0 ? k({ done: false, value: results }) : uncancelable
      }))

    return () => cancels.forEach(c => c())
  }))

// Return computation equivalent to the input computation that produces the earliest result
// TODO: Consider requiring the input computations to be Async
export const race = <Computations extends readonly Computation<any, any, any>[]>(...cs: Computations): Computation<Env<AllCapabilities<Computations>, never, AnyResult<Computations>>, AnyResult<Computations>, any> =>
  op((c: AllCapabilities<Computations>) => resume<never, AnyResult<Computations>>(k => {
    const cancels = cs.map((computation: Computations[number]) =>
      runResume(runComputation(computation)(c) as any, (s: Step<never, AnyResult<Computations>>) => {
        cancelAll()
        return k({ done: false, value: s.value })
      }))

    const cancelAll = () => cancels.forEach(c => c())
    return cancelAll
  }))
