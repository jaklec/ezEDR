import assert from "assert";
import { ObjectSchema } from "fluent-json-schema";
import Ajv from "ajv";
import { appendEventSchema } from "./appendEventSchema";

function validate(schema: ObjectSchema, payload: unknown) {
  const validator = new Ajv({ allErrors: true }).compile(schema.valueOf());
  return validator(payload);
}

describe("Append event to stream schema validation", () => {
  it("should reject additional properties", () => {
    assert.strictEqual(
      false,
      validate(appendEventSchema, {
        foo: "bar",
      })
    );
  });

  const minimalPayload = {
    type: "TEST_PERFORMED",
    payload: '{"foo": "bar"}',
    meta: "json",
    tenant: "default",
    baseVersion: 0,
    committer: "test user",
  };

  it("should validate minimal payload", () => {
    assert.ok(validate(appendEventSchema, minimalPayload));
  });

  it("should require type", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, ...withoutType } = minimalPayload;
    assert.strictEqual(false, validate(appendEventSchema, withoutType));
  });

  it("should require baseVersion", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { baseVersion, ...withoutBaseVersion } = minimalPayload;
    assert.strictEqual(false, validate(appendEventSchema, withoutBaseVersion));
  });

  it("should require committer", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { committer, ...withoutCommitter } = minimalPayload;
    assert.strictEqual(false, validate(appendEventSchema, withoutCommitter));
  });
});
