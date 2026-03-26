# Learning Domain Contract (`learning-ms`)

## Redis pattern group

- `learning.*`

## Supported commands

- `learning.list`
- `learning.get`
- `learning.set`
- `learning.bulk_get`
- `learning.bulk_set`
- `learning.delete`
- `learning.clear`

Request/response shape is the same structure as `prefs.*`, replacing command prefix.

## Allowed keys

Exact keys:

- `favorites`
- `error_history`
- `traduccion_errors`
- `dictado_level_progress`

Prefix keys:

- `seen_*`
- `activity_results_*`
