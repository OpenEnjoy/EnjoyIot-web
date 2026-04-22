-- Fullblood thing-model case extraction (MySQL)
-- Case baseline:
-- product_key = AUTO_FULLBLOOD_1776864322701
-- device_id   = 2046943447600881664
-- rule_id_full_model = 34
-- rule_id_action     = 36

SET @tenant_id = 1;
SET @product_key = 'AUTO_FULLBLOOD_1776864322701';
SET @device_id = '2046943447600881664';
SET @rule_id_full_model = 34;
SET @rule_id_action = 36;

-- 1) Product definition
SELECT
  id,
  tenant_id,
  name,
  category_id,
  product_key,
  protocol_code,
  node_type,
  keep_alive_time,
  transparent,
  status,
  create_time,
  update_time
FROM eiot_product
WHERE tenant_id = @tenant_id
  AND deleted = 0
  AND product_key = @product_key;

-- 2) Thing model JSON (includes properties/services/events)
SELECT
  id,
  tenant_id,
  product_key,
  model,
  create_time,
  update_time
FROM eiot_thing_model
WHERE tenant_id = @tenant_id
  AND deleted = 0
  AND product_key = @product_key;

-- 3) Device record
SELECT
  id,
  tenant_id,
  product_key,
  dn,
  name,
  model,
  state,
  online_time,
  offline_time,
  properties,
  create_time,
  update_time
FROM eiot_device_info
WHERE tenant_id = @tenant_id
  AND deleted = 0
  AND id = CAST(@device_id AS UNSIGNED);

-- 4) Rules (full-model match + action trigger)
SELECT
  id,
  tenant_id,
  name,
  typ,
  state,
  listeners,
  filters,
  actions,
  trigger_options,
  create_time,
  update_time
FROM eiot_rule_info
WHERE tenant_id = @tenant_id
  AND deleted = 0
  AND id IN (@rule_id_full_model, @rule_id_action)
ORDER BY id;

