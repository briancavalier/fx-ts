import { Computation, startComputation, Env, Capabilities } from './computation'
import { Cancel, Result, Now, chainResult, runResult } from './result'

// Execute a computastion, producing all its effects
// We're playing some typing games:
// Yielding `never` is a lie, but works both intuitionally and in TS.
// The intuition is that an Env with no requirements is pure, and thus a
// computation that only yields pure Envs is morally equivalent to a computation
// that never yields any Envs.
// In both cases, there are no required capabilities to satisfy.
export const unsafeRunEffects = <R, N> (g: Computation<never, R, N>): Cancel =>
  runResult(runComputation(g, {}), () => () => {})
  
// Run a computation by providing its required capabilities, producing a result
export const runComputation = <Y extends Env<any, N>, R, N> (g: Computation<Y, R, N>, c: Capabilities<Y>): Result<R> =>
  step(startComputation(g), c, undefined)

// Unsafe types, but provides stack safety for synchronous capabilities
const step = <Y extends Env<any, N>, R, N> (i: Iterator<Y, R, N>, c: Capabilities<Y>, x: N): Result<R> => {
  let ir = i.next(x)

  while(!ir.done) {
    const r = ir.value(c)
    if (r instanceof Now) ir = i.next(r.value)
    else return chainResult(r, n => step(i, c, n))
  }

  return new Now(ir.value)
}

