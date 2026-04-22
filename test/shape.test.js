import { describe, expect, it } from "vitest";

import {
  conform,
  explain,
  ContractError,
  fdef,
  instrument,
  Int,
  Str,
  shape_,
  tuple_,
} from "../src/index.js";

describe("shape_", () => {
  it("validates object fields compositionally", () => {
    const Snapshot = shape_({ hash: Str, wordCount: Int });

    expect(Snapshot.valid({ hash: "abc", wordCount: 1 })).toBe(true);
    expect(Snapshot.valid({ hash: "abc", wordCount: "1" })).toBe(false);
    expect(Snapshot.explain({ hash: "abc", wordCount: "1" })).toContain("At key wordCount");
  });

  it("works in function contracts", () => {
    const Result = shape_({ hash: Str, wordCount: Int });

    fdef("shape.test.build", {
      args: tuple_(Str, Int),
      ret: Result,
    });

    const build = instrument(function build(hash, wordCount) {
      return { hash, wordCount };
    }, "shape.test.build");

    expect(build("abc", 1)).toEqual({ hash: "abc", wordCount: 1 });
    expect(() =>
      instrument(
        function broken() {
          return { hash: "abc", wordCount: "1" };
        },
        {
          name: "shape.test.broken",
          args: tuple_(),
          ret: Result,
        },
      )(),
    ).toThrow(ContractError);
  });

  it("explains and conforms field-level failures", () => {
    const Snapshot = shape_({ hash: Str, wordCount: Int });

    expect(explain(Snapshot, { hash: "abc", wordCount: "1" })).toContain("At key wordCount");
    expect(conform(Snapshot, { hash: "abc", wordCount: "1" })).toBe("::invalid");
  });
});
