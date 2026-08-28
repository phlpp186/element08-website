# Unlisted diagnostic builds

Not linked from install-watch.html, and not what the model dropdown serves.
Handed out by direct link, to one tester at a time, for one open bug.

`ELEMENT08-descentg1.prg` — Descent G1, 2026-08-28, built from element08-watch
`5c89608`. Three changes over the published build:

- **Per-key plan storage.** A plan's blocks live in fixed-size parts under
  their own Storage keys and are paged in one part at a time, so nothing ever
  holds a whole plan. This is what removes the ceiling: 40 blocks used to kill
  the app outright from a 12.2 KB start.
- **Free heap on every ACK**, so the phone can ask how much room there is
  before it sends anything, and can stop capping plans for a watch that no
  longer needs capping.
- **FIT label fields trimmed**, which stops a long session crashing at save.

Verified in the Connect IQ simulator on a G1 memory profile: 29 assertions,
free heap flat at ~9.5k from the first message to the tenth whether the plan is
40 blocks or 78. See `element08-watch/tools/plan-store-selfcheck.md`.

**A session has never been RUN on this build.** Storage, reading and the
runner's acceptance of a plan are proven; blocks advancing, timers and cues are
not. A part-boundary bug would show first at block 8.

When the G1 long-plan bug closes, either fold this into the published build or
delete the folder. Do not leave a stale binary here for someone to find.
