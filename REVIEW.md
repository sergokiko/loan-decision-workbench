# Initial review

Complete this file before making implementation changes.

## Critical issues

1. _Your finding and why it matters_

- decide route ahs no check for role, any authenticated can approve or reject appliction
- delete route, anyone can delete appliction, even unauthenticated users. Delete this route, as there is no reqirements for appliction deletion.
- server logger takes only info, but ignore errors
- in decide route in responce return input status not updated status
- in request amount input max set to requestedAmountMinor / 100

## Non-critical improvements

1. _Your finding and expected benefit_

- On decide route catch clock sends INTERNAL_SERVER_ERROR, but in try block there are NOT_FOUND, CONFLICT, BAD_REQUEST. So in logger there will be only INTERNAL_SERVER_ERROR so the original error is never logged.
- In UI, when select(check) some application in the list, and change page, there are checked applications, even if they were not selected.
- The approved amount is not validated as positive in backed
- input not allow to add more than 10000 euros
- Amount input layout is broken

## Implementation plan

1. _Your first step_

- Check all the types
- Look at the routes and identify all vulnerabilities.
- Test UI

## What I will not complete within the timebox

- Dual approval flow (PENDING_CONFIRMATION) - needs enum migration, state machine and UI.
- Decision and audit are two separate writes, not one transaction, and nothing stops two
  underwriters deciding the same application at once.
- Notifier is still not called anywhere.
- Auth is still trusted from headers, role is not checked against the DB

## Production readiness

### Observability

_Metrics, safe logs, traces, and alerts you would add._

- Unfortunately not enought time to look. But I added errors to logger

### Rollout and rollback

_How you would release and reverse this change safely._

### Known limitations

- A decision can still be committed without its audit row if the audit insert fails.
- list returns every application to any session, no pagination or filtering.
