# Initial review

Complete this file before making implementation changes.

## Critical issues

1. _Your finding and why it matters_

- decide route ahs no check for role, any authenticated can approve or reject appliction
- delete route, anyone can delete appliction, even unauthenticated users. Delete this route, as there is no reqirements for appliction deletion.
- server logger takes only info, but ignore errors

## Non-critical improvements

1. _Your finding and expected benefit_

- On decide route catch clock sends INTERNAL_SERVER_ERROR, but in try block there are NOT_FOUND, CONFLICT, BAD_REQUEST. So in logger there will be only INTERNAL_SERVER_ERROR so the original error is never logged.
- In UI, when select(check) some application in the list, and change page, there are checked applications, even if they were not selected.
- The approved amount is not validated as positive

## Implementation plan

1. _Your first step_

-

## What I will not complete within the timebox

1. _Deferred work and why_

## Production readiness

### Observability

_Metrics, safe logs, traces, and alerts you would add._

### Rollout and rollback

_How you would release and reverse this change safely._

### Known limitations

_Remaining risks or assumptions._
