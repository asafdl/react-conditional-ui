import { describe, it, expect } from "vitest";
import { Value } from "../Value";

describe("Value (POJO)", () => {
    it("defaults to valid when raw is non-empty", () => {
        const v = new Value("hello");
        expect(v.isValid).toBe(true);
        expect(v.value).toBe("hello");
        expect(v.label).toBe("hello");
        expect(v.matchedOption).toBeNull();
        expect(v.errorMessage).toBeNull();
    });

    it("defaults to invalid when raw is empty", () => {
        const v = new Value("");
        expect(v.isValid).toBe(false);
    });

    it("static valid with matched option", () => {
        const opt = { label: "Active", value: "active" };
        const v = Value.valid("act", opt);
        expect(v.isValid).toBe(true);
        expect(v.value).toBe("active");
        expect(v.label).toBe("Active");
        expect(v.matchedOption).toBe(opt);
    });

    it("static invalid with error message", () => {
        const v = Value.invalid("bad", "nope");
        expect(v.isValid).toBe(false);
        expect(v.errorMessage).toBe("nope");
        expect(v.raw).toBe("bad");
    });

    it("static empty", () => {
        const v = Value.empty();
        expect(v.isValid).toBe(false);
        expect(v.raw).toBe("");
        expect(v.errorMessage).toBe("Missing value");
    });
});
