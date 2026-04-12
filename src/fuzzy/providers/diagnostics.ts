import { Diagnostic } from "../../types";
import { ConditionQueryHelper } from "../../conditions/query-helper";
import { SegmentResolver } from "../segments";

export class DiagnosticsProvider {
    public constructor(
        private readonly query: ConditionQueryHelper,
        private readonly segmentResolver: SegmentResolver,
    ) {}

    public diagnose(text: string): Diagnostic[] {
        const input = text.trim();
        if (!input) return [{ start: 0, end: text.length || 1, message: "Empty condition" }];

        const { segments, conditions } = this.segmentResolver.resolve(input);
        const diagnostics: Diagnostic[] = [];

        if (conditions.length === 0) {
            return [
                { start: 0, end: input.length, message: "Could not understand this condition" },
            ];
        }

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const offset = input.toLowerCase().indexOf(seg.toLowerCase());
            const condition = conditions[i];

            if (!condition) {
                diagnostics.push({
                    start: offset,
                    end: offset + seg.length,
                    message: "Could not understand this condition",
                });
                continue;
            }

            if (!condition.operator.isValid) {
                const fieldEnd = offset + condition.field.raw.length;
                const fieldConfig = this.query.findFieldByValue(condition.field.value);
                const hasRestriction = fieldConfig?.operators || fieldConfig?.type;
                diagnostics.push({
                    start: fieldEnd,
                    end: offset + seg.length,
                    message: hasRestriction
                        ? `Operator not supported for ${condition.field.label}`
                        : "Unknown operator",
                });
            }

            if (condition.operator.isValid && !condition.value.isValid) {
                if (!condition.value.raw) {
                    diagnostics.push({
                        start: offset + seg.length,
                        end: offset + seg.length + 1,
                        message: "Missing value",
                    });
                } else {
                    const valStart =
                        offset + seg.toLowerCase().lastIndexOf(condition.value.raw.toLowerCase());
                    diagnostics.push({
                        start: valStart,
                        end: valStart + condition.value.raw.length,
                        message:
                            condition.value.errorMessage ??
                            `Value not recognized for ${condition.field.label}`,
                    });
                }
            }
        }

        return diagnostics;
    }
}
