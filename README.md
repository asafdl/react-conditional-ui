[![CI](https://github.com/asafdl/react-conditional-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/asafdl/react-conditional-ui/actions/workflows/ci.yml)
[![Release](https://github.com/asafdl/react-conditional-ui/actions/workflows/release.yml/badge.svg)](https://github.com/asafdl/react-conditional-ui/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/react-conditional-ui)](https://www.npmjs.com/package/react-conditional-ui)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/asafdl/878c647c0e4534366ac2787e3871ce81/raw/coverage.json)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

<div align="left">
  <img src="logo.png" alt="react-conditional-ui logo" width="380" />
</div>
React component library for building conditions via natural language input. Users type plain-English phrases (e.g. "status is active") instead of filling out combo boxes. A fuzzy parser resolves fields, operators, and values, with support for compound `AND`/`OR` conditions and drag-and-drop grouping.

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

### Group configuration

Each `ConditionGroup` accepts an optional `config` to control per-group behavior:

```tsx
const group: ConditionGroup = {
    id: "1",
    entries: [...],
    config: {
        editable: false,   // disable chip editing
        removable: false,  // hide remove buttons
        variant: "filled", // "outlined" (default) or "filled"
        label: "Filters",  // label above the group
    },
};
```

You can also set defaults for all groups via `defaultGroupConfig` on `<Output />`.

## Hooks Instead of Components

The library’s behavior is split between **presentation** (`<Input />`, `<Output />`, `<ConditionalUI />`) and **data**: a memoized `ConditionDataProvider` facade (parse, suggest, complete, diagnose) plus optional React hooks for local state. You can use the hooks and export types only, and build your own inputs (native `<input>`, design-system fields, mobile, etc.) or your own condition display (lists, tables, read-only summaries).

### `useConditionDataProvider`

Lowest-level hook: creates a stable `ConditionDataProvider` for the given `fields` and optional `operators`, and returns `parseComplexCondition`, `getSuggestion`, `getCompletions`, `diagnose`, plus the raw `provider` instance. No text state, no submit handler—only the core API. Use this when you already manage `value` / `onChange` and want full control over when to parse or show diagnostics.

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

Opinionated input helper: internal or controlled string state, clears diagnostics on change, validates on submit, and wires `parseCompound` / `diagnose` for you. Pair it with `<Input />` when you need controlled mode (see above), or with your own field by calling `handleChange`, `handleSubmit`, and passing through `getSuggestion` / `getCompletions` / `diagnostics`.

### `useConditionalOutput`

Group list and mutations without rendering `<Output />`. Same `groups` / `onGroupsChange` controlled or uncontrolled patterns as the component; use `mutations` (`addGroup`, `removeEntry`, `toggleConnector`, `updateCondition`, reorder helpers, etc.) from your own UI.

```tsx
import { useConditionalOutput } from "react-conditional-ui";

const { groups, mutations } = useConditionalOutput({
    onGroupsChange: (groups) => console.log(groups),
});

mutations.addGroup(parsedGroup);
```

## Styling

All components accept `className` and `style` props. Internal elements use `rcui-*` CSS classes that can be overridden.

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

## Tech debt

- `matchOperator` hard word-count gate should be a scoring penalty instead
- `match-engine.ts` mixes fuzzy matching with parsing logic (`parse`, `identifyField`, `resolveOperator`, `getOperatorCandidates`) — extract parsing into its own module
- `SegmentResolver.resolve` is ~80 lines with deep nesting — break down into smaller functions
- `SuggestionsProvider.completionsForSegment` is ~80 lines with repetitive branching — simplify
- `stripLeadingNoise` + `NOISE_WORDS` in `word-utils.ts` is domain-specific, not a word utility
- `segments.ts` line 1: `import { log } from "debug"` is wrong — `debug` default-exports a factory

## Local development

```bash
npm install
npm run dev
npm run build
npm test
npm run lint
npm run format
```
