import Fuse from "fuse.js";
import type { FieldOption, OperatorOption, ParsedCondition } from "../types";

type FlatAlias = { alias: string; operator: OperatorOption };

export function parseCondition(
    text: string,
    fields: FieldOption[],
    operators: OperatorOption[],
): ParsedCondition | null {
    const input = text.trim().toLowerCase();
    if (!input) return null;

    let matchedField: FieldOption | null = null;
    let fieldEndIndex = 0;

    for (const f of fields) {
        const label = f.label.toLowerCase();
        if (input.startsWith(label)) {
            if (!matchedField || label.length > matchedField.label.length) {
                matchedField = f;
                fieldEndIndex = label.length;
            }
        }
    }

    if (!matchedField) return null;

    const afterField = input.slice(fieldEndIndex).trimStart();
    if (!afterField) return { field: matchedField.value, operator: "", value: "" };

    const flatAliases: FlatAlias[] = operators.flatMap((op) =>
        op.aliases.map((alias) => ({ alias: alias.toLowerCase(), operator: op })),
    );

    const fuse = new Fuse(flatAliases, {
        keys: ["alias"],
        threshold: 0.4,
        includeScore: true,
    });

    const words = afterField.split(/\s+/);
    let bestMatch: {
        operator: OperatorOption;
        consumed: number;
        score: number;
        wordCount: number;
    } | null = null;

    const STRONG_MATCH = 0.2;

    for (let i = 1; i <= words.length; i++) {
        const candidate = words.slice(0, i).join(" ");
        const results = fuse.search(candidate);
        if (results.length > 0) {
            const top = results[0];
            const score = top.score ?? 1;
            const isStrong = score <= STRONG_MATCH;

            if (!bestMatch) {
                bestMatch = {
                    operator: top.item.operator,
                    consumed: candidate.length,
                    score,
                    wordCount: i,
                };
            } else if (isStrong && i > bestMatch.wordCount) {
                bestMatch = {
                    operator: top.item.operator,
                    consumed: candidate.length,
                    score,
                    wordCount: i,
                };
            } else if (
                score < bestMatch.score &&
                !(bestMatch.score <= STRONG_MATCH && bestMatch.wordCount > i)
            ) {
                bestMatch = {
                    operator: top.item.operator,
                    consumed: candidate.length,
                    score,
                    wordCount: i,
                };
            }
        }
    }

    if (!bestMatch) return { field: matchedField.value, operator: "", value: "" };

    const afterOp = afterField.slice(bestMatch.consumed).trimStart();

    return {
        field: matchedField.value,
        operator: bestMatch.operator.value,
        value: afterOp,
    };
}
