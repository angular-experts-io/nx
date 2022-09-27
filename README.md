# Epic nx workspace generators collections for maximal productivity!

![Coveralls](https://img.shields.io/coveralls/github/angular-experts-io/nx)

![Twitter URL](https://img.shields.io/twitter/url?label=Angular%20Experts&style=social&url=https%3A%2F%2Ftwitter.com%2Fangularexperts_)



<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [WIP: Epic nx workspace generators collections for maximal productivity!](#wip-epic-nx-workspace-generators-collections-for-maximal-productivity)

- [Getting started](#getting-started)
  - [Installation (not yet possible - package isn't yet published)](#installation-not-yet-possible---package-isnt-yet-published)
  - [Workspace schematics](#workspace-schematics)
- [Architecture](#architecture)
  - [Module boundaries enforcements](#module-boundaries-enforcements)
    - [Context](#context)
  - [Library types](#library-types)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


> 👋 Welcome to Angular experts NX schematics

## What is this project about?

This project provides schematics to a clean, modern, and efficient monorepo approach.

​	✅ automated tooling to preserve clean architecture

​	✅ automated tooling to generate application structure, just provide your implementation

​	✅ **consistent**, **unified**, predictable and clean API of stack services, data access and UI components

## Getting started

### Installation (not yet possible - package isn't yet published)

```bash
npm install -D @angular-experts/nx-plugin
```

Once you installed the module you can start using the workspace schematics. This project provides the following workspace schematics.

### Workspace schematics

- `npm run g app` - generate app, follow the prompts in the CLI
- `npm run g lib` - generate lib, follow the prompts in the CLI
- `npm run g remove` - remove app or lib (and all the dependent apps and libs)
- `npm run g module-boundaries-validate` - validate tags & enforce module boundaries rules

## Architecture

The clean architecture is automated and enforced using schematics to create both `apps` and `libs` which are generated in **predictable locations** with appropriate `tags` and `enforce-module-boundaries` (eslint rule definitions)

> The architecture is also validated using additional schematics which make sure that the actual folder structure and rules stay in sync!

### Module boundaries enforcements

The architecture works on 3 levels:

- **context** - top level grouping, eg `SALES`, `SUPPLY`, `PURCHASE`
- **scope** - impl that belongs to specific app `some-app` or `scope:public` to mark impl that should be accessible from other contexts
- **type** - impl of specific type, eg `ui` for components, `feature` for business flow.

In general, available contexts, scopes and types can be selected when running schematics to generate apps and libs.

#### Context

Context of the apps and libs, eg `SALES`, `SUPPLY`, `PURCHASE`. Logic within the context is in general available for reuse within the same context with some additional rules applying on lover levels with relation to `scope` and `type`.

![Logo](./doc/architecture.svg)

### Library types

- **feature-** - (lazy loaded Angular feature module) business logic / flow, has routing of its own with the corresponding container component (generated out of the box), feature module usualy contains implementation of components, services for that particular feature (generate them using `nx g service <service-name> --project <feature-project-name>`
- **data-access-** - NgRx based data access (CRUD for API endpoints), should be always headless (no components) to be asily re-usable and composable in features
- **ui-** - standalone (simple / view / presentational / dumb) UI component, eg calendar or toggle, should never import any service and communicate only using `@Input` and `@Output`
- **util-** - any standalone Angular util logic, for validators, interceptors, guards, scheduler ... eg `util-form-validator-<valiator-name>` or `util-interceptor-api-key`
- **util-fn-** - any standalone util logic (plain Typescript function), eg data transformation, query params handling, error object transform, ...
- **model-** - simple (non Angular) library to define and expose typescript `interface`, `type`, `enum` and `const` definitions

