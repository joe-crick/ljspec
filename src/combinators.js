import fc from "fast-check";
import { getSpec, isValid, conform, explain, gen } from "./core.js";

// --- Wishful Thinking: High-Level Entry Points ---

export function tuple_(...specArgs) {
  const specs = resolveSpecs(specArgs);
  return {
    kind: "tuple",
    specs,
    valid: (v) => checkTupleValidity(specs, v),
    conform: (v) => applyTupleConformance(specs, v),
    explain: (v) => getTupleExplanation(specs, v),
    gen: () => fc.tuple(...specs.map((spec) => gen(spec))),
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
    gen: () => fc.oneof(...specs.map((spec) => gen(spec))),
  };
}

// --- Implementation: Fine-Grained Named Functions ---

function resolveSpecs(specArgs) {
  return specArgs.map(getSpec);
}

// Tuple Implementation
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

// And Implementation
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

// Or Implementation
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

// --- Low-Level Utilities ---

const isArray = (v) => Array.isArray(v);
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
