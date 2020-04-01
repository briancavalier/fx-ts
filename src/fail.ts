import { Fx, op, runFxWith, Use, pure } from './fx'
import { Resume, resume, uncancelable } from './env'

export type Fail = { fail: (e: Error) => Resume<never> }

export const fail = (e: Error) => op<Fail>(c => c.fail(e))

export const attempt = <T extends PropertyKey, C extends Fail, A>(fx: Fx<C, A>) =>
  catchFail(fx, (e: Error) => pure(e))

export const catchFail = <T extends PropertyKey, C1 extends Fail, C2, A, B>(fx: Fx<C1, A>, f: (e: Error) => Fx<C2, B>) =>
  op((c): Resume<A | B> => resume(k => {
    const handle = {
      fail: (e: Error) => {
        cancel()
        return resume(() => runFxWith(f(e), c, k))
      }
    }
    let cancel = uncancelable
    cancel = runFxWith(fx, { ...c as any, ...handle }, k)
    return cancel
  })) as Fx<Use<C1, Fail> & C2, A | B>
