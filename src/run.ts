import { Computation, startComputation, Env } from './computation'
import { Cancel, Result, Now, chainResult, runResult } from './result'

const uncancelable = (): Cancel => () => {}
const emptyCapabilities = {}

// Execute a computation, producing all its effects
export const unsafeRunEffects = <R, N> (g: Computation<never, R, N>): Cancel =>
  runResult(runComputation(g), uncancelable)

// Run a "pure" computation, that is, one that never yields any impure Envs.
// In reality, this returns a Cont that will proceed with any async effects.
// We're playing some typing games:
// Yielding `never` is a lie, but works both intuitionally and in TS.
// The intuition is that an Env with no requirements is pure, and thus a
// computation that only yields pure Envs is morally equivalent to a computation
// that never yields any Envs.
// In both cases, there are no required capabilities to satisfy.
export const runComputation = <R, N> (g: Computation<never, R, N>): Result<R> =>
  step(startComputation(g), undefined)

// Unsafe
const step = <E extends Env<object, N>, R, N> (i: Iterator<E, R, N>, x: N): Result<R> => {
  let ir = i.next(x)

  while(!ir.done) {
    const r = (ir.value as E)(emptyCapabilities)
    if (r instanceof Now) ir = i.next(r.value)
    else return chainResult(r, n => step(i, n))
  }

  return new Now(ir.value)
}

