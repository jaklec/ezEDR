import S, { ObjectSchema } from "fluent-json-schema";

/**
 * Public model used to append an event to an event stream.
 */
export const appendEventSchema: ObjectSchema = S.object()
  .additionalProperties(false)
  .prop("type", S.string())
  .prop("payload", S.string())
  .prop("meta", S.string())
  .prop("tenant", S.string())
  .prop("baseVersion", S.integer())
  .prop("committer", S.string())
  .required(["type", "baseVersion", "committer"]);
