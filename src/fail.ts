import { Resume, resume, uncancelable } from './env'
import { Fx, op, pure, unsafeRunFxWith, Use } from './fx'

// ------------------------------------------------------------
// Fail effect
// Fail cannot produce a value, and must be eliminated
// via catchAll or other means before a program can be run
export type Fail = { fail: (e: Error) => Resume<never> }

export const fail = (e: Error) => op<Fail, never>(c => c.fail(e))

export const attempt = <C extends Fail, A>(fx: Fx<C, A>): Fx<Use<C, Fail>, A | Error> =>
  catchAll(fx, pure)

export const catchAll = <C1 extends Fail, C2, A, B>(fx: Fx<C1, A>, f: (e: Error) => Fx<C2, B>): Fx<Use<C1, Fail> & C2, A | B> =>
  op((c): Resume<A | B> => resume(k => {
    const fail = (e: Error) => {
      cancel()
      return resume(() => unsafeRunFxWith(f(e), c, k))
    }

    let cancel = uncancelable
    cancel = unsafeRunFxWith(fx, { ...c as any, fail }, k)
    return cancel
  }))
