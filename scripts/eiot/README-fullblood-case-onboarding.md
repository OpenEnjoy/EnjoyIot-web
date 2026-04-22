# Fullblood Thing Model Case Onboarding

This guide helps other developers quickly reuse the full chain case for the upgraded thing model:
- Full `property` type coverage (including 3-level nested `object/array`)
- Full `service` input + reply coverage
- Full `event` payload coverage
- Rule engine listener/filter hit + action downlink

## 1. Reusable Case IDs

- Product Key: `AUTO_FULLBLOOD_1776864322701`
- Device ID: `2046943447600881664`
- Device Name (DN): `AUTO-FULLBLOOD-DN-1776864322701`
- Full-model Rule ID: `34`
- Action Rule ID: `36`

Rule `36` behavior:
- Listener: `property/report`
- Filter sample: `p_bool == 1`
- Action: downlink `thing.service.set` (`p_text` + `p_bool`)

## 2. Recreate a Fresh Case (Recommended)

If you do not want to reuse existing IDs, create a new product/device/rule set:

```powershell
cd D:\aiLocal\enjoy-web
node .\scripts\eiot\fullblood-recreate-and-verify.js
```

The script returns new `productKey/deviceId/ruleId` and runs end-to-end validation.

## 3. Keep Device Online and Accept Downlink

```powershell
cd D:\aiLocal\enjoy-web
node .\scripts\eiot\mqtt-keepalive-client.js AUTO_FULLBLOOD_1776864322701 AUTO-FULLBLOOD-DN-1776864322701 M20 D:\aiLocal\enjoy-web\mqtt-device-keepalive-m20.log
```

Expected log keywords:
- `HEARTBEAT_SENT`
- `DOWNLINK topic=.../c/service/set`
- `SERVICE_REPLY_SENT service=set`

## 4. SQL Extraction for Team Reuse

### 4.1 MySQL (Definition Layer)

File:
- `scripts/eiot/fullblood-case-mysql-extract.sql`

Covers:
- `eiot_product`
- `eiot_thing_model`
- `eiot_device_info`
- `eiot_rule_info`

### 4.3 MySQL Seed INSERT (New Environment Bootstrap)

File:
- `scripts/eiot/fullblood-case-seed-insert.sql`

Purpose:
- Directly seed one fullblood case in a clean/new environment.
- Includes: 1 product + 1 thing-model + 1 device + 2 rules (full-match + action).
- Script is idempotent for this seed key (delete old seed rows, then insert).

After import, seeded identifiers are:
- Product Key: `AUTO_FULLBLOOD_SEED_V1`
- Device DN: `AUTO-FULLBLOOD-SEED-DN-V1`
- Rule Names:
- `AUTO_FULLBLOOD_RULE_SEED_V1`
- `AUTO_ACTION_RULE_SEED_V1`

### 4.2 TDengine (Evidence Layer)

File:
- `scripts/eiot/fullblood-case-tdengine-extract.sql`

Covers:
- `thing_model_message` (`property/event/service`)
- `rule_log` (`executed_action` + `success=true`)

## 5. Closure Criteria

The chain is considered closed when all checks pass:

1. `getDeviceWithProperty` shows nested `object/array` values written correctly.
2. `thing_model_message` contains `property + event + service` message types.
3. `rule_log` contains `state=executed_action` and `success=true`.
4. Device log contains both `DOWNLINK ... /c/service/set` and `SERVICE_REPLY_SENT`.

## 6. Notes

- Bool is normalized as `0/1` for storage and rule input.
- If you see `true/false`, that is usually message-layer display, not rule input format.
- `date` is `yyyy-MM-dd`; `datetime` is `yyyy-MM-dd HH:mm:ss`.
- If the device is offline, start keepalive first, then run service/rule tests.

## 7. New Environment Replay Steps

1. Import SQL seed:
```sql
source D:/aiLocal/enjoy-web/scripts/eiot/fullblood-case-seed-insert.sql
```

2. Start keepalive client with seeded PK/DN:
```powershell
cd D:\aiLocal\enjoy-web
node .\scripts\eiot\mqtt-keepalive-client.js AUTO_FULLBLOOD_SEED_V1 AUTO-FULLBLOOD-SEED-DN-V1 M30 D:\aiLocal\enjoy-web\mqtt-device-keepalive-seed.log
```

3. In UI/API:
- Open product thing model and verify all data structures exist.
- Open rule engine and verify both rules exist and enabled.
- Send `property/report` containing `p_bool=1` and complex object/array fields.
- Confirm action downlink (`thing.service.set`) is received by device log.
