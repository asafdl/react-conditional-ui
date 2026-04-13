[![CI](https://github.com/asafdl/react-conditional-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/asafdl/react-conditional-ui/actions/workflows/ci.yml)
[![Release](https://github.com/asafdl/react-conditional-ui/actions/workflows/release.yml/badge.svg)](https://github.com/asafdl/react-conditional-ui/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/react-conditional-ui)](https://www.npmjs.com/package/react-conditional-ui)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/asafdl/878c647c0e4534366ac2787e3871ce81/raw/coverage.json)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
<div align="left">
  <img src="logo.png" alt="react-conditional-ui logo" width="380" />
</div>
React component library for "type to build" conditions via natural language input, <b>fast and lightweight</b>, no LLM required! Users type plain-English phrases (e.g. "status is active") instead of filling out combo boxes. A fuzzy parser resolves fields, operators, and values, with support for compound `AND`/`OR` conditions that transform into interactive drag-and-drop condition groups.

**[Live Demo](https://asafdl.github.io/react-conditional-ui/)**

## Components

### `<ConditionalUI />`

All-in-one component: input field + parsed condition output with editing and drag-and-drop.

```tsx
import { ConditionalUI } from "react-conditional-ui";

<ConditionalUI
    fields={[
        { label: "Status", value: "status" },
        { label: "Age", value: "age", type: "number" },
    ]}
    onConditionsChange={(groups) => console.log(groups)}
/>;
```

### `<Input />`

Standalone text input with fuzzy parsing, ghost autocomplete, and inline diagnostics.

```tsx
import { Input } from "react-conditional-ui";

<Input fields={fields} operators={operators} onSubmit={(group) => console.log(group)} />;
```

Also supports a fully controlled mode via `useConditionalInput`:

```tsx
import { Input, useConditionalInput } from "react-conditional-ui";

const { text, diagnostics, handleChange, handleSubmit, getSuggestion } = useConditionalInput({
    fields,
    onSubmit: handleGroup,
});

<Input
    value={text}
    onChange={handleChange}
    onSubmit={handleSubmit}
    getSuggestion={getSuggestion}
    diagnostics={diagnostics}
/>;
```

### `<Output />`

Renders parsed condition groups as interactive chip rows with drag-and-drop reordering, chip editing via popovers, connector toggling, and entry removal.

Uncontrolled (manages its own state):

```tsx
import { Output } from "react-conditional-ui";

<Output fields={fields} operators={operators} />;
```

Controlled:

```tsx
<Output groups={groups} fields={fields} operators={operators} onGroupsChange={setGroups} />
```

Read-only (pass `groups` without `onGroupsChange`):

```tsx
<Output groups={groups} fields={fields} operators={operators} />
```

## Data Model

The `<Input />` parser converts free-text into a `ConditionGroup` which the `<Output />` renders. The full type hierarchy:

```
ConditionGroup
├── id: string
├── config?: GroupConfig
└── entries: ConditionEntry[]
        ├── id: string
        ├── connector: "and" | "or"
        └── condition: ParsedCondition
                ├── field:    { raw, value, label, isValid }
                ├── operator: { raw, value, label, isValid }
                └── value:    { raw, value, label, isValid, errorMessage?, matchedOption? }
```

For example, typing `"status is active and age greater than 18"` produces:

```json
{
  "id": "g1",
  "entries": [
    {
      "id": "e1",
      "connector": "and",
      "condition": {
        "field":    { "raw": "status",       "value": "status", "label": "Status",       "isValid": true },
        "operator": { "raw": "is",           "value": "is",     "label": "is",           "isValid": true },
        "value":    { "raw": "active",       "value": "active", "label": "active",       "isValid": true }
      }
    },
    {
      "id": "e2",
      "connector": "and",
      "condition": {
        "field":    { "raw": "age",          "value": "age",    "label": "Age",          "isValid": true },
        "operator": { "raw": "greater than", "value": "gt",     "label": "greater than", "isValid": true },
        "value":    { "raw": "18",           "value": "18",     "label": "18",           "isValid": true }
      }
    }
  ]
}
```

This is the same object surfaced by `onConditionsChange` (as an array of groups), `onSubmit` on the `<Input />`, and `useConditionalOutput`'s `groups` state.

## Customization

Use these when you want to keep parser behavior but tailor UI/interaction details.

### Component-level options

- `<ConditionalUI />`: pass `InputComponent` and/or `OutputComponent` to replace either half of the default UI.
- `<Input />`: customize `placeholder`, `className`, and `style`.
- `<Output />`: customize `defaultGroupConfig`, `className`, and `style`.
- All components support controlled patterns (`value`/`onChange`, `groups`/`onGroupsChange`) where applicable.

```tsx
<ConditionalUI
    fields={fields}
    InputComponent={MyInput}
    OutputComponent={MyOutput}
    onConditionsChange={setGroups}
/>
```

### Field-level parser options

`FieldOption` supports per-field parsing behavior:

- `operators`: override allowed operators for a specific field
- `fieldValues`: provide known values (useful for enum-like suggestions)
- `type`: built-in value checks (`"text" | "number" | "enum"`)
- `validateValue`: custom validator (`true` or error string)

### Group configuration

Each `ConditionGroup` can define `config`:

```tsx
const group: ConditionGroup = {
    id: "1",
    entries: [...],
    config: {
        editable: false,
        removable: false,
        variant: "filled", // "outlined" (default) or "filled"
        label: "Filters",
    },
};
```

Set defaults for all groups with `defaultGroupConfig` on `<Output />`.

### Hooks for custom UI

Use hooks when you want your own input/output rendering and state wiring.

### `useConditionDataProvider`

Lowest-level API: returns `parseComplexCondition`, `getSuggestion`, `getCompletions`, `diagnose`, and `provider`. Use it when you already control input state and submit flow.

```tsx
import { useConditionDataProvider, DEFAULT_OPERATORS } from "react-conditional-ui";

const { parseComplexCondition, getSuggestion, diagnose } = useConditionDataProvider({
    fields,
    operators: DEFAULT_OPERATORS,
});

const group = parseComplexCondition(raw);
const issues = diagnose(raw);
```

### `useConditionalInput`

Input-state helper for controlled/uncontrolled text, submit validation, and diagnostics.

### `useConditionalOutput`

Group-state + mutations without rendering `<Output />`; use this to build your own chips/list/table UI.

Includes helpers like `addGroup`, `removeEntry`, `toggleConnector`, `updateCondition`, `updateGroupConfig`, reordering/move helpers, and `setGroups`.

```tsx
import { useConditionalOutput } from "react-conditional-ui";

const { groups, mutations } = useConditionalOutput({
    onGroupsChange: (groups) => console.log(groups),
});

mutations.addGroup(parsedGroup);
```

## Styling

All components accept `className` and `style` props. Internal elements use `rcui-*` CSS classes that can be overridden.

## Error handling

- Parsing/validation issues are exposed as `Diagnostic[]` (`start`, `end`, `message`) via `useConditionalInput` and controlled `<Input />` mode.
- Managed input submit is fail-safe: invalid conditions are not emitted via `onSubmit`; diagnostics are shown instead.
- Use `useConditionDataProvider().diagnose(text)` when building custom UIs and `FieldOption.validateValue` for field-specific validation rules.

## Debug logging

The library uses the [`debug`](https://www.npmjs.com/package/debug) package. Logs are silent by default. Enable them to see how the fuzzy parser resolves fields, operators, and values:

```js
// Browser — enable all library logs
localStorage.debug = "react-conditional-ui:*";

// Browser — specific namespace only
localStorage.debug = "react-conditional-ui:parser";
```

```bash
# Node / SSR
DEBUG=react-conditional-ui:* node app.js
```

Available namespaces: `parser`, `match-engine`.

## Local development

```bash
npm install
npm run dev
npm run build
npm test
npm run lint
npm run format
```
