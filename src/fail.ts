import { Fx, withEnv, runFxWith } from './fx'
import { Capabilities, Env, Resume, resume } from './env'

export type Remove<F, C, M = 'required capability not in env'> =
  F extends Fx<infer Y, infer R> ? AssertExtends<Capabilities<Y>, C, R, M> : F

type AssertExtends<Sub, Sup, R, M> =
  Sub extends Sup ? Fx<Env<Omit<Sub, keyof Sup>, R>, R>
  : { error: M, required: Sup, env: Sub }

export type Fail<E> = { fail(e: E): Resume<never> }

export const fail = <E>(e: E) => withEnv<Fail<E>>(c => c.fail(e))

export const attempt = <Y extends Env<any, any>, R>(co: Fx<Y, R>) =>
  withEnv((c): Resume<R | void> => resume(k => {
    const handleRaise = {
      fail: () => (cancel(), resume(_ => k()))
    }
    const cancel = runFxWith(co, { ...c as any, ...handleRaise }, k)
    return cancel
  })) as Remove<Fx<Y, R | void>, Fail<any>>
