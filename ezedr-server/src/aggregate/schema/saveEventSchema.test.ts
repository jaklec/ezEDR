import { ObjectSchema } from "fluent-json-schema";
import Ajv from "ajv";
import { saveEventSchema } from "./saveEventSchema";

describe("Create aggregate schema validation", () => {
  function validate(payload: unknown, schema: ObjectSchema) {
    const validator = new Ajv({ allErrors: true }).compile(schema.valueOf());
    return validator(payload);
  }

  test("Minimal payload", () => {
    expect(
      validate(
        {
          event: "SomethingHappened",
          committer: "test-user-123",
        },
        saveEventSchema
      )
    ).toBeTruthy();
  });

  test("reject missing 'event' property", () => {
    expect(validate({ committer: "some-user" }, saveEventSchema)).toBeFalsy();
  });

  test("reject missing 'committer' property", () => {
    expect(validate({ event: "TestExecuted" }, saveEventSchema)).toBeFalsy();
  });

  test("reject additional properties", () => {
    expect(
      validate(
        {
          event: "SomethingHappened",
          committer: "test-user-123",
          foo: "bar",
        },
        saveEventSchema
      )
    ).toBeFalsy();
  });

  test("allow 'data' property", () => {
    expect(
      validate(
        {
          event: "SomethingHappened",
          committer: "test-user-123",
          data: '{"foo": "bar"}',
        },
        saveEventSchema
      )
    ).toBeTruthy();
  });
});
