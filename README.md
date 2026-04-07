# react-conditional-ui

[![CI](https://github.com/asafdl/react-conditional-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/asafdl/react-conditional-ui/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

React component library for building conditions via natural language input. Users type plain-English phrases (e.g. "status is active") instead of filling out combo boxes. A fuzzy parser resolves fields, operators, and values, with support for compound `AND`/`OR` conditions and drag-and-drop grouping.

## Components

### `<ConditionalUI />`

All-in-one component: input field + parsed condition output with editing and drag-and-drop.

```tsx
import { ConditionalUI } from "react-conditional-ui";

<ConditionalUI
    fields={[{ label: "Status", value: "status" }]}
    operators={DEFAULT_OPERATORS}
    onConditionsChange={(groups) => console.log(groups)}
/>;
```

### `<Input />`

Standalone text input. Calls `onSubmit` when the user presses Enter.

```tsx
<Input onSubmit={(text) => handleParse(text)} placeholder="Type a condition…" />
```

### `<Output />`

Renders parsed condition groups as interactive chip rows. Supports editing (chip popovers), removal, connector toggling, and drag-and-drop reordering when `onGroupsChange` is provided. Read-only when omitted.

```tsx
<Output
    groups={groups}
    fields={fields}
    operators={operators}
    onGroupsChange={setGroups}
    onUpdateCondition={handleUpdate}
/>
```

## Planned features

- **Mentions / autocomplete** — inline suggestions while typing to surface available fields, operators, and values
- **Condition structure behaviours** — field-level constraints (e.g. a field only accepts numeric values, or a specific set of operators)
- **Error & notification system** — surface validation errors and parser feedback to the consumer

## Local development

```bash
npm install
npm run dev          # starts the Vite demo app
npm run build        # builds the library (tsup)
npm test             # runs Vitest
npm run lint         # ESLint
npm run format       # Prettier
```
