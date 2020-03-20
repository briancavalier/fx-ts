import { Cancel, runResume, Pure, uncancelable, Step } from './env'
import { Computation, runComputation } from './computation'

export const unsafeRun = <Y extends Pure<R, any>, R, N>(c: Computation<Y, R, N>, f: (s: Step<R, never>) => Cancel = () => uncancelable): Cancel =>
  runResume(runComputation(c)({} as never), f)
