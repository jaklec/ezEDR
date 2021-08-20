import S from "fluent-json-schema";

/**
 * The schema that represents the public model for creating a new stream.
 */
export const createStreamSchema = S.object()
  .additionalProperties(false)
  .prop("streamId", S.string())
  .prop("tenant", S.string());
