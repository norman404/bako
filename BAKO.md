# BAKO.md

This document is Bako's living architecture guide and the source of truth for architectural decisions. It describes the direction of the codebase, including capabilities that are planned but not implemented yet.

## Product

Bako is a local-first desktop point-of-sale application for restaurants, cafeterias, and small businesses. The core application should remain simple to develop while exposing a stable extension boundary for optional and third-party functionality.

The architectural goal is:

> Simple internal modules, explicit platform boundaries, and a secure SDK for external plugins.

Bako is not intended to become a collection of framework layers. Architecture exists to make changes safer and easier, not to make every feature look identical.

## Stack

- Tauri 2
- Rust
- React 19
- TypeScript
- Vite
- SQLite
- Drizzle ORM
- TanStack Query
- Zustand
- Bun

## Quality bar

Every change should be evaluated against:

- **Correctness:** important business rules and failure cases are explicit and testable.
- **Security:** external input, plugin capabilities, filesystem access, network access, database access, and Tauri commands are treated as trust boundaries.
- **Maintainability:** prefer direct code and cohesive modules over abstraction without a concrete need.
- **Performance:** local-first workflows should remain responsive and optional functionality should avoid unnecessary startup cost.
- **UX:** POS workflows should minimize steps, ambiguity, and failure states during active service.

## Architecture principles

### Feature modules

Application features live in `src/modules/<feature>`.

A module starts flat. Create subdirectories only when the number or kind of files makes the module easier to understand.

Example:

```txt
src/modules/delivery/
├── index.ts
├── types.ts
├── delivery-service.ts
├── delivery-store.ts
├── DeliveryPanel.tsx
└── delivery-service.test.ts
```

A larger module may evolve into:

```txt
src/modules/delivery/
├── index.ts
├── types.ts
├── service.ts
├── store.ts
├── components/
│   ├── DeliveryPanel.tsx
│   └── DeliveryPersonSelect.tsx
└── lib/
    ├── calculate-delivery-total.ts
    └── calculate-delivery-total.test.ts
```

Do not create `domain`, `use-cases`, `infrastructure`, `repositories`, or similar layers by default. Introduce a boundary only when it represents a real distinction in the problem.

### Public module API

`index.ts` is the public API of an internal module.

Code outside a module should prefer:

```ts
import { getProducts, type Product } from "@/modules/menu";
```

over importing implementation details from deep paths.

A module may use its own internal files freely. Other modules should depend on its public API whenever practical.

### Functional core, imperative shell

Business calculations, validation, transformations, and decisions should prefer pure functions.

```ts
export function calculateOrderTotal(items: OrderItem[]) {
  return items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
}
```

Side effects stay near the edges: React event handlers, stores, database operations, Tauri commands, filesystem operations, printing, network requests, and plugin bridges.

Do not create interfaces around side effects merely to satisfy an architectural pattern. Create abstractions when there are multiple implementations, a meaningful trust boundary, or a concrete testing/design benefit.

### React

React components own presentation and UI coordination. Complex business decisions should not be embedded in component render logic.

Hooks are useful when behavior is genuinely React-specific. A function does not become a hook simply because a component needs to call it.

### App composition

`src/app` composes modules and application-wide providers. It should coordinate features rather than contain their business logic.

As the extension system evolves, Bako should move toward a module registry/host instead of adding every feature directly to `App.tsx`.

## Proposed source layout

```txt
src/
├── app/
│   ├── App.tsx
│   └── module-registry.ts
├── core/
│   ├── db/
│   ├── events/
│   ├── plugins/
│   └── sdk/
├── components/
├── modules/
│   ├── menu/
│   ├── checkout/
│   ├── orders/
│   ├── theme/
│   ├── delivery/
│   ├── printer/
│   └── shifts/
├── lib/
└── main.tsx
```

This is a target layout, not a requirement to move unrelated files immediately. Existing code should migrate incrementally when touched.

## Internal modules and external plugins

Bako has two different extension concepts and they must not be confused.

### Internal modules

Internal modules are trusted application code compiled with Bako. They can use React, TypeScript, application stores, and approved internal APIs.

They follow the lightweight module conventions in this document.

### External plugins

External plugins are untrusted or less-trusted extensions installed independently from the Bako application.

The long-term goal is to allow a plugin to be authored with standard web technologies such as HTML, CSS, and JavaScript while interacting with Bako only through a versioned Bako SDK.

External plugins must never receive the same privileges as internal modules by default.

Conceptually:

```txt
External plugin
      │
      ▼
   Bako SDK
      │
      ▼
Permission / validation boundary
      │
      ▼
Bako capabilities
      │
      ├── orders
      ├── menu
      ├── customers
      ├── payments
      ├── printing
      ├── settings
      └── events
```

## Plugin manifest

A plugin should declare identity, compatibility, entry points, and requested permissions in a manifest.

Example direction:

```json
{
  "id": "com.example.delivery",
  "name": "Delivery Example",
  "version": "1.0.0",
  "bako": ">=26.8.0",
  "entry": "index.html",
  "permissions": [
    "orders:read",
    "orders:update",
    "customers:read"
  ]
}
```

The exact manifest format is not stable yet. It must be versioned before third-party plugins are considered supported.

## Bako SDK

The SDK is the stable contract between external code and Bako.

A future plugin API should favor explicit capabilities:

```js
const orders = await bako.orders.list();

bako.events.on("order.created", (order) => {
  // react to an order event
});
```

Avoid exposing application internals such as Zustand stores, Drizzle, SQLite handles, React component instances, or raw Tauri APIs.

The SDK should be independently versioned or expose an API version so Bako can evolve without silently breaking installed plugins.

## Security model

The plugin system introduces a security boundary. Convenience must not bypass it.

### Default deny

Plugins receive no privileged capability unless it is explicitly exposed by the SDK and allowed by the plugin's granted permissions.

A plugin should not automatically gain a new capability merely because a newer Bako release adds one.

### Capability permissions

Prefer narrow permissions such as:

```txt
orders:read
orders:create
orders:update
menu:read
customers:read
customers:update
printing:print
settings:read-own
settings:write-own
network:example.com
```

Avoid broad permissions such as `database`, `filesystem`, `system`, or `all`.

Permissions that can cause financial changes, destructive actions, access sensitive customer data, or communicate externally deserve additional scrutiny and may require explicit user approval.

### No direct database access

External plugins must not receive a SQLite connection, Drizzle client, database path, or arbitrary SQL execution capability.

Database access goes through SDK operations owned and validated by Bako.

This allows Bako to enforce invariants, authorization, migrations, audit behavior, and compatibility.

### No direct Tauri access

External plugins must not be able to invoke arbitrary Tauri commands.

Only a controlled plugin bridge may translate approved SDK operations into native capabilities.

Rust commands exposed to that bridge must validate inputs and authorization independently. Frontend validation alone is not a security boundary.

### Filesystem

External plugins have no general filesystem access by default.

If file capabilities are introduced, prefer user-selected files or plugin-scoped storage rather than arbitrary paths. Paths must be normalized and validated on the native side.

### Network

External network access should be explicit. A future permission model should support allowlisted hosts instead of unrestricted network access when practical.

Credentials owned by Bako must never be exposed to plugin JavaScript. Requests requiring application credentials should be proxied through a capability designed for that integration.

### Secrets

API keys, tokens, payment credentials, signing keys, and other secrets must not be stored in plugin-accessible local storage or returned through generic settings APIs.

Plugins that need their own secret should use a dedicated secure-storage capability when one exists.

### UI isolation

Third-party UI should execute in an isolation mechanism appropriate to Tauri's security model rather than being injected directly into Bako's trusted React tree.

The implementation choice must preserve:

- separation from application globals;
- controlled SDK injection;
- navigation restrictions;
- CSP where applicable;
- explicit communication channels;
- the ability to terminate or disable a misbehaving plugin.

The exact isolation mechanism should be decided and threat-modeled before arbitrary third-party code is supported.

### Input validation

Every plugin request is external input.

Validate at the capability boundary and again in Rust/native code for privileged operations. Use schema validation for structured messages. Never trust a plugin-supplied ID, path, URL, price, payment status, permission, or SQL-like expression merely because it came through the SDK.

### Financial operations

Plugins must not be able to mark an order paid, alter settled totals, create refunds, or mutate payment records through generic object update APIs.

Financial actions require dedicated commands with explicit validation and business invariants.

For example, prefer:

```js
bako.payments.requestRefund({ paymentId, amount });
```

over:

```js
bako.payments.update(paymentId, { status: "refunded" });
```

### Auditing

Security-sensitive plugin operations should eventually be attributable to a plugin ID and version.

Useful audit fields include:

```txt
plugin_id
plugin_version
capability
timestamp
resource_id
result
```

Do not log secrets or unnecessary customer information.

### Installation and trust

Before a public plugin ecosystem exists, installation should clearly communicate the plugin source and requested permissions.

Future distribution may add package hashes, signatures, publisher identity, revocation, or a curated registry. These are not prerequisites for developing the SDK locally, but they are prerequisites to consider before presenting third-party plugins as trusted or verified.

## Events

Cross-module and plugin communication should use events for facts that have already happened, for example:

```txt
order.created
order.updated
order.paid
shift.opened
shift.closed
```

Do not use events as an invisible replacement for normal function calls inside a cohesive module.

External plugin events must expose stable DTOs rather than internal database rows.

## Themes

Theme customization is a good first example of a data-driven extension because it requires little privilege.

A Bako theme should be representable as data and translated into application design tokens.

The initial user-facing format may stay deliberately small, for example a compact palette:

```txt
#C6A0F6,#24273A,#181926,#F8F8FA,#363A4F
```

Parsing and validation belong in the theme module. Applying the theme belongs at the UI boundary.

Themes should not require arbitrary JavaScript execution.

## Database

Bako remains local-first and uses SQLite.

Database schema and migrations are application infrastructure. External plugins do not own migrations in the main Bako database unless a future extension design explicitly introduces a safe namespaced mechanism.

Business logic should not depend on raw database row shapes when doing so makes schema changes leak throughout the application.

## Testing

Test behavior and invariants, not architecture for architecture's sake.

Prioritize tests for:

- business calculations;
- validation;
- payment and order invariants;
- permission checks;
- plugin message schemas;
- native command authorization;
- migrations and important persistence behavior;
- bugs with meaningful regression risk.

Pure functions should be cheap to test. UI tests are appropriate for important user interactions. Security boundaries need negative tests proving forbidden operations remain forbidden.

TDD remains encouraged for behavior with a clear contract, but code should not gain unnecessary abstractions solely to make mocking easier.

## Dependency rules

- `modules/<feature>` owns feature-specific behavior.
- `core` is reserved for truly cross-cutting platform infrastructure.
- `components` contains reusable application UI rather than feature business logic.
- `lib` contains small generic utilities with no feature ownership.
- Internal modules should not reach into another module's private implementation when a public API exists.
- External plugins never import internal application modules.
- External plugins communicate only through the supported SDK/bridge.

## Migration strategy

Do not rewrite Bako wholesale to match this document.

Use incremental migration:

1. New features use the lightweight module structure.
2. Existing modules are simplified when meaningful work touches them.
3. Remove architecture-only abstractions when they no longer provide value.
4. Preserve behavior with tests during structural changes.
5. Build the SDK boundary before allowing arbitrary third-party plugins.
6. Introduce permissions before exposing privileged capabilities.

## Architectural invariants

These rules should remain difficult to violate accidentally:

1. External plugins cannot access SQLite directly.
2. External plugins cannot invoke arbitrary Tauri commands.
3. External plugins receive capabilities through a permission-aware SDK.
4. Financial mutations use explicit business operations, not generic record updates.
5. Privileged native operations validate authorization and input in Rust.
6. Internal modules remain free to be simple and should not inherit plugin-system ceremony.
7. The SDK exposes stable contracts, not Bako implementation details.
8. New capabilities are denied to existing plugins until permission is granted.

## Status

The lightweight internal module architecture is the direction for new and refactored Bako code.

The external plugin SDK, sandbox/isolation model, permission runtime, signing/distribution model, and third-party plugin APIs described here are architectural targets. They should not be documented as production features until implemented and validated.
