import { Cancel, runResume } from './env'
import { Computation, runComputation } from './computation'

export const unsafeRun = <R, N>(c: Computation<never, R, N>, f: (r: R) => void = () => {}): Cancel =>
  runResume(runComputation(c)({} as never), f)
  