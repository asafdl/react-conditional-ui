import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConditionalUI } from "../ConditionalUI";

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

describe("ConditionalUI", () => {
    it("renders input and placeholder text", () => {
        render(<ConditionalUI fields={fields} />);
        expect(screen.getByPlaceholderText("e.g. age greater than 18")).toBeInTheDocument();
        expect(screen.getByText("Parsed condition will appear here…")).toBeInTheDocument();
    });

    it("parses condition on Enter and shows chips", () => {
        render(<ConditionalUI fields={fields} values={values} />);
        const input = screen.getByPlaceholderText("e.g. age greater than 18");

        fireEvent.change(input, { target: { value: "age greater than 18" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(screen.getByText("Age")).toBeInTheDocument();
        expect(screen.getByText("greater than")).toBeInTheDocument();
        expect(screen.getByText("18")).toBeInTheDocument();
    });

    it("shows operator chip for shorthand input", () => {
        render(<ConditionalUI fields={fields} />);
        const input = screen.getByPlaceholderText("e.g. age greater than 18");

        fireEvent.change(input, { target: { value: "age eq 5" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(screen.getByText("Age")).toBeInTheDocument();
        expect(screen.getByText("equals")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("calls onChange when typing", () => {
        let captured = "";
        render(<ConditionalUI fields={fields} onChange={(v) => (captured = v)} />);
        const input = screen.getByPlaceholderText("e.g. age greater than 18");

        fireEvent.change(input, { target: { value: "age gt 10" } });
        expect(captured).toBe("age gt 10");
    });

    it("opens field popover on chip click", () => {
        render(<ConditionalUI fields={fields} />);
        const input = screen.getByPlaceholderText("e.g. age greater than 18");

        fireEvent.change(input, { target: { value: "age equals 5" } });
        fireEvent.keyDown(input, { key: "Enter" });

        fireEvent.click(screen.getByText("Age"));
        expect(screen.getByText("Status")).toBeInTheDocument();
    });
});
