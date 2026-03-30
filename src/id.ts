let counter = 0;

export const generateId = (): string => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${++counter}`;
};
