import { describe, it, expect } from "vitest";
import {
  sdef,
  getSpec,
  isValid,
  conform,
  explain,
  gen,
  tuple_,
  and_,
  or_,
  Str,
  Int,
  Num,
  fdef,
  instrument,
  getContract,
  ContractError,
} from "../src/index.js";

function captureThrown(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
}

describe("Registry lookups", () => {
  it("getSpec resolves a registered spec by name", () => {
    sdef("CoverageEven", (n) => n % 2 === 0);
    const spec = getSpec("CoverageEven");
    expect(spec.valid(4)).toBe(true);
    expect(spec.valid(5)).toBe(false);
  });

  it("getSpec throws for unknown name", () => {
    expect(() => getSpec("::nope::")).toThrow(/Spec not found/);
  });

  it("getContract resolves a registered contract by name", () => {
    fdef("coverage.noop", { args: tuple_(Int) });
    const contract = getContract("coverage.noop");
    expect(contract.name).toBe("coverage.noop");
  });

  it("getContract throws for unknown name", () => {
    expect(() => getContract("::nope::")).toThrow(/Contract not found/);
  });

  it("instrument throws when given an unknown contract name", () => {
    expect(() => instrument(() => null, "::missing-contract::")).toThrow(/Contract not found/);
  });
});

describe("Combinators with registered names", () => {
  it("and_ resolves string-named specs from the registry", () => {
    sdef("CovPos", (n) => n > 0);
    const spec = and_("Int", "CovPos");
    expect(isValid(spec, 3)).toBe(true);
    expect(isValid(spec, -3)).toBe(false);
    expect(isValid(spec, 1.5)).toBe(false);
  });

  it("or_ resolves string-named specs from the registry", () => {
    const spec = or_("Str", "Int");
    expect(isValid(spec, "x")).toBe(true);
    expect(isValid(spec, 5)).toBe(true);
    expect(isValid(spec, true)).toBe(false);
  });
});

describe("Explain details", () => {
  it("explains tuple length mismatches", () => {
    const T = tuple_(Int, Int);
    expect(explain(T, [1])).toMatch(/Wrong tuple length/);
    expect(explain(T, "nope")).toBe("Not an array");
  });

  it("explains tuple element failures with index", () => {
    const T = tuple_(Int, Str);
    const msg = explain(T, [1, 99]);
    expect(msg).toMatch(/At index 1/);
  });

  it("or_ returns null when any branch matches", () => {
    const spec = or_(Str, Int);
    expect(explain(spec, "ok")).toBeNull();
  });

  it("or_ reports all alternatives when none match", () => {
    const spec = or_(Str, Int);
    expect(explain(spec, true)).toMatch(/None of the conditions matched/);
  });

  it("and_ reports the first failing condition", () => {
    const Positive = sdef("CovAndPositive", (n) => n > 0);
    const spec = and_(Int, Positive);
    const msg = explain(spec, -1);
    expect(msg).toMatch(/failed predicate/);
  });
});

describe("Conform semantics", () => {
  it("tuple_ conform returns ::invalid if any element fails", () => {
    const T = tuple_(Int, Str);
    expect(conform(T, [1, 2])).toBe("::invalid");
  });

  it("or_ returns the first successful conform and skips failing branches", () => {
    const Upper = {
      valid: (v) => typeof v === "string" && v === v.toUpperCase(),
      conform: (v) => (typeof v === "string" ? v.toUpperCase() : "::invalid"),
    };
    const spec = or_(Int, Upper);
    expect(conform(spec, "hi")).toBe("HI");
  });

  it("and_ short-circuits on first invalid conform", () => {
    const Even = { valid: (n) => n % 2 === 0, conform: (n) => (n % 2 === 0 ? n : "::invalid") };
    const spec = and_(Int, Even);
    expect(conform(spec, 3)).toBe("::invalid");
  });
});

describe("Generation edge cases", () => {
  it("throws a helpful error for predicate-only specs without an inferred generator", () => {
    const Unspec = sdef("CovUnspec", (v) => v === 42);
    expect(() => gen(Unspec)).toThrow(/Generation not implemented/);
  });
});

describe("Contract error payload", () => {
  it("captures kind/spec/value/args for invalid arguments", () => {
    fdef("cov.argFail", { args: tuple_(Int) });
    const wrapped = instrument((x) => x, "cov.argFail");
    const err = captureThrown(() => wrapped("not-an-int"));
    expect(err).toBeInstanceOf(ContractError);
    expect(err.kind).toBe("args");
    expect(err.args).toEqual(["not-an-int"]);
    expect(err.value).toEqual(["not-an-int"]);
    expect(err.spec).toBeDefined();
  });

  it("captures kind/result for invalid return values", () => {
    fdef("cov.retFail", { args: tuple_(Int), ret: Str });
    const wrapped = instrument((n) => n * 2, "cov.retFail");
    const err = captureThrown(() => wrapped(2));
    expect(err).toBeInstanceOf(ContractError);
    expect(err.kind).toBe("ret");
    expect(err.result).toBe(4);
    expect(err.value).toBe(4);
    expect(err.args).toEqual([2]);
  });

  it("captures kind/args/result for relational predicate failures", () => {
    fdef("cov.fnFail", {
      args: tuple_(Int, Int),
      ret: Int,
      fn: ([a, b], res) => res === a + b,
    });
    const wrapped = instrument((a, b) => a * b, "cov.fnFail");
    const err = captureThrown(() => wrapped(2, 3));
    expect(err).toBeInstanceOf(ContractError);
    expect(err.kind).toBe("fn");
    expect(err.args).toEqual([2, 3]);
    expect(err.result).toBe(6);
  });
});

describe("Instrumentation options", () => {
  it("invokes a custom onError handler instead of throwing by default", () => {
    const received = [];
    const onError = (error) => received.push(error);
    fdef("cov.onError", { args: tuple_(Int) });
    const wrapped = instrument((x) => x, "cov.onError", { onError });
    const result = wrapped("not-an-int");
    expect(received).toHaveLength(1);
    expect(received[0]).toBeInstanceOf(ContractError);
    expect(result).toBe("not-an-int");
  });

  it("conformReturn replaces the return value with the conformed value", () => {
    const Trimmed = {
      valid: (v) => typeof v === "string",
      conform: (v) => (typeof v === "string" ? v.trim() : "::invalid"),
    };
    fdef("cov.conformReturn", { ret: Trimmed });
    const wrapped = instrument(() => "   spaced   ", "cov.conformReturn", { conformReturn: true });
    expect(wrapped()).toBe("spaced");
  });

  it("disabling instrumentation returns the raw function", () => {
    const raw = () => "raw";
    fdef("cov.disabled", { args: tuple_(Int) });
    const wrapped = instrument(raw, "cov.disabled", { enabled: false });
    expect(wrapped).toBe(raw);
  });

  it("attaches wrapper metadata (raw, contract, instrumentation)", () => {
    fdef("cov.metadata", { args: tuple_(Int), ret: Int });
    const raw = (x) => x;
    const wrapped = instrument(raw, "cov.metadata");
    expect(wrapped.raw).toBe(raw);
    expect(wrapped.contract.name).toBe("cov.metadata");
    expect(wrapped.instrumentation.enabled).toBe(true);
  });

  it("accepts a contract object directly (contract-first wiring)", () => {
    const contract = fdef("cov.direct", { args: tuple_(Int), ret: Int });
    const wrapped = instrument((n) => n + 1, contract);
    expect(wrapped(1)).toBe(2);
    expect(() => wrapped("x")).toThrow(ContractError);
  });
});

describe("Async contract failures", () => {
  it("rejects when async return violates ret spec", async () => {
    fdef("cov.asyncRet", { args: tuple_(), ret: Int });
    const wrapped = instrument(async () => "not-int", "cov.asyncRet");
    await expect(wrapped()).rejects.toThrow(ContractError);
  });

  it("validates args synchronously even for async functions", () => {
    fdef("cov.asyncArgs", { args: tuple_(Int), ret: Int });
    const wrapped = instrument(async (n) => n, "cov.asyncArgs");
    expect(() => wrapped("x")).toThrow(ContractError);
  });
});

describe("Number primitive specs", () => {
  it("Num accepts numbers but not strings", () => {
    expect(isValid(Num, 1.5)).toBe(true);
    expect(isValid(Num, "1")).toBe(false);
  });
});
