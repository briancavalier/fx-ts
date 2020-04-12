import { Resume } from './'
import { Fail } from './fail'
import { Fx, op } from './fx'

// ------------------------------------------------------------
// Sync effect
// Defers synchronous effects, resolving () => A to A
// Distinguishes lazy synchronous effectful Fx from
// pure Fx with no effects.  For example:
// sync(() => console.log(123)) vs. pure(123)
export type Sync = { sync<A>(run: () => A): Resume<A> }

export const sync = <A>(run: () => A): Fx<Sync, A> => op(c => c.sync(run))

export const trySync = <A>(run: () => A): Fx<Sync & Fail, A> => op(c => {
  try {
    return c.sync(run)
  } catch (e) {
    return c.fail(e)
  }
})
