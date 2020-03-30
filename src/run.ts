import { Cancel, Pure, uncancelable } from './env'
import { Computation, runComputation } from './computation'

export const unsafeRun = <Y extends Pure<any>, R, N>(c: Computation<Y, R, N>, f: (r: R) => Cancel = () => uncancelable): Cancel =>
  runComputation(c, {} as never, f)
