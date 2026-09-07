# TAR App interfaces

The Harness owns an Action's version, fields, outputs, roles, effects and `interfaceKey`. TAR App owns the native screen registered for that key.

Use the built-in `form`, `confirmation`, `flow` and `flow-builder` keys when they fit. A business-specific screen is compiled into TAR App and registered under a stable key:

```tsx
import { registerActionInterface } from './registry';
import SaleScreen from './SaleScreen';

registerActionInterface('sale-screen', SaleScreen);
```

`SaleScreen` implements `ActionInterfaceProps`. It receives the workspace scope, Action contract and initial inputs, submits through `harness.executeAction`, and calls `onSuccess` only after the Gateway accepts the result. Add the matching interface contract and Action `interfaceKey` in `tarharness/src/registry/catalog.ts`.

Directory entries never contain executable UI code. They reference registered Actions and Flows, so untrusted directory content cannot select an arbitrary component.
