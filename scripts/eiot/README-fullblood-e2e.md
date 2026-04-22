# Fullblood E2E 调试脚本说明

## 1. 文件清单
- `fullblood-all-types-testdata.json`：覆盖全类型的测试数据
- `fullblood-e2e-runner.js`：闭环验证主脚本
- `fullblood-recreate-and-verify.js`：自动新建产品/设备/规则并闭环验证
- `run-fullblood-e2e.ps1`：PowerShell 启动脚本

## 2. 一键执行
在 `D:\aiLocal\enjoy-web` 目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\eiot\run-fullblood-e2e.ps1
```

成功时会输出：

```json
{
  "pass": true,
  "outFile": "D:\\aiLocal\\enjoy-web\\tmp\\fullblood-e2e-report-xxxx.json",
  "failures": []
}
```

如需每次都创建一套新的“满血物模型 + 设备 + 规则”并验证，请执行：

```powershell
node .\scripts\eiot\fullblood-recreate-and-verify.js
```

## 3. 覆盖范围
- 登录认证（租户）
- 设备查询与 `getDeviceWithProperty`
- `simulateSend` 三类消息：
  - `property/report`
  - `event/alarm`
  - `service/calibrate_reply`
- 设备控制下行：
  - `service/property/set`
  - `service/invoke`
- MQTT 下行命中校验
- 设备日志三类消息命中校验
- 规则配置关键字段校验（`p_object3/p_array3`）
- bool 规则条件统一按 `0/1` 输入（支持映射文案展示）

## 4. 环境变量
- `EIOT_BASE_URL`，默认 `http://localhost:48080/admin-api`
- `EIOT_TENANT_ID`，默认 `1`
- `EIOT_USERNAME`，默认 `admin`
- `EIOT_PASSWORD`，默认 `admin123`
- `EIOT_MQTT_URL`，默认 `mqtt://127.0.0.1:18831`
- `EIOT_PRODUCT_KEY`、`EIOT_DEVICE_NAME`、`EIOT_RULE_ID`
- `EIOT_TESTDATA`（自定义测试数据路径）

## 5. 常见问题
- MQTT 认证失败：`clientId` 必须是 `{productKey}_{deviceName}_{model}`，不能附加额外后缀。
- 控制接口 500：`deviceId` 需要按字符串传递，避免 JS `Number` 精度丢失。
- 401 未登录：请确认传了 `tenant-id`，默认租户为 `1`。
- bool 看起来是 `true/false`：消息层可能看到布尔表达，系统存储与规则输入统一按 `0/1`。
