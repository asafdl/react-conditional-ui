import createDebug from "debug";

const BASE = "react-conditional-ui";

export const createLogger = (namespace: string) => createDebug(`${BASE}:${namespace}`);
