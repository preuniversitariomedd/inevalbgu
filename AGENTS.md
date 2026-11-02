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
- Store group module access and grading weights together; deny-wins across memberships for access, use the selected period/group weights for grading and alphabetical first group when no group is selected, exclude blocked components and proportionally normalize remaining weights when memberships conflict, and enforce graded activity writes with database triggers.
- Generate administrator-only course exports from stably ordered paginated server reads; exclude authentication secrets and private interpersonal conversations, retain all academic records and personal tutor history, and prepare browser files before the download click. Use compact column bands with numbered records in PDFs to retain full detail without a separate vertical form for every record.
- Share standard social metadata through the browser-safe page-meta helper while keeping each content route's own title and description, so page metadata remains consistent.
- Normalize source-controlled question annexes with source-prefixed stable IDs and A–E answer mapping; append them without replacing historical IDs, retain reasoning mastery targets separately from its larger practice pool, and include the expanded Conocimiento bank in its level-based grading.
- Subscribe once per authenticated layout to RLS-scoped group configuration changes and invalidate access and grade queries together; place navigation and coaching inside the access context so disabled module links disappear throughout the student view.
