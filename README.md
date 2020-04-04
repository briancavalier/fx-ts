<h1 align="center">fx-ts</h1>

<h3 align="center">Capabilities & Effects for TypeScript</h3>

<p align="center">
  <a href="#features">Features</a> • <a href="#install">Install</a> • <a href="#examples">Examples</a> • <a href="#documentation">Documentation</a>
</p>

## Features

* **Do-notation for effects**: Write _imperative-looking_ code that's fully referentially transparent
* **Asychronous effects with cancelation**: Seamlessly mix synchronous and asynchronous effects without worry
* **Effect inference**: Effects can be inferred without explicit type annotations
* **Extensible**: Implement new effects in user land
* **Testable**: Code to interfaces, and easily use different implementations for development, production, and testing
* **Efficient**: Synchronous and Asynchronous effects run in _constant stack_

## Install

```shell
npm install --save fx-ts
```

## Examples

* [echo-console](#examples/echo-console.ts): A simple read-print loop. A good introduction to the basics of capabilities and effects.
* [fp-to-the-max](#examples/fp-to-the-max-1.ts): A more involved example number guessing game example from https://www.youtube.com/watch?v=sxudIMiOo68
* [lambda-pets](#examples/lambda-pets): A realistic AWS Lambda application that shows adoptable pets near the user's IP Address using https://ipstack.com and https://petfinder.com

## Documentation

Pure functions are easy to reason about and test because they aren't entangled with the environment in which they're called. They always give the same answer for the same inputs. Nevertheless, useful programs need to interact with their environment.  They need access to databases, external services, or configuration, and need to perform effects like reading and writing files, updating databases, etc.

The goal of fx-ts is to help in writing programs that interact with their environment _and_ are easy to reason about and test.

```ts
// Abstract Print & Read capabilities

type Print = { print(s: string): Fx<unknown, void> }

type Read = { read: Fx<Async, string> }

const main = doFx(function* () {
  const { print, read } = yield* get<Print & Read>()
  while (true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}${EOL}`)
  }
})

const capabilities = {
  // ...Concrete implementation of Print and Read...
}

runFx(main(), capabilities)
```

## API

_Coming soon_

## Inspiration

* [koka](https://github.com/koka-lang/koka)
* [ZIO](https://zio.dev)
* [forgefx](https://github.com/briancavalier/forgefx)
* [ambient](https://github.com/briancavalier/ambient)
