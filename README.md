# react-conditional-ui

[![CI](https://github.com/asafdl/react-conditional-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/asafdl/react-conditional-ui/actions/workflows/ci.yml)
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/asafdl/878c647c0e4534366ac2787e3871ce81/raw/coverage.json)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

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

## Hooks

### `useConditionalInput`

Manages input state, parsing, diagnostics, and suggestions. Use when composing `<Input />` with custom UI.

### `useConditionalOutput`

Manages group state and mutations (add, remove, reorder, update, toggle connectors). Supports controlled/uncontrolled patterns.

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
- Test coverage gaps: no dedicated tests for `SegmentResolver`, `SuggestionsProvider`, `DiagnosticsProvider`, `MatchEngine`, scoring functions
- `parser.test.ts` (836 lines) should be split per concern: parsing, completions, suggestions, diagnostics, field types, validation

## Local development

```bash
npm install
npm run dev          # starts the Vite demo app
npm run build        # builds the library (tsup)
npm test             # runs Vitest
npm run lint         # ESLint
npm run format       # Prettier
```
