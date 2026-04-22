/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');

const now = () => Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cfg = {
  baseUrl: process.env.EIOT_BASE_URL || 'http://localhost:48080/admin-api',
  tenantId: process.env.EIOT_TENANT_ID || '1',
  username: process.env.EIOT_USERNAME || 'admin',
  password: process.env.EIOT_PASSWORD || 'admin123',
  mqttUrl: process.env.EIOT_MQTT_URL || 'mqtt://127.0.0.1:18831',
  mqttModel: process.env.EIOT_MQTT_MODEL || 'M1',
  templateProductKey: process.env.EIOT_TEMPLATE_PRODUCT_KEY || 'E2E_COMPLEX_20260421232948'
};

const report = {
  startedAt: new Date().toISOString(),
  config: cfg,
  generated: {},
  steps: [],
  summary: { pass: false, failures: [] }
};

function step(name, pass, details = {}) {
  report.steps.push({ ts: new Date().toISOString(), name, pass, ...details });
  if (!pass) report.summary.failures.push({ name, ...details });
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
  return res.json();
}

function mustCode0(name, resp) {
  const ok = resp && resp.code === 0;
  step(name, ok, { code: resp?.code, msg: resp?.msg || '' });
  if (!ok) throw new Error(`${name} failed: code=${resp?.code}, msg=${resp?.msg}`);
}

async function login() {
  const resp = await api('/system/auth/login', {
    method: 'POST',
    body: { username: cfg.username, password: cfg.password, captchaVerification: '' }
  });
  mustCode0('login', resp);
  return resp.data.accessToken;
}

async function resolveRuleId(token, saveResp, ruleName) {
  const direct = Number(saveResp?.data);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  const page = await api('/eiot/rule_engine/page', {
    method: 'POST',
    token,
    body: { pageNo: 1, pageSize: 20, name: ruleName, typ: 'scene' }
  });
  mustCode0('rule.page.resolveId', page);
  const matched = (page?.data?.list || []).find((x) => x?.name === ruleName);
  const pageId = Number(matched?.id || 0);
  if (pageId > 0) return pageId;
  throw new Error(`rule id resolve failed: ${ruleName}`);
}

async function getTemplateProduct(token) {
  let resp = await api(`/eiot/product/getByPk?pk=${encodeURIComponent(cfg.templateProductKey)}`, { token });
  if (resp?.code !== 0 || !resp?.data) {
    const page = await api('/eiot/product/page?pageNo=1&pageSize=1', { token });
    mustCode0('product.page.fallback', page);
    const first = page?.data?.list?.[0];
    if (!first) throw new Error('no product available for template');
    resp = await api(`/eiot/product/get?id=${first.id}`, { token });
  }
  mustCode0('product.get.template', resp);
  return resp.data;
}

function buildFullbloodThingModel() {
  return {
    properties: [
      { identifier: 'p_bool', name: 'SwitchMapped', accessMode: 'rw', dataType: { type: 'bool', specs: { 0: 'online', 1: 'offline' } } },
      { identifier: 'p_enum', name: 'Mode', accessMode: 'rw', dataType: { type: 'enum', specs: { 0: 'auto', 1: 'manual', 2: 'eco' } } },
      { identifier: 'p_int32', name: 'Counter32', accessMode: 'rw', dataType: { type: 'int32', specs: { min: 0, max: 2147483647 } } },
      { identifier: 'p_int64', name: 'Counter64', accessMode: 'rw', dataType: { type: 'int64', specs: { min: 0, max: '9223372036854775807' } } },
      { identifier: 'p_float', name: 'FlowRate', accessMode: 'rw', dataType: { type: 'float', specs: { min: 0, max: 9999, precision: 2 } } },
      { identifier: 'p_double', name: 'TempDouble', accessMode: 'rw', dataType: { type: 'double', specs: { min: -100, max: 200, precision: 3 } } },
      { identifier: 'p_string', name: 'ShortText', accessMode: 'rw', dataType: { type: 'string', specs: { length: 128 } } },
      { identifier: 'p_text', name: 'LongText', accessMode: 'rw', dataType: { type: 'text', specs: { length: 2048 } } },
      { identifier: 'p_date', name: 'OnlyDate', accessMode: 'rw', dataType: { type: 'date', specs: { format: 'yyyy-MM-dd' } } },
      { identifier: 'p_datetime', name: 'DateTime', accessMode: 'rw', dataType: { type: 'datetime', specs: { format: 'yyyy-MM-dd HH:mm:ss' } } },
      { identifier: 'p_position', name: 'Position', accessMode: 'rw', dataType: { type: 'position', specs: {} } },
      {
        identifier: 'p_object3',
        name: 'Object3',
        accessMode: 'rw',
        dataType: {
          type: 'object',
          specs: {
            properties: [
              {
                identifier: 'meta',
                name: 'Meta',
                dataType: {
                  type: 'object',
                  specs: {
                    properties: [
                      { identifier: 'version', name: 'Version', dataType: { type: 'string', specs: { length: 64 } } },
                      { identifier: 'flags', name: 'Flags', dataType: { type: 'array', specs: { itemType: { type: 'string', specs: { length: 64 } } } } }
                    ]
                  }
                }
              },
              {
                identifier: 'readings',
                name: 'Readings',
                dataType: {
                  type: 'array',
                  specs: {
                    itemType: {
                      type: 'object',
                      specs: {
                        properties: [
                          { identifier: 'ts', name: 'Ts', dataType: { type: 'datetime', specs: { format: 'yyyy-MM-dd HH:mm:ss' } } },
                          { identifier: 'value', name: 'Value', dataType: { type: 'double', specs: { min: 0, max: 99999, precision: 2 } } }
                        ]
                      }
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        identifier: 'p_array3',
        name: 'Array3',
        accessMode: 'rw',
        dataType: {
          type: 'array',
          specs: {
            itemType: {
              type: 'object',
              specs: {
                properties: [
                  { identifier: 'bucketId', name: 'BucketId', dataType: { type: 'string', specs: { length: 64 } } },
                  {
                    identifier: 'items',
                    name: 'Items',
                    dataType: {
                      type: 'array',
                      specs: {
                        itemType: {
                          type: 'object',
                          specs: {
                            properties: [
                              { identifier: 'k', name: 'K', dataType: { type: 'string', specs: { length: 32 } } },
                              { identifier: 'v', name: 'V', dataType: { type: 'int32', specs: { min: 0, max: 99999 } } }
                            ]
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ],
    services: [
      {
        identifier: 'calibrate',
        name: 'Calibrate',
        description: 'calibrate with all data types',
        inputData: [
          { identifier: 'in_bool', name: 'InBool', required: true, dataType: { type: 'bool', specs: { 0: 'off', 1: 'on' } } },
          { identifier: 'in_enum', name: 'InEnum', required: true, dataType: { type: 'enum', specs: { 0: 'auto', 1: 'manual', 2: 'eco' } } },
          { identifier: 'in_int32', name: 'InInt32', required: true, dataType: { type: 'int32', specs: { min: 0, max: 2147483647 } } },
          { identifier: 'in_int64', name: 'InInt64', required: true, dataType: { type: 'int64', specs: { min: 0, max: '9223372036854775807' } } },
          { identifier: 'in_float', name: 'InFloat', required: true, dataType: { type: 'float', specs: { min: 0, max: 99999, precision: 2 } } },
          { identifier: 'in_double', name: 'InDouble', required: true, dataType: { type: 'double', specs: { min: 0, max: 99999, precision: 3 } } },
          { identifier: 'in_string', name: 'InString', required: true, dataType: { type: 'string', specs: { length: 128 } } },
          { identifier: 'in_text', name: 'InText', required: false, dataType: { type: 'text', specs: { length: 2048 } } },
          { identifier: 'in_date', name: 'InDate', required: true, dataType: { type: 'date', specs: { format: 'yyyy-MM-dd' } } },
          { identifier: 'in_datetime', name: 'InDateTime', required: true, dataType: { type: 'datetime', specs: { format: 'yyyy-MM-dd HH:mm:ss' } } },
          { identifier: 'in_position', name: 'InPosition', required: true, dataType: { type: 'position', specs: {} } },
          {
            identifier: 'in_object3',
            name: 'InObject3',
            required: true,
            dataType: {
              type: 'object',
              specs: {
                properties: [
                  { identifier: 'version', name: 'Version', dataType: { type: 'string', specs: { length: 64 } } },
                  {
                    identifier: 'metrics',
                    name: 'Metrics',
                    dataType: {
                      type: 'array',
                      specs: {
                        itemType: {
                          type: 'object',
                          specs: {
                            properties: [
                              { identifier: 'k', name: 'K', dataType: { type: 'string', specs: { length: 32 } } },
                              { identifier: 'v', name: 'V', dataType: { type: 'double', specs: { min: 0, max: 99999, precision: 2 } } }
                            ]
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            identifier: 'in_array3',
            name: 'InArray3',
            required: true,
            dataType: {
              type: 'array',
              specs: {
                itemType: {
                  type: 'object',
                  specs: {
                    properties: [
                      { identifier: 'bucket', name: 'Bucket', dataType: { type: 'string', specs: { length: 64 } } },
                      {
                        identifier: 'items',
                        name: 'Items',
                        dataType: {
                          type: 'array',
                          specs: {
                            itemType: {
                              type: 'object',
                              specs: {
                                properties: [
                                  { identifier: 'code', name: 'Code', dataType: { type: 'string', specs: { length: 32 } } },
                                  { identifier: 'value', name: 'Value', dataType: { type: 'int32', specs: { min: 0, max: 99999 } } }
                                ]
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        ],
        outputData: [
          { identifier: 'out_bool', name: 'OutBool', required: false, dataType: { type: 'bool', specs: { 0: 'fail', 1: 'success' } } },
          { identifier: 'out_enum', name: 'OutEnum', required: false, dataType: { type: 'enum', specs: { 0: 'auto', 1: 'manual', 2: 'eco' } } },
          { identifier: 'out_int32', name: 'OutInt32', required: false, dataType: { type: 'int32', specs: { min: 0, max: 2147483647 } } },
          { identifier: 'out_int64', name: 'OutInt64', required: false, dataType: { type: 'int64', specs: { min: 0, max: '9223372036854775807' } } },
          { identifier: 'out_float', name: 'OutFloat', required: false, dataType: { type: 'float', specs: { min: 0, max: 99999, precision: 2 } } },
          { identifier: 'out_double', name: 'OutDouble', required: false, dataType: { type: 'double', specs: { min: 0, max: 99999, precision: 3 } } },
          { identifier: 'out_string', name: 'OutString', required: false, dataType: { type: 'string', specs: { length: 128 } } },
          { identifier: 'out_text', name: 'OutText', required: false, dataType: { type: 'text', specs: { length: 2048 } } },
          { identifier: 'out_date', name: 'OutDate', required: false, dataType: { type: 'date', specs: { format: 'yyyy-MM-dd' } } },
          { identifier: 'out_datetime', name: 'OutDateTime', required: false, dataType: { type: 'datetime', specs: { format: 'yyyy-MM-dd HH:mm:ss' } } },
          { identifier: 'out_position', name: 'OutPosition', required: false, dataType: { type: 'position', specs: {} } },
          {
            identifier: 'out_object3',
            name: 'OutObject3',
            required: false,
            dataType: {
              type: 'object',
              specs: {
                properties: [
                  { identifier: 'batch', name: 'Batch', dataType: { type: 'string', specs: { length: 64 } } },
                  { identifier: 'score', name: 'Score', dataType: { type: 'double', specs: { min: 0, max: 100, precision: 2 } } },
                  { identifier: 'ok', name: 'Ok', dataType: { type: 'bool', specs: { 0: 'no', 1: 'yes' } } }
                ]
              }
            }
          },
          {
            identifier: 'out_array3',
            name: 'OutArray3',
            required: false,
            dataType: {
              type: 'array',
              specs: {
                itemType: {
                  type: 'object',
                  specs: {
                    properties: [
                      { identifier: 'group', name: 'Group', dataType: { type: 'string', specs: { length: 64 } } },
                      { identifier: 'count', name: 'Count', dataType: { type: 'int32', specs: { min: 0, max: 99999 } } }
                    ]
                  }
                }
              }
            }
          }
        ]
      }
    ],
    events: [
      {
        identifier: 'alarm',
        name: 'Alarm',
        description: 'alarm with all data types',
        outputData: [
          { identifier: 'e_bool', name: 'EBool', required: false, dataType: { type: 'bool', specs: { 0: 'no', 1: 'yes' } } },
          { identifier: 'e_enum', name: 'EEnum', required: false, dataType: { type: 'enum', specs: { 0: 'auto', 1: 'manual', 2: 'eco' } } },
          { identifier: 'e_int32', name: 'EInt32', required: false, dataType: { type: 'int32', specs: { min: 0, max: 2147483647 } } },
          { identifier: 'e_int64', name: 'EInt64', required: false, dataType: { type: 'int64', specs: { min: 0, max: '9223372036854775807' } } },
          { identifier: 'e_float', name: 'EFloat', required: false, dataType: { type: 'float', specs: { min: 0, max: 99999, precision: 2 } } },
          { identifier: 'e_double', name: 'EDouble', required: false, dataType: { type: 'double', specs: { min: 0, max: 99999, precision: 3 } } },
          { identifier: 'e_string', name: 'EString', required: false, dataType: { type: 'string', specs: { length: 128 } } },
          { identifier: 'e_text', name: 'EText', required: false, dataType: { type: 'text', specs: { length: 2048 } } },
          { identifier: 'e_date', name: 'EDate', required: false, dataType: { type: 'date', specs: { format: 'yyyy-MM-dd' } } },
          { identifier: 'e_datetime', name: 'EDateTime', required: false, dataType: { type: 'datetime', specs: { format: 'yyyy-MM-dd HH:mm:ss' } } },
          { identifier: 'e_position', name: 'EPosition', required: false, dataType: { type: 'position', specs: {} } },
          {
            identifier: 'e_object3',
            name: 'EObject3',
            required: false,
            dataType: {
              type: 'object',
              specs: {
                properties: [
                  {
                    identifier: 'headers',
                    name: 'Headers',
                    dataType: {
                      type: 'object',
                      specs: {
                        properties: [
                          { identifier: 'source', name: 'Source', dataType: { type: 'string', specs: { length: 64 } } },
                          { identifier: 'level', name: 'Level', dataType: { type: 'string', specs: { length: 32 } } }
                        ]
                      }
                    }
                  },
                  {
                    identifier: 'records',
                    name: 'Records',
                    dataType: {
                      type: 'array',
                      specs: {
                        itemType: {
                          type: 'object',
                          specs: {
                            properties: [
                              { identifier: 'code', name: 'Code', dataType: { type: 'string', specs: { length: 64 } } },
                              { identifier: 'message', name: 'Message', dataType: { type: 'text', specs: { length: 512 } } }
                            ]
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            identifier: 'e_array3',
            name: 'EArray3',
            required: false,
            dataType: {
              type: 'array',
              specs: {
                itemType: {
                  type: 'object',
                  specs: {
                    properties: [
                      { identifier: 'bucketId', name: 'BucketId', dataType: { type: 'string', specs: { length: 64 } } },
                      {
                        identifier: 'items',
                        name: 'Items',
                        dataType: {
                          type: 'array',
                          specs: {
                            itemType: {
                              type: 'object',
                              specs: {
                                properties: [
                                  { identifier: 'k', name: 'K', dataType: { type: 'string', specs: { length: 32 } } },
                                  { identifier: 'v', name: 'V', dataType: { type: 'double', specs: { min: 0, max: 99999, precision: 2 } } }
                                ]
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        ]
      }
    ]
  };
}

function startProbe(productKey, deviceName) {
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
    const t = setTimeout(() => reject(new Error('mqtt connect timeout')), 8000);
    client.on('connect', () => {
      clearTimeout(t);
      client.subscribe(`/sys/${productKey}/${deviceName}/c/#`, { qos: 1 }, (err) => {
        if (err) return reject(err);
        resolve({ client, topics });
      });
    });
    client.on('message', (topic, payload) => topics.push({ topic, payload: payload.toString(), ts: now() }));
    client.on('error', (e) => reject(e));
  });
}

async function main() {
  let probe = null;
  try {
    const token = await login();
    const templateProduct = await getTemplateProduct(token);
    const suffix = now();
    const productKey = `AUTO_FULLBLOOD_${suffix}`;
    const dn = `AUTO-FULLBLOOD-DN-${suffix}`;
    const productName = `AutoFullblood_${suffix}`;
    const ruleName = `AUTO_FULLBLOOD_RULE_${suffix}`;

    const createProductBody = {
      name: productName,
      categoryId: templateProduct.categoryId,
      productKey,
      mcuCode: templateProduct.mcuCode || '',
      remark1: 'auto generated fullblood model',
      imgUrl: templateProduct.imgUrl || '',
      remark: 'auto-generated by script',
      status: 0,
      nodeType: templateProduct.nodeType,
      protocolCode: templateProduct.protocolCode,
      keepAliveTime: templateProduct.keepAliveTime || 300,
      transparent: !!templateProduct.transparent,
      locateType: templateProduct.locateType || 0
    };
    const createProduct = await api('/eiot/product/create', { method: 'POST', token, body: createProductBody });
    mustCode0('product.create', createProduct);
    const productId = createProduct.data;

    const modelObj = buildFullbloodThingModel();
    const saveModel = await api('/eiot/thing-model/save', {
      method: 'PUT',
      token,
      body: { productKey, model: JSON.stringify(modelObj) }
    });
    mustCode0('thingModel.save', saveModel);

    const serialResp = await api(`/eiot/device/genSerialNO?nodeType=${templateProduct.nodeType}`, { token });
    mustCode0('device.genSerial', serialResp);
    const serialNo = serialResp.data;
    const createDevice = await api('/eiot/device/create', {
      method: 'POST',
      token,
      body: {
        dn,
        productKey,
        name: `AutoFullbloodDevice_${suffix}`,
        serialNo,
        firmVersion: '1.0.0',
        model: cfg.mqttModel
      }
    });
    mustCode0('device.create', createDevice);
    const deviceId = String(createDevice.data);

    const listenerCfg = {
      type: 'device',
      pk: productKey,
      dn,
      cond: 1,
      conditions: [
        {
          identifier: 'report',
          type: 'property',
          parameters: [{ identifier: '*', comparator: '*', value: '*' }]
        },
        { identifier: 'event:*', type: 'event', parameters: [] },
        { identifier: 'service_reply:*', type: 'service_reply', parameters: [] }
      ]
    };

    const filterCfg = {
      type: 'device',
      pk: productKey,
      dn,
      cond: 2,
      conditions: [
        { type: 'property', identifier: 'p_bool', comparator: '==', value: '1' },
        { type: 'property', identifier: 'p_enum', comparator: '==', value: '2' },
        { type: 'property', identifier: 'p_int32', comparator: '>', value: '100' },
        { type: 'property', identifier: 'p_int64', comparator: '>', value: '100000' },
        { type: 'property', identifier: 'p_float', comparator: '>', value: '1.1' },
        { type: 'property', identifier: 'p_double', comparator: '>', value: '2.2' },
        { type: 'property', identifier: 'p_string', comparator: 'contain', value: 'short' },
        { type: 'property', identifier: 'p_text', comparator: 'contain', value: 'fullblood' },
        { type: 'property', identifier: 'p_date', comparator: '==', value: '2026-04-22' },
        { type: 'property', identifier: 'p_datetime', comparator: 'contain', value: '2026-04-22' },
        { type: 'property', identifier: 'p_position', comparator: 'contain', value: '31.2304' },
        { type: 'property', identifier: 'p_object3.meta.version', comparator: '==', value: 'v3' },
        { type: 'property', identifier: 'p_object3.meta.flags[*]', comparator: 'contain', value: 'f1' },
        { type: 'property', identifier: 'p_array3[*].bucketId', comparator: 'contain', value: 'b001' },
        { type: 'property', identifier: 'p_array3[*].items[*].k', comparator: '==', value: 'a' }
      ]
    };

    const saveRule = await api('/eiot/rule_engine/save', {
      method: 'POST',
      token,
      body: {
        name: ruleName,
        typ: 'scene',
        state: 1,
        remark: 'auto fullblood all types',
        listeners: [{ type: 'device', config: JSON.stringify(listenerCfg) }],
        filters: [{ type: 'device', config: JSON.stringify(filterCfg) }],
        actions: [],
        triggerOptions: { minIntervalSec: 0, delaySec: 0, enableAlertRecover: false, recoverQuietSec: 0 }
      }
    });
    mustCode0('rule.save', saveRule);
    const ruleId = await resolveRuleId(token, saveRule, ruleName);
    await api('/eiot/rule_engine/resume', { method: 'POST', token, body: { id: ruleId } });

    report.generated = { productId, productKey, deviceId, dn, ruleId, ruleName };

    probe = await startProbe(productKey, dn);
    step('mqtt.probe.connect', true, { clientId: `${productKey}_${dn}_${cfg.mqttModel}` });

    const payloads = {
      property: {
        deviceId,
        productKey,
        dn,
        type: 'property',
        identifier: 'report',
        data: {
          p_bool: 1,
          p_enum: 2,
          p_int32: 101,
          p_int64: '123456789',
          p_float: 12.34,
          p_double: 23.456,
          p_string: 'short-string',
          p_text: 'fullblood thing model',
          p_date: '2026-04-22',
          p_datetime: '2026-04-22 16:30:00',
          p_position: '31.2304,121.4737',
          p_object3: { meta: { version: 'v3', flags: ['f1', 'f2'] }, readings: [{ ts: '2026-04-22 16:30:00', value: 12.3 }] },
          p_array3: [{ bucketId: 'b001', items: [{ k: 'a', v: 1 }] }]
        }
      },
      event: {
        deviceId,
        productKey,
        dn,
        type: 'event',
        identifier: 'alarm',
        data: {
          e_bool: 1,
          e_enum: 2,
          e_int32: 202,
          e_int64: '888888888',
          e_float: 66.6,
          e_double: 88.66,
          e_string: 'event-string',
          e_text: 'event long text',
          e_date: '2026-04-22',
          e_datetime: '2026-04-22 16:40:00',
          e_position: '31.2304,121.4737',
          e_object3: {
            headers: { source: 'sensor', level: 'high' },
            records: [{ code: 'A1', message: 'overheat' }]
          },
          e_array3: [{ bucketId: 'e001', items: [{ k: 'temp', v: 88.6 }] }]
        }
      },
      serviceReply: {
        deviceId,
        productKey,
        dn,
        type: 'service',
        identifier: 'calibrate_reply',
        data: {
          out_bool: 1,
          out_enum: 2,
          out_int32: 303,
          out_int64: '999999999',
          out_float: 12.34,
          out_double: 56.789,
          out_string: 'service-reply-string',
          out_text: 'service reply long text',
          out_date: '2026-04-22',
          out_datetime: '2026-04-22 16:45:00',
          out_position: '31.2304,121.4737',
          out_object3: { batch: 'B20260422', score: 98.7, ok: 1 },
          out_array3: [{ group: 'g1', count: 2 }]
        }
      }
    };
    const t0 = now();
    for (const key of ['property', 'event', 'serviceReply']) {
      const body = { ...payloads[key], occurred: now(), time: now() };
      const resp = await api('/eiot/device/simulateSend', { method: 'POST', token, body });
      mustCode0(`simulateSend.${key}`, resp);
    }

    const setResp = await api('/eiot/device/service/property/set', {
      method: 'POST',
      token,
      body: { deviceId, args: { p_bool: 1, p_enum: 1, p_text: 'downlink-set' } }
    });
    mustCode0('downlink.propertySet', setResp);

    const invokeResp = await api('/eiot/device/service/invoke', {
      method: 'POST',
      token,
      body: {
        deviceId,
        service: 'calibrate',
        args: {
          in_bool: 1,
          in_enum: 2,
          in_int32: 1001,
          in_int64: '888888001',
          in_float: 11.22,
          in_double: 33.445,
          in_string: 'service-input-string',
          in_text: 'service input long text',
          in_date: '2026-04-22',
          in_datetime: '2026-04-22 16:50:00',
          in_position: '31.2304,121.4737',
          in_object3: { version: 'v1', metrics: [{ k: 'temp', v: 22.3 }] },
          in_array3: [{ bucket: 'b-in', items: [{ code: 'x1', value: 7 }] }]
        }
      }
    });
    mustCode0('downlink.serviceInvoke', invokeResp);

    await sleep(2500);

    const deviceLogs = await api('/eiot/device/deviceLogs/list', {
      method: 'POST',
      token,
      body: { deviceId, pageNo: 1, pageSize: 50 }
    });
    mustCode0('deviceLogs.list', deviceLogs);
    const hits = (deviceLogs?.data?.list || []).filter((x) => Number(x.time || 0) >= t0);
    const types = new Set(hits.map((x) => x.type));
    const identifiers = new Set(hits.map((x) => x.identifier));
    const missTypes = ['property', 'event', 'service'].filter((x) => !types.has(x));
    const missIds = ['report', 'alarm', 'calibrate_reply'].filter((x) => !identifiers.has(x));
    const logPass = missTypes.length === 0 && missIds.length === 0;
    step('deviceLogs.assert', logPass, { missTypes, missIds, hitCount: hits.length });
    if (!logPass) throw new Error(`device logs missing: ${missTypes.join(',')} ${missIds.join(',')}`);

    const pageBefore = await api('/eiot/rule_engine/ruleLog/list', {
      method: 'POST',
      token,
      body: { pageNo: 1, pageSize: 1, ruleId }
    });
    mustCode0('ruleLog.list', pageBefore);
    const ruleHasLog = Number(pageBefore?.data?.total || 0) >= 1;
    step('ruleLog.assert.hit', ruleHasLog, { total: pageBefore?.data?.total || 0, ruleId });
    if (!ruleHasLog) throw new Error('rule log not generated for new rule');

    const topics = probe.topics.map((x) => x.topic);
    const need = ['/c/service/property/set', '/c/service/calibrate'];
    const missTopics = need.filter((kw) => !topics.some((t) => t.includes(kw)));
    const topicPass = missTopics.length === 0;
    step('mqtt.downlink.assert', topicPass, { missTopics, topics });
    if (!topicPass) throw new Error(`missing mqtt topics: ${missTopics.join(',')}`);

    const outDir = path.resolve(__dirname, '../../tmp');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const generatedDataFile = path.resolve(outDir, `fullblood-generated-testdata-${suffix}.json`);
    fs.writeFileSync(generatedDataFile, JSON.stringify({ generated: report.generated, payloads }, null, 2), 'utf8');
    step('artifacts.generated', true, { generatedDataFile });
    report.generated.generatedDataFile = generatedDataFile;

    report.summary.pass = true;
  } catch (e) {
    step('exception', false, { message: e.message });
    report.summary.pass = false;
  } finally {
    if (probe && probe.client) probe.client.end(true);
    report.finishedAt = new Date().toISOString();
    const outDir = path.resolve(__dirname, '../../tmp');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.resolve(outDir, `fullblood-recreate-report-${Date.now()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify({ pass: report.summary.pass, outFile, generated: report.generated, failures: report.summary.failures }, null, 2));
    process.exit(report.summary.pass ? 0 : 1);
  }
}

main();
