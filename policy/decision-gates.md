# Decision Gates

To prevent automated agents from guessing critical semantic or architectural details, certain changes require explicit owner decision.

## When Decision is Required
- Public contract meaning changes
- Application or contract version policy changes
- JSON Schema dialect changes
- Database ID changes
- Interface surface additions, removals, or semantic changes
- Intentional legacy behavior changes
- Migrations, dual-writes, backfills
- Authentication/authorization model changes
- Privacy, retention, consent policies
- Destructive deletions
- Semantic choices between historical sources
- Mutually incompatible restoration candidate selections
- Source authority priority changes
- Large-scale runtime architecture changes
- Irreversible data transformations

## When Decision is Not Required (Safe within existing policy)
- Local refactoring
- Variable or private helper naming
- Auxiliary test fixture placement
- Error message improvement within policy
- Implementation details within existing dependencies
- Clear bug fixes
- Validator internal restructuring without contract changes

## Decision Request Format
When a decision is needed, the agent must present a request formatted as follows in `docs/reconstruction/decision-requests.md`:

```
Decision ID: 
Context: 
Why owner decision is required: 
Option A: 
  Description: 
  Advantages: 
  Disadvantages: 
  Consequences: 
Option B: 
  Description: 
  Advantages: 
  Disadvantages: 
  Consequences: 
Additional options: 
Recommendation: 
Reason for recommendation: 
Safe work that can continue: 
Blocked work: 
Default if no decision is supplied: 
  No semantic change; remain blocked.
```

## Protocol
- Agents must NOT assume a default semantic change if blocked.
- Present at least two viable options (if available) with pros and cons.
- Partial blocking: only block the specific workstream relying on the decision. Safe independent workstreams should proceed.
- Do not mark blocked items as completed.
