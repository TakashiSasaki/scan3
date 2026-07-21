# Stride 1 Correction and Closeout

## Overview
- **Application Version**: `3.0.0-alpha.1`
- **Contract Versions**: `0.1.0 draft`
- **Package Manager**: npm (Node.js 22 target environment)
- **Agent Policy Status**: Adoption pending (`uvx`/Python toolchain not available in AI Studio workspace)

## Verification Run
**Command Executed**: `npm run verify:foundation`

**Sub-commands and Results**:
- `npm run typecheck`: SUCCESS
- `npm run contracts:validate`: SUCCESS
- `npm run build`: SUCCESS

## Essential Routes
The following required surface routes are preserved and functional in `App.tsx`:
- `/` (PublicSurface)
- `/app` (AppSurface)
- `/app/legacy` (LegacySurface)
- `/admin` (AdminSurface)
- `/dev` (DevSurface)
- `/dev/schema` (SchemaWorkbenchSurface)
- `/api` (ApiSurface)
- `/test` (TestSurface)
- `/demo` (DemoSurface)

## Firebase Status
- **Firebase Runtime**: Not implemented. There is no Firebase SDK, connection, Authentication, or runtime present in this build.

## Intentional Non-Goals (Stride 1 Boundaries)
- No restoration of legacy application code.
- No restoration of interactive demo code.
- No EFP schema/semantics definitions beyond skeleton contracts.
- No Firebase SDK additions, connections, or security rules.
- No Google GenAI APIs or AI capabilities.
- No server/Express setup.
- No cross-database logic, dual-writes, migrations, or reconciliation mechanisms.
- No external CSS framework (e.g. Tailwind) additions.

## Open Questions Remaining
- 旧アプリの正確な復元基準commit
- 旧アプリのFirebase Web App設定
- Hosting site / target
- Associationの時間意味論
- FactからFactへの参照を許すか
- Provenanceの最終構造
- Marker canonical identity
- Measurementの汎用value表現
- Projectionを初期active contractに含めるか
- Firestore bindingの設計
- JSON Schema dialectの最終確定
- 新アプリruntimeの開始条件
- agent-policy managed adoption pending (uvx/Python unavailable in AI Studio workspace)
