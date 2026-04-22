import { array, constant, constantFrom, date, oneof, record, tuple } from "fast-check";
import { getSpec, isValid, conform, explain, gen } from "./core.js";

export function tuple_(...specArgs) {
  const specs = resolveSpecs(specArgs);
  return {
    kind: "tuple",
    specs,
    valid: (v) => checkTupleValidity(specs, v),
    conform: (v) => applyTupleConformance(specs, v),
    explain: (v) => getTupleExplanation(specs, v),
    gen: () => tuple(...specs.map((spec) => gen(spec))),
  };
}

export function and_(...specArgs) {
  const specs = resolveSpecs(specArgs);
  return {
    kind: "and",
    specs,
    valid: (v) => checkAndValidity(specs, v),
    conform: (v) => applyAndConformance(specs, v),
    explain: (v) => getAndExplanation(specs, v),
    gen: () => createAndGenerator(specs),
  };
}

export function or_(...specArgs) {
  const specs = resolveSpecs(specArgs);
  return {
    kind: "or",
    specs,
    valid: (v) => checkOrValidity(specs, v),
    conform: (v) => applyOrConformance(specs, v),
    explain: (v) => getOrExplanation(specs, v),
    gen: () => oneof(...specs.map((spec) => gen(spec))),
  };
}

export function literal_(value) {
  const eq = (v) => Object.is(v, value);
  return {
    kind: "literal",
    value,
    valid: eq,
    conform: (v) => (eq(v) ? v : "::invalid"),
    explain: (v) =>
      eq(v) ? null : `Expected literal ${formatValue(value)}, got ${formatValue(v)}`,
    gen: () => constant(value),
  };
}

export function enum_(...values) {
  const set = new Set(values);
  const has = (v) => set.has(v);
  return {
    kind: "enum",
    values,
    valid: has,
    conform: (v) => (has(v) ? v : "::invalid"),
    explain: (v) =>
      has(v)
        ? null
        : `Expected one of [${values.map(formatValue).join(", ")}], got ${formatValue(v)}`,
    gen: () =>
      values.length > 0 ? constantFrom(...values) : constant(undefined).filter(() => false),
  };
}

export const oneOf_ = enum_;

export function instanceOf_(Ctor) {
  const check = (v) => v instanceof Ctor;
  const ctorName = Ctor.name || "anonymous";
  return {
    kind: "instanceOf",
    ctor: Ctor,
    valid: check,
    conform: (v) => (check(v) ? v : "::invalid"),
    explain: (v) => (check(v) ? null : `Expected instance of ${ctorName}, got ${formatValue(v)}`),
    gen: () => createInstanceOfGenerator(Ctor, ctorName),
  };
}

export function arrayOf_(specArg) {
  const spec = getSpec(specArg);
  return {
    kind: "arrayOf",
    spec,
    valid: (v) => Array.isArray(v) && v.every((el) => isValid(spec, el)),
    conform: (v) => applyArrayOfConformance(spec, v),
    explain: (v) => getArrayOfExplanation(spec, v),
    gen: () => array(gen(spec)),
  };
}

export function refine_(specArg, pred) {
  return and_(specArg, pred);
}

export const where_ = refine_;

export function shape_(fieldSpecsArg) {
  const fieldSpecs = resolveFieldSpecs(fieldSpecsArg);
  const fieldEntries = Object.entries(fieldSpecs);

  return {
    kind: "shape",
    fieldSpecs,
    valid: (value) => checkShapeValidity(fieldEntries, value),
    conform: (value) => applyShapeConformance(fieldEntries, value),
    explain: (value) => getShapeExplanation(fieldEntries, value),
    gen: () => createShapeGenerator(fieldEntries),
  };
}

function resolveSpecs(specArgs) {
  return specArgs.map(getSpec);
}

function resolveFieldSpecs(fieldSpecsArg) {
  return Object.fromEntries(
    Object.entries(fieldSpecsArg).map(([key, spec]) => [key, getSpec(spec)]),
  );
}

function checkTupleValidity(specs, v) {
  return isArray(v) && hasCorrectLength(v, specs) && allSpecsValid(specs, v);
}

function applyTupleConformance(specs, v) {
  if (!isArray(v) || !hasCorrectLength(v, specs)) return "::invalid";
  return conformEachElement(specs, v);
}

function getTupleExplanation(specs, v) {
  if (!isArray(v)) return "Not an array";
  if (!hasCorrectLength(v, specs)) return formatLengthError(v, specs);
  return formatElementErrors(specs, v);
}

function checkAndValidity(specs, v) {
  return specs.every((s) => isValid(s, v));
}

function applyAndConformance(specs, v) {
  let current = v;
  for (const s of specs) {
    current = conform(s, current);
    if (current === "::invalid") return "::invalid";
  }
  return current;
}

function getAndExplanation(specs, v) {
  for (const s of specs) {
    const err = explain(s, v);
    if (err) return err;
  }
  return null;
}

function checkOrValidity(specs, v) {
  return specs.some((s) => isValid(s, v));
}

function applyOrConformance(specs, v) {
  for (const s of specs) {
    const conformed = conform(s, v);
    if (conformed !== "::invalid") return conformed;
  }
  return "::invalid";
}

function getOrExplanation(specs, v) {
  const errors = specs.map((s) => explain(s, v)).filter(Boolean);
  return allFailed(errors, specs) ? formatAlternativeErrors(errors) : null;
}

function checkShapeValidity(fieldEntries, value) {
  return isObject(value) && fieldEntries.every(([key, spec]) => isValid(spec, value[key]));
}

function applyShapeConformance(fieldEntries, value) {
  if (!isObject(value)) return "::invalid";

  const result = { ...value };
  for (const [key, spec] of fieldEntries) {
    const conformed = conform(spec, value[key]);
    if (conformed === "::invalid") return "::invalid";
    result[key] = conformed;
  }
  return result;
}

function getShapeExplanation(fieldEntries, value) {
  if (!isObject(value)) return "Not an object";

  const errors = fieldEntries
    .map(([key, spec]) => ({ key, err: explain(spec, value[key]) }))
    .filter(({ err }) => err)
    .map(({ key, err }) => `At key ${key}: ${err}`);

  return errors.length > 0 ? errors.join(", ") : null;
}

function createShapeGenerator(fieldEntries) {
  return record(Object.fromEntries(fieldEntries.map(([key, spec]) => [key, gen(spec)])), {
    requiredKeys: fieldEntries.map(([key]) => key),
  }).filter((value) => checkShapeValidity(fieldEntries, value));
}

const isArray = (v) => Array.isArray(v);
const isObject = (v) => v != null && typeof v === "object" && !Array.isArray(v);
const hasCorrectLength = (v, specs) => v.length === specs.length;
const allSpecsValid = (specs, v) => specs.every((s, i) => isValid(s, v[i]));
const allFailed = (errors, specs) => errors.length === specs.length;

function conformEachElement(specs, v) {
  const result = [];
  for (let i = 0; i < specs.length; i++) {
    const conformed = conform(specs[i], v[i]);
    if (conformed === "::invalid") return "::invalid";
    result.push(conformed);
  }
  return result;
}

function formatLengthError(v, specs) {
  return `Wrong tuple length: expected ${specs.length}, got ${v.length}`;
}

function formatElementErrors(specs, v) {
  const errors = specs
    .map((s, i) => ({ err: explain(s, v[i]), i }))
    .filter((x) => x.err)
    .map((x) => `At index ${x.i}: ${x.err}`);
  return errors.length > 0 ? errors.join(", ") : null;
}

function formatAlternativeErrors(errors) {
  return `None of the conditions matched: ${errors.join("; ")}`;
}

function applyArrayOfConformance(spec, v) {
  if (!Array.isArray(v)) return "::invalid";
  const result = [];
  for (let i = 0; i < v.length; i++) {
    const conformed = conform(spec, v[i]);
    if (conformed === "::invalid") return "::invalid";
    result.push(conformed);
  }
  return result;
}

function getArrayOfExplanation(spec, v) {
  if (!Array.isArray(v)) return "Not an array";
  const errors = v
    .map((el, i) => ({ err: explain(spec, el), i }))
    .filter((x) => x.err)
    .map((x) => `At index ${x.i}: ${x.err}`);
  return errors.length > 0 ? errors.join(", ") : null;
}

function createInstanceOfGenerator(Ctor, ctorName) {
  if (Ctor === Date) return date();
  throw new Error(`Generation not implemented for instanceOf_(${ctorName})`);
}

function formatValue(v) {
  if (v === undefined) return "undefined";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function createAndGenerator(specs) {
  for (const spec of specs) {
    try {
      return gen(spec).filter((value) => checkAndValidity(specs, value));
    } catch {
      // Try the next constituent generator.
    }
  }
  throw new Error("Generation not implemented for this and_ spec");
}
