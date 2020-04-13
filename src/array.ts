import { Intersect, resume, uncancelable } from './env'
import { Effects, Fx, op, Return, runFx } from './fx'

export type AllEffects<Fxs extends readonly Fx<any, any>[]> = Intersect<Effects<Fxs[number]>>

export type AnyResult<Fxs extends readonly Fx<any, any>[]> = Return<Fxs[number]>

type Writeable<T> = { -readonly [P in keyof T]: T[P] }

export type ZipResults<Fxs extends readonly Fx<any, any>[]> = { [K in keyof Fxs]: Return<Fxs[K]> }

// Turn a tuple or array of computations into a computation of a tuple or array
export const zip = <Fxs extends readonly Fx<any, any>[]>(...fxs: Fxs): Fx<AllEffects<Fxs>, ZipResults<Fxs>> =>
  op((c: AllEffects<Fxs>) => resume<ZipResults<Fxs>>(k => {
    let remaining = fxs.length
    const results = Array(remaining) as Writeable<ZipResults<Fxs>>

    const cancels = fxs.map((computation: Fxs[typeof i], i) =>
      runFx(computation, c, (x: AnyResult<Fxs>) => {
        results[i] = x
        return --remaining === 0 ? k(results) : uncancelable
      }))

    return () => cancels.forEach(c => c())
  }))
