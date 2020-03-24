import { Cancel, runResume, Pure, uncancelable, Step, Capabilities } from './env'
import { Computation, runComputation } from './computation'

export const unsafeRun = <Y extends Pure<any>, R, N>(c: Computation<Y, R, N>, f: (s: Step<R, R>) => Cancel = () => uncancelable): Cancel =>
  runResume(runComputation(c, {} as Capabilities<Y>), f)
