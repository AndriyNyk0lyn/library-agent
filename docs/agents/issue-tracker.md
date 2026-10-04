# Issue tracker: Local Markdown

Issues and specs live in `.scratch/` and should be versioned with the project.

## Conventions

- One feature per directory: `.scratch/<feature>/`.
- Specs: `.scratch/<feature>/spec.md`.
- One ticket per file: `.scratch/<feature>/issues/NN-<slug>.md`, numbered from 01.
- Give every ticket a human-readable title. Refer to tickets by linked title.
- Append comments under `## Comments`; preserve previous discussion.
- Publishing means writing a file here; fetching means reading that file.
- Regular implementation issues use `Status: open | claimed | resolved | closed`.
- Record triage separately as `Triage:` using `triage-labels.md`.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`, with `Labels: wayfinder:map`.
- Children: `.scratch/<effort>/issues/NN-<slug>.md` with `Parent: ../map.md`.
- Each child has `Type: research | prototype | grilling | task` and a matching `Labels: wayfinder:<type>`.
- Record `Status: open | claimed | resolved | closed` and `Assignee:`; an empty assignee means unclaimed.
- Record dependencies as `Blocked by: NN, NN`; an empty value means none.
- A resolved blocker is satisfied. A closed blocker requires an explicit recorded scope decision before dependents can proceed.
- The frontier contains open, unassigned children whose blockers are satisfied; select by ascending number.
- Claim before working: record the assignee and set status to claimed.
- Resolve by appending a dated resolution under `## Comments`, setting status to resolved, and adding a linked one-line gist to the map's Decisions so far.
- The detailed answer lives only in the ticket. Link supporting assets instead of pasting them into the map.
- Close out-of-scope tickets and link them from Out of scope, not Decisions so far.
- Create all tickets before wiring dependencies. Do not list open tickets in the map body; query the child files.

Triage readiness never overrides unresolved dependencies. Assignee names identify a development session, not an application user.
