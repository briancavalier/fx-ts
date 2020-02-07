import { Cancel, runResume, uncancelable } from './env'
import { Computation, runComputation, Pure } from './computation'

export const unsafeRun = <Y extends Pure<any>, N>(c: Computation<Y, void | never, N>): Cancel =>
  runResume(runComputation(c)({} as never), _ => uncancelable)
