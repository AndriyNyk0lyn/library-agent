# Choose durable chat continuation and recovery

Parent: ../map.md
Type: grilling
Labels: wayfinder:grilling
Status: open
Assignee:
Triage: needs-info
Blocked by: 02

## Question

Given the SDK's verified history requirements, what minimal persistence and reload behaviour should this app use? Recommended starting direction: user-scoped messages for display, bounded SDK-compatible continuation data for model/tool context, persisted run status and safe events, and no automatic resubmission of uncertain mutations after disconnect.

Select the concrete approach after reading the research. Specify user-visible recovery for completed, failed, and uncertain runs; do not implement queues or let a chosen session adapter bypass user isolation.

## Comments
