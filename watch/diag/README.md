# Unlisted diagnostic builds

Not linked from install-watch.html, and not what the model dropdown serves.
Handed out by direct link, to one tester at a time, for one open bug.

`ELEMENT08-descentg1.prg` — Descent G1, 2026-08-30, built from element08-watch
`0d97645`. **Per-key plan storage was REVERTED out of this binary on 2026-08-30**
after it measured worse on the watch, not better: idle free heap 9.5k against
12.2k, and 2.6k after a 20-block push against 5.7k. 2.6k is below the save
floor, so a session on that build risks dying in saveAndEnd and taking the
session with it, which is what happened. See
`Deeptimerapp/appstore/g1-long-plan-investigation.md` §3g.

What this binary carries:
- **Free heap on every ACK**, so the phone can ask how much room there is
  before it sends anything.
- **No full-plan read to draw a label.** App start and the Home menu used to
  deserialize the whole plan to render one sublabel.
- **The ACK goes out before the UI work**, so a failure decorating the screen
  is no longer indistinguishable from a store that never happened.
- **FIT label fields trimmed**, which stops a long session crashing at save.

Measured on the tester's watch: this generation carries a 20-block plan and
leaves 5.7k free. The ceiling above that is still open.

When the G1 long-plan bug closes, either fold this into the published build or
delete the folder. Do not leave a stale binary here for someone to find.
