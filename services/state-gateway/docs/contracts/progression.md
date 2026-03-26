# Progression Domain Contract (`progression-ms`)

## Redis pattern group

- `progression.*`

## Supported commands

- `progression.list`
- `progression.get`
- `progression.set`
- `progression.bulk_get`
- `progression.bulk_set`
- `progression.delete`
- `progression.clear`

Request/response shape is the same structure as `prefs.*`, replacing command prefix.

## Allowed keys

- `streak_data`
- `achievements`
- `srs_data`
- `daily_challenge`
- `daily_challenge_history`
