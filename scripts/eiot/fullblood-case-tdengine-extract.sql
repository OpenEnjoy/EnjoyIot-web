-- Fullblood thing-model case extraction (TDengine)
-- Default DB in project is "eiot" (see spring.td-datasource.db).

USE eiot;

-- Case baseline:
-- product_key = AUTO_FULLBLOOD_1776864322701
-- device_id   = 2046943447600881664
-- rule_id_action = 36

-- 1) Device message timeline: property/event/service_reply
SELECT
  tbname,
  time,
  device_id,
  type,
  identifier,
  code,
  data
FROM thing_model_message
WHERE device_id = '2046943447600881664'
ORDER BY time DESC
LIMIT 200;

-- 2) Rule action execution logs (must hit "executed_action")
SELECT
  tbname,
  time,
  rule_id,
  state1 AS state,
  success,
  content
FROM rule_log
WHERE rule_id = '36'
ORDER BY time DESC
LIMIT 200;

-- 3) Quick checks by type
SELECT
  type,
  COUNT(*) AS cnt
FROM thing_model_message
WHERE device_id = '2046943447600881664'
GROUP BY type;

-- 4) Service-reply only
SELECT
  time,
  identifier,
  code,
  data
FROM thing_model_message
WHERE device_id = '2046943447600881664'
  AND type = 'service'
ORDER BY time DESC
LIMIT 100;

