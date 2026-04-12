import { describe, it, expect } from "vitest";
import { Operator } from "../Operator";

describe("Operator", () => {
    it("valid operator has correct properties", () => {
        const op = new Operator("equals", "eq", "equals");
        expect(op.isValid).toBe(true);
        expect(op.label).toBe("equals");
        expect(op.value).toBe("eq");
    });

    it("invalid operator from static factory", () => {
        const op = Operator.invalid("blah");
        expect(op.isValid).toBe(false);
        expect(op.label).toBe("blah");
        expect(op.value).toBe("");
    });
});
