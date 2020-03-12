import { Cancel, runResume, Pure } from './env'
import { Computation, runComputation } from './computation'

export const unsafeRun = <Y extends Pure<any>, R, N>(c: Computation<Y, R, N>, f: (r: R) => void = () => {}): Cancel =>
  runResume(runComputation(c)({} as never), f)
  