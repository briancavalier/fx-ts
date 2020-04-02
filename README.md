# fx-ts

Functional effects for TypeScript

[Features](#features) • [Install](#install) • [Introduction](#introduction) • [API](#api) • [Examples](examples)

## Features

* Do-notation for effects: Write _imperative-looking_ code that's fully referentially transparent
* Seamless asychrony and rigorous cancelation that Just Works
* Effect inference: Effects can be inferred without explicit type annotations
* Testable: Code to effect interfaces, pick concrete implementations for development, production, and testing
* Extensible: Implement new effects in user land
* Efficient: Snchronous and Asynchronous effects run in _constant stack_

## Install

```shell
npm install --save fx-ts
```

## Introduction

Pure functions are easy to reason about and test because they aren't entangled with the environment in which they're called. They always give the same answer for the same inputs. Nevertheless, useful programs need to interact with their environment.  They need access to databases, external services, or configuration, and need to perform effects like reading and writing files, updating databases, etc.

The goal of fx-ts is to help in writing programs that interact with their environment _and_ are easy to reason about and test.

## Examples

```ts
// Abstract Print & Read effects, and simple operations
// to construct them
type Print = { print(s: string): Resume<void> }
const print = (s: string): Fx<Print, void> => op(c => c.print(s))

type Read = { read(): Resume<string> }
const read: Fx<Read, string> = op(c => c.read())

const main = doFx(function* () {
  while(true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}\n`)
  }
})

const capabilities = {
  // ...Concrete implementation of Print and Read effects...
}

runFxWith(main(), capabilities)
```

Check out the [complete echo-console example and others](examples) to see how to implement capabilities.

## API


# Inspiration

* [ZIO](https://zio.dev)
* [forgefx](https://github.com/briancavalier/forgefx)
* [ambient](https://github.com/briancavalier/ambient)
