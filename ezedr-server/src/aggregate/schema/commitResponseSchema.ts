import S, { ObjectSchema } from "fluent-json-schema";

export const commitResponseSchema: ObjectSchema = S.object()
  .additionalProperties(false)
  .prop("aggregateId", S.string())
  .prop("version", S.integer())
  .prop("timestamp", S.integer())
  .required(["aggregateId", "version"]);
