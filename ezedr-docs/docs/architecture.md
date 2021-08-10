# Architecture

ezEDR is designed around a client/server model where the server acts as a API
proxy in front of a database. The server currently provides a simple REST API
(intended for internal use) with some logic to enforce optimistic concurrency to
the event log. The language specific clients(that are not yet implemented) exist
for two reasons:

1. ease of use,
2. it decouples the client code from the API.

The second bullet is important as the API may eventually be replaced by some
other protocol in the future.

## Client

| Language   | Status |
| :--------- | :----- |
| Javascript | Todo   |
| Java       | Todo   |
| Rust       | Todo   |
| Go         | Todo   |
| Python     | Todo   |

## Server

### Persistance

Events must be stored somewhere and it doesn't make sense to build a new
database from scratch. Instead, the ezEDR is designed to use a plugable backend
for storage. PostgreSQL is used as a storage engine at the time of writing and
there are plans for MongoDB and possibly Redis down the road.
