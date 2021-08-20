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
  test("reject unknown properties", () => {
    expect(validate(createStreamSchema, { foo: "bar" })).toBeFalsy();
  });

  test("accept streamId", () => {
    expect(validate(createStreamSchema, { streamId: "123" })).toBeTruthy();
  });

  test("accept tenant", () => {
    expect(validate(createStreamSchema, { tenant: "tenant-id" })).toBeTruthy();
  });
});
