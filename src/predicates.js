import { sdef } from "./core.js";

export const NonEmptyStr = sdef("NonEmptyStr", (v) => typeof v === "string" && v.length > 0);
export const Str = sdef("Str", (v) => typeof v === "string");
export const Num = sdef("Num", (v) => typeof v === "number");
export const Bool = sdef("Bool", (v) => typeof v === "boolean");
export const Int = sdef("Int", (v) => Number.isInteger(v));
export const NonNegativeInt = sdef("NonNegativeInt", Int, (v) => v >= 0);
export const PositiveInt = sdef("PositiveInt", Int, (v) => v > 0);
export const Fn = sdef("Fn", (v) => typeof v === "function");
export const Null = sdef("Null", (v) => v === null);
export const Undefined = sdef("Undefined", (v) => v === undefined);
export const Date_ = sdef("Date", (v) => v instanceof Date);
export const PlainObject = sdef(
  "PlainObject",
  (v) => v !== null && typeof v === "object" && !Array.isArray(v),
);
export const Buffer_ = sdef("Buffer", (v) => typeof Buffer !== "undefined" && Buffer.isBuffer(v));
export const Any = sdef("Any", () => true);
