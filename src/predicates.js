import { sdef } from "./core.js";

export const NonEmptyStr = sdef("NonEmptyStr", (v) => typeof v === "string" && v.length > 0);
export const Str = sdef("Str", (v) => typeof v === "string");
export const Num = sdef("Num", (v) => typeof v === "number");
export const Int = sdef("Int", (v) => Number.isInteger(v));
export const Any = sdef("Any", () => true);
