# Decision Requests

## Active Requests

Active Requests: None

## Resolved Requests

Decision ID:
  SP-UNKNOWN-PROPERTIES-001

Resolution:
  Option A

Decision:
  All source packet core objects are closed with
  additionalProperties: false.

Consequence:
  Unknown properties and likely field-name typos are rejected.

Future extension:
  Requires a separate owner decision.

## Deferred Requests

Decision ID:
  SP-CASE-COLLISION-001

Context:
  sourcePath、payloadPath、intendedDestinationについて、
  大文字小文字だけが異なるpathを同一とみなすか。

Status:
  Deferred until an actual source packet or target filesystem
  requires a decision.

Default while deferred:
  Exact-string uniqueness only.
  Do not claim case-insensitive collision protection.
