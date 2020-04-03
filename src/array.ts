import { Fx, Effects, Return, op, runFx } from './fx'
import { resume, uncancelable, Intersect } from './env'

export type AllCapabilities<C extends readonly Fx<any, any>[]> = Effects<Intersect<C[number]>>

export type AnyResult<C extends readonly Fx<any, any>[]> = Return<C[number]>

type Writeable<T> = { -readonly [P in keyof T]: T[P] }

export type ZipResults<C extends readonly Fx<any, any>[]> = { [K in keyof C]: Return<C[K]> }

// Turn a list of computations into a computation of a list
export const zip = <Fxs extends readonly Fx<any, any>[]>(...cs: Fxs): Fx<AllCapabilities<Fxs>, ZipResults<Fxs>> =>
  op((c: AllCapabilities<Fxs>) => resume<ZipResults<Fxs>>(k => {
    let remaining = cs.length
    const results = Array(remaining) as Writeable<ZipResults<Fxs>>

    const cancels = cs.map((computation: Fxs[typeof i], i) =>
      runFx(computation, c, (x: AnyResult<Fxs>) => {
        results[i] = x
        return --remaining === 0 ? k(results) : uncancelable
      }))

    return () => cancels.forEach(c => c())
  }))
