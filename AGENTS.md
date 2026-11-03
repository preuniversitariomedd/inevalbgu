<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store group grading periods in `public.periodos_calificacion`; use timestamped answer events for period grades, not cumulative progress timestamps, to preserve lifetime learning progress.
- Centralize period grades in the server-only grading helper so student, staff and exports share the same calculation; use inclusive Guayaquil calendar dates and timestamped heartbeat intervals, excluding legacy boundary-crossing time that cannot be measured accurately.
- Store group module access and the official grading configuration together; deny-wins across memberships, select the period group or alphabetical first group, enforce official weights in the shared grade helper, and exclude blocked components without redistribution so historical custom weights cannot override the official formula.
- Generate administrator-only course exports from stably ordered paginated server reads; exclude authentication secrets and private interpersonal conversations, retain all academic records and personal tutor history, and prepare browser files before the download click. Use compact column bands with numbered records in PDFs to retain full detail without a separate vertical form for every record.
- Share standard social metadata through the browser-safe page-meta helper while keeping each content route's own title and description, so page metadata remains consistent.
- Normalize source-controlled question annexes with source-prefixed stable IDs and A–E answer mapping; append them without replacing historical IDs. Derive reasoning mastery targets from the full per-level bank, keeping legacy generator sizes separate to preserve IDs; share unique valid-answer counting between progression and grades.
- Subscribe once per authenticated layout to RLS-scoped group configuration changes and invalidate access and grade queries together; place navigation and coaching inside the access context so disabled module links disappear throughout the student view.
- Centralize query refresh policies and share student grade/progress keys between progress and coaching; refresh on successful academic completion rather than frequent polling to reduce duplicate reads.
- Academic resets require an immutable administrator-only database snapshot, synchronous prepared-file download, two-step confirmation and transactional exact-snapshot comparison; refuse active students or changed data to prevent deleting unbacked activity. Stage the pending SQL in src/lib/migrations/reinicio-academico.sql when Cloud is paused and apply it before enabling resets.
- Aggregate generation tokens and user/generation-scoped device caches prevent stale pre-reset progress from repopulating reset accounts; legacy device-only Systems progress cannot be included in server backups.
- Exam anti-fraud counters and closure live in database RPCs (evaluacion_intentos/violations) called via server functions, so reloading cannot reset infractions; browser listeners only report events.
