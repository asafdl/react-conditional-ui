import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../Input";
import { useConditionalInput } from "../../hooks/useConditionalInput";
import { DEFAULT_OPERATORS } from "../../condition-structure";
import type { ConditionGroup } from "../../types";

const fields = [
    { label: "Age", value: "age" },
    {
        label: "Status",
        value: "status",
        fieldValues: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
        ],
    },
];

afterEach(cleanup);

const placeholderRe = /for suggestions/;

function getTextFieldInput() {
    return screen.getByPlaceholderText(placeholderRe);
}

describe("Input (standalone)", () => {
    it("calls onSubmit with a parsed group on Enter when valid", () => {
        const onSubmit = vi.fn();
        render(<Input fields={fields} operators={DEFAULT_OPERATORS} onSubmit={onSubmit} />);

        const input = getTextFieldInput();
        fireEvent.change(input, { target: { value: "age greater than 21" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onSubmit).toHaveBeenCalledTimes(1);
        const group = onSubmit.mock.calls[0][0] as ConditionGroup;
        expect(group.entries).toHaveLength(1);
        expect(group.entries[0].condition.field.value).toBe("age");
        expect(group.entries[0].condition.value.value).toBe("21");
    });

    it("clears the field after successful submit in uncontrolled mode", () => {
        const onSubmit = vi.fn();
        render(<Input fields={fields} operators={DEFAULT_OPERATORS} onSubmit={onSubmit} />);

        const input = getTextFieldInput();
        fireEvent.change(input, { target: { value: "age eq 3" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onSubmit).toHaveBeenCalled();
        expect(input).toHaveValue("");
    });

    it("does not call onSubmit and shows squiggles when input cannot be parsed", () => {
        const onSubmit = vi.fn();
        render(<Input fields={fields} operators={DEFAULT_OPERATORS} onSubmit={onSubmit} />);

        const input = getTextFieldInput();
        fireEvent.change(input, { target: { value: "height greater than 180" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onSubmit).not.toHaveBeenCalled();
        expect(document.querySelector(".rcui-squiggly")).toBeTruthy();
    });

    it("submits when clicking the submit icon", () => {
        const onSubmit = vi.fn();
        render(<Input fields={fields} operators={DEFAULT_OPERATORS} onSubmit={onSubmit} />);

        const input = getTextFieldInput();
        fireEvent.change(input, { target: { value: "age gt 9" } });

        const submitButtons = screen.getAllByRole("button");
        const submitBtn = submitButtons.find((b) => b.querySelector(".rcui-adornment-enter"));
        expect(submitBtn).toBeTruthy();
        fireEvent.click(submitBtn!);

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("opens field completions on Ctrl+Space", () => {
        render(<Input fields={fields} operators={DEFAULT_OPERATORS} />);

        const input = getTextFieldInput();
        fireEvent.keyDown(input, { key: " ", ctrlKey: true });

        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Age" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Status" })).toBeInTheDocument();
    });

    it("opens field completions on Option+Space (Mac)", () => {
        render(<Input fields={fields} operators={DEFAULT_OPERATORS} />);

        const input = getTextFieldInput();
        fireEvent.keyDown(input, { key: " ", code: "Space", altKey: true });

        expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("opens field completions when clicking the suggestions (+) button", async () => {
        render(<Input fields={fields} operators={DEFAULT_OPERATORS} />);

        await userEvent.click(screen.getByRole("button", { name: "Show suggestions" }));

        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Age" })).toBeInTheDocument();
    });

    it("accepts the active completion with Enter", async () => {
        render(<Input fields={fields} operators={DEFAULT_OPERATORS} />);

        const input = getTextFieldInput();
        fireEvent.keyDown(input, { key: " ", ctrlKey: true });

        await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());

        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() => {
            expect(input).toHaveValue("Age");
        });
    });

    it("closes completions on Escape", () => {
        render(<Input fields={fields} operators={DEFAULT_OPERATORS} />);

        const input = getTextFieldInput();
        fireEvent.keyDown(input, { key: " ", ctrlKey: true });
        expect(screen.getByRole("listbox")).toBeInTheDocument();

        fireEvent.keyDown(input, { key: "Escape" });

        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("accepts ghost completion with Tab when a suggestion exists", () => {
        render(<Input fields={fields} operators={DEFAULT_OPERATORS} />);

        const input = getTextFieldInput();
        fireEvent.change(input, { target: { value: "sta" } });
        fireEvent.keyDown(input, { key: "Tab" });

        expect(input).toHaveValue("status");
    });
});

describe("Input (controlled via useConditionalInput)", () => {
    function ControlledField() {
        const { text, diagnostics, handleChange, handleSubmit, getSuggestion, getCompletions } =
            useConditionalInput({
                fields,
                operators: DEFAULT_OPERATORS,
                onSubmit: vi.fn(),
            });

        return (
            <Input
                value={text}
                onChange={handleChange}
                onSubmit={handleSubmit}
                getSuggestion={getSuggestion}
                getCompletions={getCompletions}
                diagnostics={diagnostics}
            />
        );
    }

    it("reflects external typing and still parses on Enter", () => {
        render(<ControlledField />);
        const input = getTextFieldInput();
        fireEvent.change(input, { target: { value: "age is 30" } });
        fireEvent.keyDown(input, { key: "Enter" });
        expect(input).toHaveValue("");
    });
});
