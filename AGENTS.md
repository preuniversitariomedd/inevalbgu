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
