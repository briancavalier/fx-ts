import { Cancel, runResume, uncancelable } from './env'
import { Computation, runComputation } from './computation'

export const unsafeRunEffects = <N> (c: Computation<never, unknown, N>): Cancel =>
  runResume(runComputation(c)({} as never), _ => uncancelable)
