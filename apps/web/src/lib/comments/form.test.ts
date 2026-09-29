import { describe, expect, it } from "vitest";
import { field, parseId, parseUserId } from "./form";

describe("field", () => {
  it("reads text fields, and nothing else", () => {
    const form = new FormData();
    form.set("body", "hello");
    form.set("upload", new Blob(["x"]), "x.txt");
    expect(field(form, "body")).toBe("hello");
    expect(field(form, "upload")).toBe("");
    expect(field(form, "missing")).toBe("");
  });
});

describe("parseId", () => {
  it("accepts positive whole numbers that fit the database", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("42")).toBe(42);
    expect(parseId("2147483647")).toBe(2147483647);
  });

  it.each(["", "0", "-1", "01", "1.5", "1e3", " 7", "abc", "2147483648"])(
    "refuses %j",
    (value) => {
      expect(parseId(value)).toBeNull();
    },
  );
});

describe("parseUserId", () => {
  it("accepts UUIDs only", () => {
    expect(parseUserId("0F8FAD5B-D9CB-469F-A165-70867728950E")).toBe(
      "0f8fad5b-d9cb-469f-a165-70867728950e",
    );
    expect(parseUserId("1")).toBeNull();
    expect(parseUserId("0f8fad5b-d9cb-469f-a165-70867728950e'--")).toBeNull();
  });
});
