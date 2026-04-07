import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConditionalUI } from "../ConditionalUI";
import { Output } from "../Output";
import { OutputRow } from "../OutputRow";
import { Field, Operator, Value } from "../../condition-structure";
import { DEFAULT_OPERATORS } from "../../condition-structure";
import { generateId } from "../../id";
import type { ParsedCondition, ConditionGroup, ConditionEntry } from "../../types";

const fields = [
    { label: "Age", value: "age" },
    { label: "Status", value: "status" },
];

const values = {
    status: [
        { label: "active", value: "active" },
        { label: "inactive", value: "inactive" },
    ],
};

afterEach(cleanup);

const getInput = () => screen.getByPlaceholderText("e.g. age greater than 18");

const submitCondition = (text: string) => {
    const input = getInput();
    fireEvent.change(input, { target: { value: text } });
    fireEvent.keyDown(input, { key: "Enter" });
};

function makeCondition(
    field: string,
    fieldLabel: string,
    op: string,
    opLabel: string,
    val: string,
): ParsedCondition {
    const fieldOption = fields.find((f) => f.value === field)!;
    const opOption = DEFAULT_OPERATORS.find((o) => o.value === op)!;
    return {
        field: new Field(fieldLabel, fieldOption, 0),
        operator: new Operator(opLabel, opOption, 0),
        value: new Value(val),
    };
}

function makeEntry(condition: ParsedCondition, connector: "and" | "or" = "and"): ConditionEntry {
    return { id: generateId(), condition, connector };
}

function makeGroup(entries: ConditionEntry[]): ConditionGroup {
    return { id: generateId(), entries };
}

describe("ConditionalUI", () => {
    it("renders input and placeholder text", () => {
        render(<ConditionalUI fields={fields} />);
        expect(getInput()).toBeInTheDocument();
        expect(screen.getByText("Parsed condition will appear here…")).toBeInTheDocument();
    });

    it("parses condition on Enter and shows chips", () => {
        render(<ConditionalUI fields={fields} values={values} />);
        submitCondition("age greater than 18");

        expect(screen.getByText("Age")).toBeInTheDocument();
        expect(screen.getByText("greater than")).toBeInTheDocument();
        expect(screen.getByText("18")).toBeInTheDocument();
    });

    it("clears input after successful parse", () => {
        render(<ConditionalUI fields={fields} />);
        submitCondition("age eq 5");

        expect(getInput()).toHaveValue("");
    });

    it("adds multiple condition groups", () => {
        render(<ConditionalUI fields={fields} />);
        submitCondition("age gt 18");
        submitCondition("status equals active");

        expect(screen.getByText("Age")).toBeInTheDocument();
        expect(screen.getByText("greater than")).toBeInTheDocument();
        expect(screen.getByText("18")).toBeInTheDocument();
        expect(screen.getByText("Status")).toBeInTheDocument();
        expect(screen.getByText("equals")).toBeInTheDocument();
        expect(screen.getByText("active")).toBeInTheDocument();
    });

    it("removes a condition with the remove button", () => {
        render(<ConditionalUI fields={fields} />);
        submitCondition("age gt 18");
        submitCondition("status equals active");

        const removeButtons = screen.getAllByLabelText("remove condition");
        expect(removeButtons).toHaveLength(2);

        fireEvent.click(removeButtons[0]);

        expect(screen.queryByText("greater than")).not.toBeInTheDocument();
        expect(screen.getByText("equals")).toBeInTheDocument();
    });

    it("shows placeholder when all groups are removed", () => {
        render(<ConditionalUI fields={fields} />);
        submitCondition("age gt 18");

        fireEvent.click(screen.getByLabelText("remove condition"));

        expect(screen.getByText("Parsed condition will appear here…")).toBeInTheDocument();
    });

    it("opens field popover on chip click", () => {
        render(<ConditionalUI fields={fields} />);
        submitCondition("age equals 5");

        fireEvent.click(screen.getByText("Age"));
        expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("calls onChange with empty string after submit", () => {
        let captured = "";
        render(<ConditionalUI fields={fields} onChange={(v) => (captured = v)} />);
        submitCondition("age gt 10");

        expect(captured).toBe("");
    });

    describe("compound conditions", () => {
        it("parses OR compound and shows connector chip", () => {
            render(<ConditionalUI fields={fields} />);
            submitCondition("status is green or blue");

            const chips = screen.getAllByText("Status");
            expect(chips).toHaveLength(2);
            expect(screen.getByText("OR")).toBeInTheDocument();
        });

        it("parses AND compound into single group", () => {
            render(<ConditionalUI fields={fields} />);
            submitCondition("age gt 18 and status is active");

            expect(screen.getByText("Age")).toBeInTheDocument();
            expect(screen.getByText("Status")).toBeInTheDocument();
            expect(screen.getByText("AND")).toBeInTheDocument();
        });
    });

    describe("onConditionsChange", () => {
        it("fires with initial empty array on mount", () => {
            const spy = vi.fn();
            render(<ConditionalUI fields={fields} onConditionsChange={spy} />);
            expect(spy).toHaveBeenCalledWith([]);
        });

        it("fires when a group is added", () => {
            const spy = vi.fn();
            render(<ConditionalUI fields={fields} onConditionsChange={spy} />);
            spy.mockClear();

            submitCondition("age gt 18");

            expect(spy).toHaveBeenCalledTimes(1);
            const groups = spy.mock.calls[0][0] as ConditionGroup[];
            expect(groups).toHaveLength(1);
            expect(groups[0].entries[0].condition.field.value).toBe("age");
            expect(groups[0].entries[0].condition.operator.value).toBe("gt");
            expect(groups[0].entries[0].condition.value.value).toBe("18");
        });

        it("fires when a condition is removed", () => {
            const spy = vi.fn();
            render(<ConditionalUI fields={fields} onConditionsChange={spy} />);
            submitCondition("age gt 18");
            spy.mockClear();

            fireEvent.click(screen.getByLabelText("remove condition"));

            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy.mock.calls[0][0]).toHaveLength(0);
        });

        it("fires when a condition is updated via popover", () => {
            const spy = vi.fn();
            render(<ConditionalUI fields={fields} onConditionsChange={spy} />);
            submitCondition("age equals 5");
            spy.mockClear();

            fireEvent.click(screen.getByText("Age"));
            fireEvent.click(screen.getByText("Status"));

            expect(spy).toHaveBeenCalledTimes(1);
            const groups = spy.mock.calls[0][0] as ConditionGroup[];
            expect(groups[0].entries[0].condition.field.value).toBe("status");
        });
    });

    describe("popover editing", () => {
        it("updates field via popover selection", () => {
            render(<ConditionalUI fields={fields} />);
            submitCondition("age equals 5");

            fireEvent.click(screen.getByText("Age"));
            fireEvent.click(screen.getByText("Status"));

            expect(screen.getByText("Status")).toBeInTheDocument();
            expect(screen.queryByText("Age")).not.toBeInTheDocument();
        });

        it("updates operator via popover selection", () => {
            render(<ConditionalUI fields={fields} />);
            submitCondition("age equals 5");

            fireEvent.click(screen.getByText("equals"));
            fireEvent.click(screen.getByText("greater than"));

            expect(screen.getByText("greater than")).toBeInTheDocument();
        });
    });

    describe("drag handles", () => {
        it("renders drag handle for each condition row", () => {
            render(<ConditionalUI fields={fields} />);
            submitCondition("age gt 18");

            expect(screen.getByLabelText("drag handle")).toBeInTheDocument();
        });
    });
});

describe("Output standalone (read-only)", () => {
    it("renders groups without edit callbacks", () => {
        const groups = [
            makeGroup([makeEntry(makeCondition("age", "Age", "gt", "greater than", "18"))]),
        ];
        render(<Output groups={groups} fields={fields} operators={DEFAULT_OPERATORS} />);

        expect(screen.getByText("Age")).toBeInTheDocument();
        expect(screen.getByText("greater than")).toBeInTheDocument();
        expect(screen.getByText("18")).toBeInTheDocument();
        expect(screen.queryByLabelText("remove condition")).not.toBeInTheDocument();
    });

    it("shows placeholder with empty groups", () => {
        render(<Output groups={[]} fields={fields} operators={DEFAULT_OPERATORS} />);
        expect(screen.getByText("Parsed condition will appear here…")).toBeInTheDocument();
    });

    it("renders connector chip for multi-entry groups", () => {
        const groups = [
            makeGroup([
                makeEntry(makeCondition("status", "Status", "eq", "equals", "green"), "or"),
                makeEntry(makeCondition("status", "Status", "eq", "equals", "blue"), "or"),
            ]),
        ];
        render(<Output groups={groups} fields={fields} operators={DEFAULT_OPERATORS} />);

        expect(screen.getByText("OR")).toBeInTheDocument();
        expect(screen.getAllByText("Status")).toHaveLength(2);
    });

    it("renders drag handles in read-only mode", () => {
        const groups = [makeGroup([makeEntry(makeCondition("age", "Age", "eq", "equals", "10"))])];
        render(<Output groups={groups} fields={fields} operators={DEFAULT_OPERATORS} />);

        expect(screen.getByLabelText("drag handle")).toBeInTheDocument();
    });
});

describe("OutputRow standalone (read-only)", () => {
    it("renders chips without clickable popovers or remove button", () => {
        const condition = makeCondition("age", "Age", "eq", "equals", "10");
        render(
            <OutputRow
                id="test-1"
                condition={condition}
                fields={fields}
                operators={DEFAULT_OPERATORS}
            />,
        );

        expect(screen.getByText("Age")).toBeInTheDocument();
        expect(screen.getByText("equals")).toBeInTheDocument();
        expect(screen.getByText("10")).toBeInTheDocument();
        expect(screen.queryByLabelText("remove condition")).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("Age"));
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
});
