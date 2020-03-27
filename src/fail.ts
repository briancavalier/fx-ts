import { op, Computation, runComputation, pure } from './computation'
import { Resume, Env, Capabilities, resume, runResume, Use } from './env'

export type Raise<E> = { raise(e: E): Resume<unknown, unknown> }
export const raise = <E>(e: E) => op<Raise<E>>(c => c.raise(e))

export type Fail = Raise<void>
export const fail = op<Fail>(c => c.raise())

export type Errors<Y> =
  Y extends Env<infer C, any, any>
    ? C extends Raise<infer E> ? E : never
    : never

export const attempt = <Y extends Env<any, any, any>, R, N>(co: Computation<Y, R, N>) =>
  recover(pure, co)

export const recover = <Y extends Env<any, any, any>, R, N, Y2 extends Env<any, any, any>, R2, N2>(f: (e: Errors<Y>) => Computation<Y2, R2, N2>, co: Computation<Y, R, N>) =>
  op((c: Capabilities<Y | Y2>): Resume<R | R2, R | R2> => resume(k => {
    const capabilities = {
      ...c as any,
      raise(e: Errors<Y>) {
        cancel()
        return resume(_ => runResume(runComputation(f(e), c), k))
      }
    }
    const cancel = runResume(runComputation(co, capabilities), k)
    return cancel
  })) as Computation<Use<Y, Raise<Errors<Y>>>, R | R2, N | N2>
