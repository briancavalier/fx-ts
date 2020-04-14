import { assert, AssertTrue, IsExact } from 'conditional-type-checks'

import { zip } from './array'
import { async, Async } from './async'
import { Fx, None, pure } from './fx'
import { sync, Sync } from './sync'

{
  const fx = zip(pure(1 as const), pure('' as const), pure(true as const))
  assert<IsExact<Fx<None, readonly [1, '', true]>, typeof fx>>(true)
}

{
  const fx = zip(pure(1), pure(''), pure(true))
  assert<IsExact<Fx<None, readonly [number, string, boolean]>, typeof fx>>(true)
}

{
  const a: readonly number[] = [1, 2, 3, 4, 5, 6]
  const fx = zip(...a.map(pure))
  assert<IsExact<Fx<None, typeof a>, typeof fx>>(true)
}

{
  const fx = zip(pure(1), sync(() => ''), async<boolean>(k => k(true)), sync(() => 1))
  assert<IsExact<Fx<Sync & Async, readonly [number, string, boolean, number]>, typeof fx>>(true)
}
