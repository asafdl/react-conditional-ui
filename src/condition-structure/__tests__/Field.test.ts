import { describe, it, expect } from "vitest";
import { Field } from "../Field";

describe("Field", () => {
    it("valid field has correct properties", () => {
        const f = new Field("age", "age", "Age");
        expect(f.isValid).toBe(true);
        expect(f.label).toBe("Age");
        expect(f.value).toBe("age");
        expect(f.raw).toBe("age");
    });

    it("invalid field from static factory", () => {
        const f = Field.invalid("xyz");
        expect(f.isValid).toBe(false);
        expect(f.label).toBe("xyz");
        expect(f.value).toBe("");
    });
});
