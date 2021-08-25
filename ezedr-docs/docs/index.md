# ezEDR

**ezEDR is a drop in solution for quickly getting started with event sourcing.**

The source code of this project can be found
[here](https://github.com/jaklec/ezEDR).

## Why ezEDR?

Event sourcing is a design pattern where the application state is stored as a
series of events in an _append only_ log, rather than in a mutable store as it
is done in other models such as regular CRUD applications. This has a few
benefits over the traditional approach.

When the system is designed right, almost no logic is taking place before any
event is written to the log. The log is the _source of truth_ and the state is
calculated from this source _after_ it has been persisted.

This means that

- the state of the system, and it's history, is very transparent. It is easy to
  understand why some aggregate has reached a particular state. The system
  becomes easy to debug!
- we can replay all events to rebuild the current state. This means that we can
  add new business logic to historical events. We can even correct bugs and
  replay the entire system. The system becomes more future proof and even has
  some self healing aspects.
- we get audit logging for free!
- business logic tends to end up in the service layer rather than in the
  database layer. The business logic, which probably is your most important
  code, ends up in our version control where it should be. Testing important
  logic thereby becomes a lot easier and (arguably) more fun to code!

There are however some drawbacks as well. In particular, setting up event
sourced systems can be difficult, often requires more upfront design decisions
in the beginning and the time to "get something working" may be significantly
longer that with other approaches. **This is what ezEDR is trying to solve!**

## How it works

ezEDR is an event store for aggregates. Events are stored in _streams_ and stored
with `Version` number. The version number represents a sequence number for that
particular stream - or a _version of the aggregate_ i you like. The system will
guarantee that no event is appended to the stream based on an outdated version of
that aggregate.
