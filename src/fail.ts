import { co, Computation, op, runComputation } from './computation'
import { Capabilities, Env, Resume, resume } from './env'

export type Remove<E extends Computation<any, any, any>, C, M = 'required capability not in env'> =
  E extends Computation<infer Y, infer R, infer N> ? AssertExtends<Capabilities<Y>, C, R, N, M> : never

type AssertExtends<Sub, Sup, R, N, M> =
  Sub extends Sup ? Computation<Env<Omit<Sub, keyof Sup>, R>, R, N>
  : { error: M, required: Sup, env: Sub }

export type Fail<E> = { fail(e: E): Resume<never> }

export const fail = co(function* <E>(e: E) {
  return yield (c: Fail<E>) => c.fail(e)
})

export const attempt = <Y extends Env<any, any>, R, N>(co: Computation<Y, R, N>) =>
  op((c): Resume<R | void> => resume(k => {
    const handleRaise = {
      fail() {
        cancel()
        return resume(_ => k())
      }
    } as Fail<unknown>
    const cancel = runComputation(co, { ...c as any, ...handleRaise }, k)
    return cancel
  })) as Remove<Computation<Y, R | void, N>, Fail<any>>
