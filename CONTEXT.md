# Reading Companion

A personal reading library and planner. These terms describe the domain; technical architecture lives in the engineering guide.

## Language

**Library book**: A reader's record of a book, including their status, rating, notes, and optional edition details. Multiple readers may have separate records for the same title.
_Avoid_: Catalog book when referring to a reader's personal record.

**Catalog candidate**: An external catalog result that may describe a book or edition. It is not part of a reader's library until deliberately added.
_Avoid_: Library book for a search result that has not been saved.

**Reading status**: A library book's current state: want to read, reading, finished, or dropped.
_Avoid_: Ownership as a synonym for reading status.

**Ownership**: Whether the reader is known to own a book. Unknown ownership is distinct from both owned and not owned.
_Avoid_: Assuming every want-to-read book is owned.

**Personal rating**: A reader's assessment, from half a star to five stars in half-star steps. Unrated is absent, not zero stars.
_Avoid_: Average rating for the reader's assessment.

**Reader preference**: An explicitly entered or confirmed lasting preference. A temporary request or one book reaction does not automatically become a lasting preference.
_Avoid_: Permanent preference for an inferred reaction.

**Recommendation**: A next-read suggestion with reasons and uncertainty, grounded in eligible books and the reader's preferences and history. Receiving a recommendation does not create a plan.
_Avoid_: Reading plan for a suggestion alone.

**Reading plan**: A saved schedule for one library book, based on remaining pages, dates, and declared constraints. It includes calculated targets and assumptions.
_Avoid_: Guaranteed completion for a proposed schedule.

**Import**: A deliberate ingestion of a Goodreads CSV snapshot with preview and a result summary.
_Avoid_: Sync for a one-time CSV import.

**Conversation**: A saved reader-owned chat with its own display history and bounded recent model context. Explicit reader preferences, library records and saved plans remain shared.
_Avoid_: Assuming every displayed past message is available to the model.
