import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  sdef,
  isValid,
  conform,
  explain,
  gen,
  tuple_,
  and_,
  or_,
  Str,
  Num,
  Int,
  Any,
  fdef,
  instrument,
  ContractError,
} from "../src/index.js";

describe("Core Spec Operations", () => {
  it("should validate simple predicates", () => {
    const IsPositive = sdef("IsPositive", (n) => n > 0);
    expect(isValid(IsPositive, 1)).toBe(true);
    expect(isValid(IsPositive, 0)).toBe(false);
    expect(isValid(IsPositive, -1)).toBe(false);
  });

  it("should validate classes using instanceof", () => {
    class A {}
    class B extends A {}
    const IsA = sdef("IsA", A);
    expect(isValid(IsA, new A())).toBe(true);
    expect(isValid(IsA, new B())).toBe(true);
    expect(isValid(IsA, {})).toBe(false);
  });

  it("should conform values (default is identity)", () => {
    const IsEven = sdef("IsEven", (n) => n % 2 === 0);
    expect(conform(IsEven, 2)).toBe(2);
    expect(conform(IsEven, 3)).toBe("::invalid");
  });

  it("should explain failures", () => {
    const IsString = sdef("IsString", (v) => typeof v === "string");
    expect(explain(IsString, 123)).toMatch(/failed predicate/);
    expect(explain(IsString, "abc")).toBeNull();
  });

  it("should normalize custom spec objects with omitted helpers", () => {
    const StartsWithA = sdef("StartsWithA", {
      valid: (v) => typeof v === "string" && v.startsWith("A"),
    });

    expect(isValid(StartsWithA, "Alice")).toBe(true);
    expect(conform(StartsWithA, "Alice")).toBe("Alice");
    expect(conform(StartsWithA, "Bob")).toBe("::invalid");
    expect(explain(StartsWithA, "Bob")).toMatch(/StartsWithA/);
  });

  it("should resolve specs by name from registry", () => {
    sdef("MyNamedSpec", (n) => n === 42);
    expect(isValid("MyNamedSpec", 42)).toBe(true);
    expect(isValid("MyNamedSpec", 43)).toBe(false);
  });

  it("should generate built-in values", () => {
    const samples = fc.sample(gen(Int), { seed: 7, numRuns: 10 });
    expect(samples).toHaveLength(10);
    expect(samples.every((value) => Number.isInteger(value))).toBe(true);
  });

  it("should generate filtered values for named composed specs", () => {
    const PositiveInt = sdef("PositiveInt", Int, (n) => n > 0);
    const samples = fc.sample(gen(PositiveInt), { seed: 11, numRuns: 10 });
    expect(samples.every((value) => Number.isInteger(value) && value > 0)).toBe(true);
  });

  it("should support custom generators on spec objects", () => {
    const Token = sdef("Token", {
      valid: (v) => typeof v === "string" && v.startsWith("tok_"),
      gen: () => fc.string({ minLength: 1 }).map((value) => `tok_${value}`),
    });

    const samples = fc.sample(gen(Token), { seed: 17, numRuns: 5 });
    expect(samples.every((value) => value.startsWith("tok_"))).toBe(true);
  });
});

describe("Combinators", () => {
  describe("tuple_", () => {
    it("should validate fixed-length arrays", () => {
      const Point = tuple_(Num, Num);
      expect(isValid(Point, [1, 2])).toBe(true);
      expect(isValid(Point, [1, 2, 3])).toBe(false);
      expect(isValid(Point, [1])).toBe(false);
      expect(isValid(Point, "not-an-array")).toBe(false);
    });

    it("should conform tuple elements", () => {
      const UpperStr = {
        valid: (v) => typeof v === "string",
        conform: (v) => v.toUpperCase(),
        explain: (v) => (typeof v === "string" ? null : "not a string"),
      };
      const T = tuple_(UpperStr, Int);
      expect(conform(T, ["abc", 123])).toEqual(["ABC", 123]);
    });

    it("should generate tuples from constituent specs", () => {
      const Point = tuple_(Int, Int);
      const samples = fc.sample(gen(Point), { seed: 19, numRuns: 5 });
      expect(samples.every((value) => Array.isArray(value) && value.length === 2)).toBe(true);
      expect(samples.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y))).toBe(true);
    });
  });

  describe("and_", () => {
    it("should satisfy all predicates", () => {
      const PositiveInt = and_(Int, (n) => n > 0);
      expect(isValid(PositiveInt, 10)).toBe(true);
      expect(isValid(PositiveInt, -1)).toBe(false);
      expect(isValid(PositiveInt, 1.5)).toBe(false);
    });

    it("should pipe conformed values through the chain", () => {
      const Trim = {
        valid: (v) => typeof v === "string",
        conform: (v) => v.trim(),
        explain: (_) => null,
      };
      const ParseInt = {
        valid: (v) => !isNaN(parseInt(v)),
        conform: (v) => parseInt(v),
        explain: (_) => null,
      };
      const Spec = and_(Trim, ParseInt, Int);
      expect(conform(Spec, "  42  ")).toBe(42);
    });
  });

  describe("or_", () => {
    it("should satisfy any predicate", () => {
      const StrOrNum = or_(Str, Num);
      expect(isValid(StrOrNum, "hi")).toBe(true);
      expect(isValid(StrOrNum, 123)).toBe(true);
      expect(isValid(StrOrNum, true)).toBe(false);
    });

    it("should return first successful conformance", () => {
      const S = or_(Int, Str);
      expect(conform(S, 123)).toBe(123);
      expect(conform(S, "abc")).toBe("abc");
    });

    it("should generate values from any matching branch", () => {
      const StrOrInt = or_(Str, Int);
      const samples = fc.sample(gen(StrOrInt), { seed: 23, numRuns: 10 });
      expect(samples.every((value) => typeof value === "string" || Number.isInteger(value))).toBe(
        true,
      );
    });
  });
});

describe("Function Contracts (fdef/instrument)", () => {
  it("should validate args and return values", () => {
    const add = (a, b) => a + b;
    fdef("add", {
      args: tuple_(Int, Int),
      ret: Int,
    });
    const wAdd = instrument(add, "add");

    expect(wAdd(1, 2)).toBe(3);
    expect(() => wAdd(1.5, 2)).toThrow(ContractError);
    expect(() => wAdd(1, "2")).toThrow(ContractError);
  });

  it("should validate relational constraints (fn)", () => {
    const concat = (a, b) => a + b;
    fdef("concat", {
      args: tuple_(Str, Str),
      ret: Str,
      fn: ([a, b], res) => res === a + b,
    });
    const wConcat = instrument(concat, "concat");
    expect(wConcat("a", "b")).toBe("ab");

    const buggyConcat = (a, b) => a + b + "!";
    const wBuggy = instrument(buggyConcat, "concat");
    expect(() => wBuggy("a", "b")).toThrow(/Relational predicate failed/);
  });

  it("should support conformed arguments and return values", () => {
    const Trim = { valid: (v) => typeof v === "string", conform: (v) => v.trim() };
    const multiply = (s, n) => s.repeat(n);
    fdef("multiply", {
      args: tuple_(Trim, Int),
      ret: Str,
    });

    const wMultiply = instrument(multiply, "multiply", { conformArgs: true });
    expect(wMultiply("  hi  ", 2)).toBe("hihi");
  });

  it("should allow disabling instrumentation", () => {
    const fn = (x) => x;
    fdef("identity", { args: tuple_(Int) });
    const wFn = instrument(fn, "identity", { enabled: false });
    expect(wFn("not-an-int")).toBe("not-an-int"); // No error
  });

  it("should validate async return values after resolution", async () => {
    const fetchCount = async (n) => n + 1;
    fdef("fetchCount", {
      args: tuple_(Int),
      ret: Int,
      fn: ([n], result) => result > n,
    });

    const wrapped = instrument(fetchCount, "fetchCount");
    await expect(wrapped(1)).resolves.toBe(2);
  });

  it("should reject async functions whose resolved value violates the contract", async () => {
    const buggyFetchCount = async () => "2";
    fdef("buggyFetchCount", {
      args: tuple_(),
      ret: Int,
    });

    const wrapped = instrument(buggyFetchCount, "buggyFetchCount");
    await expect(wrapped()).rejects.toThrow(ContractError);
    await expect(wrapped()).rejects.toThrow(/Invalid return value/);
  });

  it("should validate async relational constraints after resolution", async () => {
    const buggyConcat = async (a, b) => `${a}${b}!`;
    fdef("asyncConcat", {
      args: tuple_(Str, Str),
      ret: Str,
      fn: ([a, b], result) => result === a + b,
    });

    const wrapped = instrument(buggyConcat, "asyncConcat");
    await expect(wrapped("a", "b")).rejects.toThrow(/Relational predicate failed/);
  });
});

describe("Property-Based Testing", () => {
  it("and_(Int, Any) is equivalent to Int", () => {
    fc.assert(
      fc.property(fc.anything(), (v) => {
        const spec = and_(Int, Any);
        expect(isValid(spec, v)).toBe(isValid(Int, v));
      }),
    );
  });

  it("or_(Str, Num) validates if value is string or number", () => {
    fc.assert(
      fc.property(fc.anything(), (v) => {
        const spec = or_(Str, Num);
        const expected = typeof v === "string" || typeof v === "number";
        expect(isValid(spec, v)).toBe(expected);
      }),
    );
  });

  it("tuple_ validity depends on all elements", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 2, maxLength: 2 }), (pair) => {
        const T = tuple_(Int, Int);
        expect(isValid(T, pair)).toBe(true);
      }),
    );
  });
});
