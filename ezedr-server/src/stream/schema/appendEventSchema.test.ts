import { ObjectSchema } from "fluent-json-schema";
import Ajv from "ajv";
import { appendEventSchema } from "./appendEventSchema";

function validate(schema: ObjectSchema, payload: unknown) {
  const validator = new Ajv({ allErrors: true }).compile(schema.valueOf());
  return validator(payload);
}

describe("Append event to stream schema validation", () => {
  test("reject additional properties", () => {
    expect(
      validate(appendEventSchema, {
        foo: "bar",
      })
    ).toBeFalsy();
  });

  const minimalPayload = {
    type: "TEST_PERFORMED",
    payload: '{"foo": "bar"}',
    meta: "json",
    tenant: "default",
    baseVersion: 0,
    committer: "test user",
  };

  test("minimal payload", () => {
    expect(validate(appendEventSchema, minimalPayload)).toBeTruthy();
  });

  test("require type", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, ...withoutType } = minimalPayload;
    expect(validate(appendEventSchema, withoutType)).toBeFalsy();
  });

  test("require baseVersion", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { baseVersion, ...withoutBaseVersion } = minimalPayload;
    expect(validate(appendEventSchema, withoutBaseVersion)).toBeFalsy();
  });

  test("require committer", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { committer, ...withoutCommitter } = minimalPayload;
    expect(validate(appendEventSchema, withoutCommitter)).toBeFalsy();
  });
});
