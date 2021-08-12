import S, { ObjectSchema } from "fluent-json-schema";

export const saveEventSchema: ObjectSchema = S.object()
  .additionalProperties(false)
  .prop("event", S.string())
  .prop("committer")
  .prop("data", S.string())
  .required(["event", "committer"]);
