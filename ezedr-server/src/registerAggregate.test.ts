import { CommitResponse, Repository } from "@jaklec/ezedr-core";
import { registerAggregate } from "./registerAggregate";

describe("Register a new aggregate", () => {
  const repo = (response: CommitResponse): Repository => ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    save: (_) => Promise.resolve(response),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readAggregate: (_) => Promise.reject(new Error("Not implemented")),
  });

  const idGenerator = () => "abc";

  test("save instruction to repository", async () => {
    const expectedResponse = {
      aggregateId: "123",
      currentVersion: 0,
      timestamp: 1626894732011,
    };

    const response = await registerAggregate(
      {
        aggregateId: "123",
        committer: "test user",
        event: "New aggregate created",
        data: "foo bar",
      },
      { repository: repo(expectedResponse), idGenerator }
    );

    expect(response).toEqual(expectedResponse);
  });

  test("generate new id if missing", async () => {
    const expectedResponse = {
      aggregateId: "abc",
      currentVersion: 0,
      timestamp: 1626894732011,
    };

    const response = await registerAggregate(
      {
        committer: "test user",
        event: "New aggregate created",
        data: "foo bar",
      },
      { repository: repo(expectedResponse), idGenerator }
    );

    expect(response).toEqual(expectedResponse);
  });
});
