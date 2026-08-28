# Unlisted diagnostic builds

Not linked from install-watch.html, and not what the model dropdown serves.
Handed out by direct link, to one tester at a time, for one open bug.

`ELEMENT08-descentg1.prg` — Descent G1, 2026-08-28. Identical to the published
build plus one thing: every ACK carries the watch's free heap, so the phone can
ask "is there room for this plan?" before it sends one. It exists because a
Monkey C OOM cannot be caught, so the push that kills the app reports nothing
at all and the reply before it is the only place the number can come from.

When the G1 long-plan bug closes, either fold this into the published build or
delete the folder. Do not leave a stale binary here for someone to find.
