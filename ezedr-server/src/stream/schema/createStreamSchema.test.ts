import assert from "assert";
import { ObjectSchema } from "fluent-json-schema";
import Ajv from "ajv";
import { createStreamSchema } from "./createStreamSchema";

function validate(schema: ObjectSchema, payload: unknown) {
  const validator = new Ajv({
    allErrors: true,
    removeAdditional: false,
    useDefaults: true,
    coerceTypes: true,
  }).compile(schema.valueOf());
  return validator(payload);
}

describe("Create new stream schema validation", () => {
  it("should reject unknown properties", () => {
    assert.strictEqual(false, validate(createStreamSchema, { foo: "bar" }));
  });

  it("should accept streamId", () => {
    assert.ok(validate(createStreamSchema, { streamId: "123" }));
  });

  it("should accept tenant", () => {
    assert.ok(validate(createStreamSchema, { tenant: "tenant-id" }));
  });
});
