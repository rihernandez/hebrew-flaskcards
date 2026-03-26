# Preferences Domain Contract (`preferences-ms`)

## Redis pattern group

- `prefs.*`

## Supported commands

### `prefs.list`
Request:

```json
{ "userId": "<jwt.sub>" }
```

Response:

```json
[
  { "key": "darkMode", "value": true, "updatedAt": "2026-03-26T00:00:00.000Z" }
]
```

### `prefs.get`
Request:

```json
{ "userId": "<jwt.sub>", "key": "darkMode" }
```

Response:

```json
{ "key": "darkMode", "value": true }
```

### `prefs.set`
Request:

```json
{ "userId": "<jwt.sub>", "key": "darkMode", "value": true }
```

Response:

```json
{ "ok": true }
```

### `prefs.bulk_get`
Request:

```json
{ "userId": "<jwt.sub>", "keys": ["darkMode", "selected_language"] }
```

Response:

```json
{ "darkMode": true, "selected_language": "Hebreo" }
```

### `prefs.bulk_set`
Request:

```json
{
  "userId": "<jwt.sub>",
  "entries": [
    { "key": "darkMode", "value": true },
    { "key": "selected_language", "value": "Hebreo" }
  ]
}
```

Response:

```json
{ "ok": true, "count": 2 }
```

### `prefs.delete`
Request:

```json
{ "userId": "<jwt.sub>", "key": "darkMode" }
```

Response:

```json
{ "ok": true }
```

### `prefs.clear`
Request:

```json
{ "userId": "<jwt.sub>" }
```

Response:

```json
{ "ok": true, "deleted": 3 }
```

## Allowed keys

- `darkMode`
- `selected_language`
- `wod_seen`
- `wod_date`
- `wod_id`
