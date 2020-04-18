import { Intersect, resume, uncancelable } from './env'
import { Effects, Fx, op, Return, runFxWith } from './fx'

export type AllEffects<Fxs extends readonly Fx<any, any>[]> = Intersect<Effects<Fxs[number]>>

export type AnyResult<Fxs extends readonly Fx<any, any>[]> = Return<Fxs[number]>

export type ZipResults<Fxs extends readonly Fx<any, any>[]> = { readonly [K in keyof Fxs]: Return<Fxs[K]> }

type Writeable<T> = { -readonly [P in keyof T]: T[P] }

// Turn a tuple or array of computations into a computation of a tuple or array
export const zip = <Fxs extends readonly Fx<any, any>[]>(...fxs: Fxs): Fx<AllEffects<Fxs>, ZipResults<Fxs>> =>
  op((c: AllEffects<Fxs>) => resume<ZipResults<Fxs>>(k => {
    let remaining = fxs.length
    const results = Array(remaining) as Writeable<ZipResults<Fxs>>

    const cancels = fxs.map((fx: Fxs[typeof i], i) =>
      runFxWith(fx, c, (x: AnyResult<Fxs>) => {
        results[i] = x
        return --remaining === 0 ? k(results) : uncancelable
      }))

    return () => cancels.forEach(c => c())
  }))
