import { Computation, startComputation } from './computation'
import { Cancel, Env } from './env'
import { Cont, chainCont, pure } from './cont'

// Run a "pure" computation, that is, one that never yields any impure Envs.
// We're playing some typing games:
// Yielding `never` is a lie, but works both intuitionally and in TS.
// The intuition is that an Env with no requirements is pure, and thus a
// computation that only yields pure Envs is morally equivalent to a computation
// that never yields any Envs.
// In both cases, there are no required capabilities to satisfy.
export const run = <A, N> (g: Computation<never, A, N>): Cont<A, Cancel, Cancel> =>
    step(startComputation(g), undefined)

export const step = <E extends Env<any, N>, A, N> (i: Iterator<E, A, N>, x: N): Cont<A, Cancel, Cancel> => {
    let ir = i.next(x)
    return ir.done ? pure(ir.value)
      : chainCont((ir.value as E)({}) as Cont<N, Cancel, Cancel>, a => step(i, a))
}
