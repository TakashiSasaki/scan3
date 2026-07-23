# Decision Requests

## Active Requests

Decision ID:
  LEGACY-FIREBASE-READ-001

Status:
  OPEN

Question:
  Should scan3 connect /app/legacy read-only item lookup to the production legacy Firebase project used by photos.moukaeritai.work?

Options:
  A. Owner承認後、production legacy Firebaseへread-only接続
  B. staging projectまたはFirebase emulatorを先に使用
  C. production providerを未設定のまま維持

Recommendation:
  staging/emulatorが利用可能ならB。
  それ以外は、正確なFirebase configurationとauthentication modelをownerが承認するまでAを開始しない。

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
