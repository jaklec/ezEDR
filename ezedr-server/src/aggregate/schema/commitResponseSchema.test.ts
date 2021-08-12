import Ajv from "ajv";
import { ObjectSchema } from "fluent-json-schema";
import { commitResponseSchema } from "./commitResponseSchema";

describe("Commit Response Schema Validation", () => {
  function validate(payload: unknown, schema: ObjectSchema) {
    const validator = new Ajv({ allErrors: true }).compile(schema.valueOf());
    return validator(payload);
  }

  test("minimal response", () => {
    expect(
      validate(
        {
          aggregateId: "123",
          version: 0,
        },
        commitResponseSchema
      )
    ).toBeTruthy();
  });

  test("reject missing aggregateId", () => {
    expect(validate({ version: 0 }, commitResponseSchema)).toBeFalsy();
  });

  test("reject missing version", () => {
    expect(validate({ aggregateId: "123" }, commitResponseSchema)).toBeFalsy();
  });

  test("version must be integer number", () => {
    expect(
      validate({ aggregateId: "123", version: 1.2 }, commitResponseSchema)
    ).toBeFalsy();
  });

  test("reject additional properties", () => {
    expect(
      validate(
        {
          aggregateId: "123",
          version: 1,
          foo: "bar",
        },
        commitResponseSchema
      )
    ).toBeFalsy();
  });

  test("accept timestamp", () => {
    expect(
      validate(
        {
          aggregateId: "123",
          version: 2,
          timestamp: Date.now(),
        },
        commitResponseSchema
      )
    ).toBeTruthy();
  });
});
