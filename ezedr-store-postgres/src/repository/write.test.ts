import { Instruction } from ".";
import { Client } from "./postgres-repository";
import { write } from "./write";

test("Reject versions out of bound (less than zero)", async () => {
  expect.assertions(1);

  const mockClient: Client = {
    query: jest.fn(),
  };

  const instruction: Instruction<string> = {
    aggregateId: "123",
    event: "test-event",
    version: -1,
    committer: "test-committer",
    data: "test",
  };

  await expect(write(mockClient, instruction)).rejects.toThrow(
    new Error("Invalid version - numbers less than zero are not allowed.")
  );
});
