/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');

const nowMs = () => Date.now();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cfg = {
  baseUrl: process.env.EIOT_BASE_URL || 'http://localhost:48080/admin-api',
  tenantId: process.env.EIOT_TENANT_ID || '1',
  username: process.env.EIOT_USERNAME || 'admin',
  password: process.env.EIOT_PASSWORD || 'admin123',
  mqttUrl: process.env.EIOT_MQTT_URL || 'mqtt://127.0.0.1:18831',
  mqttModel: process.env.EIOT_MQTT_MODEL || 'M1',
  testdata: process.env.EIOT_TESTDATA || path.resolve(__dirname, 'fullblood-all-types-testdata.json')
};

const report = {
  startedAt: new Date().toISOString(),
  config: {
    baseUrl: cfg.baseUrl,
    tenantId: cfg.tenantId,
    mqttUrl: cfg.mqttUrl,
    testdata: cfg.testdata
  },
  steps: [],
  summary: { pass: false, failures: [] }
};

function addStep(name, pass, details = {}) {
  report.steps.push({ name, pass, ts: new Date().toISOString(), ...details });
  if (!pass) {
    report.summary.failures.push({ name, ...details });
  }
}

async function api(pathname, { method = 'GET', token, body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'tenant-id': String(cfg.tenantId)
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${cfg.baseUrl}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  return data;
}

function assertCode0(name, resp) {
  const ok = resp && resp.code === 0;
  addStep(name, ok, { responseCode: resp?.code, responseMsg: resp?.msg || '' });
  if (!ok) throw new Error(`${name} failed: code=${resp?.code}, msg=${resp?.msg}`);
}

async function login() {
  const resp = await api('/system/auth/login', {
    method: 'POST',
    body: { username: cfg.username, password: cfg.password, captchaVerification: '' }
  });
  assertCode0('login', resp);
  if (!resp?.data?.accessToken) throw new Error('login success but accessToken missing');
  return resp.data.accessToken;
}

async function resolveDevice(token, productKey, deviceName) {
  const page = await api(
    `/eiot/device/page?pageNo=1&pageSize=50&productKey=${encodeURIComponent(productKey)}`,
    { method: 'GET', token }
  );
  assertCode0('device.page', page);
  const list = page?.data?.list || [];
  const device = list.find((x) => x.dn === deviceName) || list[0];
  if (!device) throw new Error(`device not found for productKey=${productKey}`);
  addStep('device.resolve', true, { deviceId: device.id, productKey: device.productKey, dn: device.dn });
  return device;
}

function normalizeSendBody(deviceId, payload) {
  const t = nowMs();
  return {
    deviceId: String(deviceId),
    type: payload.type,
    identifier: payload.identifier,
    data: payload.data,
    occurred: t,
    time: t
  };
}

function startMqttProbe(productKey, deviceName) {
  const topics = [];
  const clientId = `${productKey}_${deviceName}_${cfg.mqttModel}`;
  const client = mqtt.connect(cfg.mqttUrl, {
    clientId,
    username: deviceName,
    password: 'x',
    reconnectPeriod: 1000,
    clean: true,
    connectTimeout: 5000
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('mqtt connect timeout')), 8000);
    client.on('connect', () => {
      clearTimeout(timer);
      client.subscribe(`/sys/${productKey}/${deviceName}/c/#`, { qos: 1 }, (err) => {
        if (err) return reject(err);
        resolve({ client, topics });
      });
    });
    client.on('message', (topic, payload) => {
      topics.push({ topic, payload: payload.toString(), ts: nowMs() });
    });
    client.on('error', (e) => reject(e));
  });
}

async function run() {
  const raw = fs.readFileSync(cfg.testdata, 'utf8');
  const td = JSON.parse(raw);
  const productKey = process.env.EIOT_PRODUCT_KEY || td.profile.productKey;
  const deviceName = process.env.EIOT_DEVICE_NAME || td.profile.deviceName;
  const ruleId = Number(process.env.EIOT_RULE_ID || td.profile.ruleId || 0);

  const token = await login();
  const device = await resolveDevice(token, productKey, deviceName);

  const getDevice = await api('/eiot/device/getDeviceWithProperty', {
    method: 'POST',
    token,
    body: { deviceId: String(device.id) }
  });
  assertCode0('device.getDeviceWithProperty', getDevice);

  const probe = await startMqttProbe(productKey, deviceName);
  addStep('mqtt.connect+subscribe', true, { clientId: probe.client.options.clientId });

  const startTs = nowMs();

  const sp = await api('/eiot/device/simulateSend', {
    method: 'POST',
    token,
    body: normalizeSendBody(device.id, td.simulateSend.property)
  });
  assertCode0('simulateSend.property', sp);

  const se = await api('/eiot/device/simulateSend', {
    method: 'POST',
    token,
    body: normalizeSendBody(device.id, td.simulateSend.event)
  });
  assertCode0('simulateSend.event', se);

  const ss = await api('/eiot/device/simulateSend', {
    method: 'POST',
    token,
    body: normalizeSendBody(device.id, td.simulateSend.serviceReply)
  });
  assertCode0('simulateSend.serviceReply', ss);

  const ps = await api('/eiot/device/service/property/set', {
    method: 'POST',
    token,
    body: { deviceId: String(device.id), args: td.downlink.propertySet.args }
  });
  assertCode0('downlink.propertySet', ps);

  const si = await api('/eiot/device/service/invoke', {
    method: 'POST',
    token,
    body: {
      deviceId: String(device.id),
      service: td.downlink.serviceInvoke.service,
      args: td.downlink.serviceInvoke.args
    }
  });
  assertCode0('downlink.serviceInvoke', si);

  await sleep(1500);

  const logs = await api('/eiot/device/deviceLogs/list', {
    method: 'POST',
    token,
    body: { deviceId: String(device.id), pageNo: 1, pageSize: 30 }
  });
  assertCode0('deviceLogs.list', logs);
  const hitLogs = (logs?.data?.list || []).filter((x) => Number(x.time || 0) >= startTs);
  const logTypes = new Set(hitLogs.map((x) => x.type));
  const logIds = new Set(hitLogs.map((x) => x.identifier));
  const requiredTypes = td.assertions.deviceLogTypes || [];
  const requiredIds = td.assertions.deviceLogIdentifiers || [];
  const missingTypes = requiredTypes.filter((x) => !logTypes.has(x));
  const missingIds = requiredIds.filter((x) => !logIds.has(x));
  addStep('deviceLogs.assert.types+identifiers', missingTypes.length === 0 && missingIds.length === 0, {
    missingTypes,
    missingIdentifiers: missingIds,
    hitCount: hitLogs.length
  });
  if (missingTypes.length || missingIds.length) {
    throw new Error(`device logs assertion failed: missingTypes=${missingTypes.join(',')}, missingIds=${missingIds.join(',')}`);
  }

  const seenTopics = probe.topics.map((x) => x.topic);
  const requiredTopics = td.assertions.downlinkTopicMustContain || [];
  const missingTopicKeywords = requiredTopics.filter((kw) => !seenTopics.some((t) => t.includes(kw)));
  addStep('mqtt.downlink.assert', missingTopicKeywords.length === 0, {
    receivedTopics: seenTopics,
    missingTopicKeywords
  });
  if (missingTopicKeywords.length) {
    throw new Error(`mqtt downlink assertion failed: ${missingTopicKeywords.join(',')}`);
  }

  if (ruleId > 0) {
    const rulePage = await api('/eiot/rule_engine/page', {
      method: 'POST',
      token,
      body: { pageNo: 1, pageSize: 50 }
    });
    assertCode0('rule.page', rulePage);
    const rules = rulePage?.data?.list || [];
    const rule = rules.find((x) => Number(x.id) === Number(ruleId));
    const cfgText = JSON.stringify(rule || {});
    const keywords = td.assertions.ruleFilterKeywords || [];
    const missingKeywords = keywords.filter((x) => !cfgText.includes(x));
    addStep('rule.assert.complex-structure-keywords', missingKeywords.length === 0, {
      ruleId,
      missingKeywords
    });
    if (missingKeywords.length) {
      throw new Error(`rule assertion failed: missing keywords ${missingKeywords.join(',')}`);
    }
  }

  probe.client.end(true);
  report.summary.pass = report.summary.failures.length === 0;
}

async function main() {
  try {
    await run();
  } catch (e) {
    addStep('exception', false, { message: e.message });
    report.summary.pass = false;
  } finally {
    report.finishedAt = new Date().toISOString();
    const outDir = path.resolve(__dirname, '../../tmp');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.resolve(outDir, `fullblood-e2e-report-${Date.now()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify({ pass: report.summary.pass, outFile, failures: report.summary.failures }, null, 2));
    process.exit(report.summary.pass ? 0 : 1);
  }
}

main();
