import { describe, it, expect } from "vitest";
import {
  fdef,
  sdef,
  tuple_,
  and_,
  or_,
  NonEmptyStr,
  instrument,
  ContractError,
} from "../src/index.js";

describe("ljspec worked example", () => {
  class Order {
    constructor(id, status) {
      this.id = id;
      this.status = status;
    }
  }

  fdef("cancelOrder", {
    args: tuple_(
      sdef("cancellable-order", Order, (o) => o.status !== "shipped" && o.status !== "cancelled"),
      NonEmptyStr,
    ),
    ret: sdef("cancelled-order", Order, (o) => o.status === "cancelled"),
    fn: ([order, reason], result) => result.id === order.id && result.cancelReason === reason,
  });

  function cancelOrder(order, reason) {
    const res = new Order(order.id, "cancelled");
    res.cancelReason = reason;
    return res;
  }

  const wrappedCancel = instrument(cancelOrder, "cancelOrder");

  it("should pass for valid input", () => {
    const order = new Order(1, "pending");
    const result = wrappedCancel(order, "No longer needed");
    expect(result.status).toBe("cancelled");
    expect(result.cancelReason).toBe("No longer needed");
    expect(result).toBeInstanceOf(Order);
  });

  it("should throw for invalid arguments (status)", () => {
    const order = new Order(2, "shipped");
    expect(() => wrappedCancel(order, "Change mind")).toThrow(ContractError);
    expect(() => wrappedCancel(order, "Change mind")).toThrow(/Invalid arguments/);
  });

  it("should throw for invalid arguments (reason)", () => {
    const order = new Order(3, "pending");
    expect(() => wrappedCancel(order, "")).toThrow(ContractError);
  });

  it("should throw if relational predicate fails", () => {
    // A buggy implementation that changes id
    function buggyCancelOrder(order, reason) {
      const res = new Order(999, "cancelled"); // Wrong ID
      res.cancelReason = reason;
      return res;
    }
    const wrappedBuggy = instrument(buggyCancelOrder, "cancelOrder");
    const order = new Order(4, "pending");
    expect(() => wrappedBuggy(order, "Wait")).toThrow(ContractError);
    expect(() => wrappedBuggy(order, "Wait")).toThrow(/Relational predicate failed/);
  });
});

describe("core specs", () => {
  it("should support simple predicates", () => {
    const IsEven = sdef("IsEven", (n) => n % 2 === 0);
    expect(IsEven.valid(2)).toBe(true);
    expect(IsEven.valid(3)).toBe(false);
  });

  it("should support class-based sdef", () => {
    class Person {}
    const IsPerson = sdef("IsPerson", Person);
    expect(IsPerson.valid(new Person())).toBe(true);
    expect(IsPerson.valid({})).toBe(false);
  });

  it("should support and_ combinator", () => {
    const PositiveInt = and_("Int", (n) => n > 0);
    expect(PositiveInt.valid(10)).toBe(true);
    expect(PositiveInt.valid(-1)).toBe(false);
    expect(PositiveInt.valid(10.5)).toBe(false);
  });

  it("should support or_ combinator", () => {
    const StrOrInt = or_("Str", "Int");
    expect(StrOrInt.valid("hello")).toBe(true);
    expect(StrOrInt.valid(123)).toBe(true);
    expect(StrOrInt.valid(true)).toBe(false);
  });
});
