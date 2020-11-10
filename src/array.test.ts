import { IsExact, assert } from 'conditional-type-checks'

import { AllEffects, zip } from './array'
import { Effects, Fx, None, pure } from './fx'

{
  // zip const
  const fx = zip(pure(1 as const), pure('' as const), pure(true as const))
  assert<IsExact<Fx<None, readonly [1, '', true]>, typeof fx>>(true)
}

{
  // zip tuple
  const fx = zip(pure(1), pure(''), pure(true))
  assert<IsExact<Fx<None, readonly [number, string, boolean]>, typeof fx>>(true)
}

{
  // zip spread array
  const a: readonly number[] = [1, 2, 3, 4, 5, 6]
  const fx = zip(...a.map(pure))
  assert<IsExact<Fx<None, typeof a>, typeof fx>>(true)
}

{
  // zip is associative in capabilities
  let fx1!: Fx<{ a: number }, string>
  let fx2!: Fx<{ b: string }, string>
  let fx3!: Fx<{ c: boolean }, string>
  let fx4!: Fx<{ d: Date }, string>
  const zip1 = zip(fx1, fx2, zip(fx3, fx4))
  const zip2 = zip(zip(fx1, fx2), fx3, fx4)
  assert<IsExact<Effects<typeof zip1>, Effects<typeof zip2>>>(true)
  assert<IsExact<{ a: number; b: string; c: boolean; d: Date }, Effects<typeof zip1>>>(true)
}

{
  // zip is commutative in capabilities
  let fx1!: Fx<{ a: number }, string>
  let fx2!: Fx<{ b: string }, string>
  const zip1 = zip(fx1, fx2)
  const zip2 = zip(fx2, fx1)
  assert<IsExact<Effects<typeof zip1>, Effects<typeof zip2>>>(true)
  assert<IsExact<{ a: number; b: string }, Effects<typeof zip1>>>(true)
}

{
  // AllEffects aggregates capabilities with None
  // None doesn't annihilate capabilities
  type A = { a: number }
  type B = { b: string }
  assert<IsExact<AllEffects<[Fx<None, unknown>, Fx<A, unknown>, Fx<B, unknown>]>, None & A & B>>(true)
}
