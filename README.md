# fx-ts: Computational environments

> `fx-ts`: A library for writing effectful, functional programs in TypeScript.

* [Requirements](#requirements)
* [Install](#install)
* [Introduction](#introduction)
* [Examples](examples)

## Requirements

* TypeScript >= 3.7
* [Generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)

## Install

```shell
npm install fx-ts --save
```

## Introduction

Pure functions are easy to reason about and test because they aren't entangled with the environment in which they're called. They always give the same answer for the same inputs. Nevertheless, useful programs need to interact with their environment, e.g., databases, external services, or configuration.

The goal of fx-ts is to help in writing programs that interact with their environment _and_ that are easy to reason about and test.

### Environments and Generators in fx-ts

In `fx-ts`, generators yield `Env`s (environments) that express what they need from the environment in their signature.  The `Env` type is basically a Reader type—which are suitable for passing (implicit) configuration information through a computation (but are also used to do that which in object-oriented programming is called _dependency injection_)—that also handles asynchronous operations.

The core of `fx-ts` is `chainEnv`, which aggregates capability requirements via intersection type, and the `Use` type-level function, which eliminates capability requirements.

The ideas are similar to those which [ZIO](https://zio.dev/) enviroments are build on.
