import { op, Computation, use } from './computation'
import { Resume, Env, Capabilities, resume } from './env'
import { unsafeRun } from './run'

export type Remove<E extends Computation<any, any, any>, C, M extends string> =
  E extends Computation<infer Y, infer R, infer N> ? AssertExtends<Capabilities<Y>, C, R, N, M> : never

type AssertExtends<Sub, Sup, R, N, M> = Sub extends Sup
  ? Computation<Env<Omit<Sub, keyof Sup>, R, N>, R, N>
  : { capabilities: Sub, required: Sup, error: M }

export type Raise<T extends string | symbol, E> = Record<T, (e: E) => Resume<never, never>>
export const raise = <T extends string | symbol, E>(t: T, e: E) => op<Raise<T, E>, void>(c => c[t](e))

const failSymbol = Symbol('Fail')

export interface Fail extends Raise<typeof failSymbol, void> { }
export const fail = op<Fail, void>(c => c[failSymbol]())

type AttemptError = 'attempt() may only be applied to Computations with the Fail effect'
export const attempt = <Y extends Env<any, any, any>, R, N>(co: Computation<Y, R, N>): Remove<Computation<Y, R | undefined, N>, Fail, AttemptError> =>
  op(c => resume(k => {
    const cancel = unsafeRun(use(co, {
      ...c as any,
      [failSymbol]() {
        cancel()
        return resume(_ => k({ done: false, value: undefined }))
      }
    }), k)
    return cancel
  })) as Remove<Computation<Y, R | undefined, N>, Fail, AttemptError>
