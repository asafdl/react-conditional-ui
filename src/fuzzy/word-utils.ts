const NOISE_WORDS = new Set([
    "when",
    "if",
    "the",
    "where",
    "show",
    "that",
    "then",
    "a",
    "an",
    "for",
    "while",
    "can",
    "expect",
    "check",
    "verify",
    "ensure",
    "find",
    "get",
    "list",
    "filter",
    "only",
    "all",
    "with",
    "having",
    "whose",
    "which",
    "given",
    "assuming",
    "suppose",
    "i",
    "want",
    "need",
    "like",
    "please",
    "me",
    "my",
]);

export function powerSet<T>(items: T[]): T[][] {
    const result: T[][] = [];
    const total = 1 << items.length;
    for (let mask = 1; mask < total; mask++) {
        const subset: T[] = [];
        for (let i = 0; i < items.length; i++) {
            if (mask & (1 << i)) subset.push(items[i]);
        }
        result.push(subset);
    }
    return result;
}

export function splitAtIndices(words: string[], indices: number[]): string[] {
    const segments: string[] = [];
    let start = 0;
    for (const idx of indices) {
        segments.push(words.slice(start, idx).join(" "));
        start = idx + 1;
    }
    segments.push(words.slice(start).join(" "));
    return segments;
}

export function stripLeadingNoise(words: string[]): string[] {
    let i = 0;
    while (i < words.length && NOISE_WORDS.has(words[i])) i++;
    const result = words.slice(i);
    return result;
}
