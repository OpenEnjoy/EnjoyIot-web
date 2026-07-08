# AGENTS.md

## 项目概述

Enjoy-IoT（乐享智联）开源物联网平台前端，基于 Vue 3 + TypeScript。在芋道（YuDao）管理后台模板基础上深度定制 IoT 功能：设备/产品管理、物模型、规则引擎、告警中心、数据看板、协议配置。

后端项目：`../enjoy-iot-admin`（Spring Boot + Java 21），API 路径前缀 `/admin-api`。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3.5（Composition API, `<script setup>`） |
| 语言 | TypeScript 5.3 |
| 构建 | Vite 5.1，pnpm >= 8.6，Node >= 16.18 |
| UI 组件 | Element Plus 2.9 |
| CSS | UnoCSS 0.58（原子化 CSS）+ SCSS（组件样式） |
| 状态管理 | Pinia 2.1 + pinia-plugin-persistedstate |
| 路由 | Vue Router 4.4（history 模式，静态 + 动态路由） |
| HTTP | Axios 1.6（JWT + 静默刷新） |
| 图表 | ECharts 5.5，Leaflet + 高德地图 |
| 其他 | mqtt 4.3、bpmn-js 17、Video.js、vue-i18n 9（中/英） |

## 目录结构

```
src/
├── api/              — API 层，按模块分组：login/、system/、infra/、eiot/、ai/
├── config/axios/     — Axios 实例、拦截器、Token 静默刷新
├── router/           — 静态路由（remaining.ts）+ 动态路由生成
├── store/modules/    — Pinia：app、user、permission、dict、locale、tagsView、lock
├── hooks/web/        — 组合式函数：useTable、useCrudSchemas、useMessage、useI18n 等
├── layout/           — 主布局（classic/topLeft/top/cutMenu）+ 组件
├── components/       — 共享组件（50+）：yt-crud、yt-table、BPMN 设计器、编辑器等
├── views/            — 页面：system/、infra/、eiot/、ai/、Login/、Error/
├── plugins/          — 插件初始化：elementPlus、vueI18n、svgIcon、echarts、formCreate
├── directives/       — 自定义指令：v-auth（权限）
├── locales/          — 国际化（zh-CN.ts、en.ts）
├── styles/           — 全局 SCSS、CSS 变量、主题
├── utils/            — 工具函数：auth、permission、routerHelper、tree、dict、formatTime、download
└── types/            — 类型定义（含自动生成的 auto-imports.d.ts、auto-components.d.ts）
```

## 如何新增一个功能页面

以前端新增「设备标签」为例，完整链路：

### 1. 定义 API（src/api/eiot/devicetag/index.ts）
```typescript
import request from '@/config/axios'

// 定义 VO 接口
export interface DeviceTagVO {
  id: number
  name: string
  deviceId: number
  createTime: string
}

// 按实体分组导出 API 函数
export const DeviceTagApi = {
  getPage: async (params: any) => request.get({ url: '/eiot/device-tag/page', params }),
  create: async (data: any) => request.post({ url: '/eiot/device-tag/create', data }),
  update: async (data: any) => request.put({ url: '/eiot/device-tag/update', data }),
  delete: async (id: number) => request.delete({ url: '/eiot/device-tag/delete?id=' + id }),
}
```

### 2. 创建列表页（src/views/eiot/devicetag/index.vue）
```vue
<template>
  <yt-crud
    :columns="columns"
    :api="DeviceTagApi.getPage"
    :search-schemas="searchSchemas"
    :form-schemas="formSchemas"
  />
</template>

<script setup lang="ts">
import { useCrudSchemas } from '@/hooks/web/useCrudSchemas'
import { DeviceTagApi } from '@/api/eiot/devicetag'
import { DICT_TYPE } from '@/utils/dict'

// 列定义（IColumn 类型）
const columns = reactive([
  { prop: 'id', label: '标签ID', width: 80 },
  { prop: 'name', label: '标签名称', search: true },
  { prop: 'deviceId', label: '设备ID' },
  { prop: 'createTime', label: '创建时间' },
])

// 搜索表单 schema
const searchSchemas = [
  { field: 'name', label: '标签名称', component: 'Input' },
]

// 编辑表单 schema
const formSchemas = [
  { field: 'name', label: '标签名称', component: 'Input', required: true },
  { field: 'deviceId', label: '设备ID', component: 'InputNumber', required: true },
]
</script>
```

### 3. 可选：复杂子组件放 modules/ 子目录
```
views/eiot/devicetag/
├── index.vue          — 列表页
└── modules/
    └── TagDetail.vue  — 标签详情弹窗
```

### 4. 添加路由（后端菜单管理配置）
动态路由由后端菜单 API 返回，前端不需要手动添加路由文件。在后台「菜单管理」中新增菜单项即可。

## API 层约定

- 每个 API 模块按 `src/api/<域>/<子模块>/index.ts` 组织
- 导出 `XxxApi` 对象，包含 `getPage`、`create`、`update`、`delete` 等命名方法
- 请求基地址：`VITE_BASE_URL + VITE_API_URL`（如 `http://localhost:48080/admin-api`）
- 请求头自动携带 JWT Bearer Token，401 时自动静默刷新（并发请求排队）
- 多租户模式下自动携带 `tenant-id` 请求头
- 后端返回格式：`{ code: 0, data: ..., msg: ... }`，`code: 0` 表示成功

## 核心约定

- **自动导入**：Vue API（`ref`、`computed`、`watch`）、路由 API（`useRouter`、`useRoute`）、项目 hooks（`useI18n`、`useMessage`、`useTable`、`useCrudSchemas`、`required`、`DICT_TYPE`）**全局自动可用，不需要显式 import**
- **自动组件**：Element Plus 组件 + `src/components/` 下的自定义组件自动注册，不需要 import
- **混合 SFC + TSX**：`.vue` SFC 用 `<script setup>`，`.tsx` 组件用 `defineComponent`（表格、搜索、布局渲染器）
- **双 CSS 体系**：UnoCSS 用于原子化工具类，SCSS 模块用于组件范围样式。**注意：这是 UnoCSS 不是 Tailwind，类名规则不同**
- **CSS 主题**：CSS 自定义属性（`--el-color-primary`）通过 Pinia store 动态设置
- **布局工厂**：`useRenderLayout.tsx` 切换 classic / topLeft / top / cutMenu 四种模式
- **组件命名**：每个组件必须 `defineOptions({ name: 'ComponentName' })`（Vue DevTools 依赖）
- **图标**：前缀系统 `fa:`（FontAwesome）、`ep:`（Element Plus）、`icon-`（SVG），用错前缀会静默失败
- **字典**：`DICT_TYPE` 枚举 + `getDictOptions` / `getIntDictOptions` / `getBoolDictOptions` 辅助函数
- **权限**：`v-auth` 指令 + `hasPermi` / `hasRole` 工具函数（来自 `@/utils/permission`）

## yt-crud 核心组件

`yt-crud` 是项目中最重要的组件，几乎所有列表页都用它。它整合了搜索表单、操作按钮、数据表格、分页、编辑弹窗：

```vue
<yt-crud
  :columns="columns"           <!-- 列定义（IColumn[]） -->
  :api="XxxApi.getPage"        <!-- 分页查询 API -->
  :search-schemas="searchSchemas"  <!-- 搜索表单 schema -->
  :form-schemas="formSchemas"  <!-- 编辑表单 schema -->
  :permission="'eiot:device:query'"  <!-- 权限标识 -->
/>
```

关键类型：`IColumn` 来自 `@/components/common/types/tableCommon`，`useCrudSchemas` hook 可以将列定义转为搜索和表单 schema。

## 常见陷阱（Gotchas）

- **用 npm 而非 pnpm**：项目用 pnpm 管理依赖，`npm install` 会破坏 `pnpm-lock.yaml`。始终用 `pnpm install`
- **手动 import 自动导入的 API**：`ref`、`computed`、`useRouter`、`useMessage` 等已全局自动导入，手动 import 是冗余代码
- **用 Tailwind 类名而非 UnoCSS**：这是 UnoCSS 项目，不是 Tailwind，类名规则不同
- **忘记 `defineOptions({ name })`**：会导致 Vue DevTools 中组件显示为匿名组件
- **图标前缀错误**：`fa:` 是 FontAwesome，`ep:` 是 Element Plus Icons，`icon-` 是自定义 SVG，混用会静默失败
- **不用 yt-crud 而手写表格**：yt-crud 封装了搜索、分页、表单、权限，手写 Element Plus 表格会缺失这些功能
- **字典类型用错**：`DICT_TYPE` 枚举值需要与后端字典表一致，写错名不会报错但数据为空
- **eslintrc-auto-import.json 缺失**：ESLint 会报自动导入的全局变量 undefined，运行 `npm run dev` 会自动生成
- **路由元信息遗漏**：动态路由的 meta 字段（title、icon、hidden、permission）在后端菜单管理中配置，前端不需要修改
- **环境变量命名**：所有 `VITE_` 前缀变量在代码中通过 `import.meta.env.VITE_XXX` 访问

## 命令

```bash
pnpm install              # 安装依赖（必须用 pnpm，不是 npm）
npm run dev               # 开发服务器（localhost:80，后端 .env.local）
npm run dev-server        # 开发服务器（远程后端 .env.dev）
npm run build:prod        # 生产构建
npm run lint:eslint       # ESLint 修复
npm run lint:format       # Prettier 格式化
npm run lint:style        # Stylelint 修复
npm run ts:check          # TypeScript 类型检查
```

## 环境配置

| 文件 | 后端地址 | 输出目录 |
|------|----------|----------|
| `.env.local` | `localhost:48080` | `dist` |
| `.env.dev` | `8.138.211.121:20080` | `dist` |
| `.env.test` | `localhost:48080` | `dist-test` |
| `.env.stage` | staging 服务器 | `dist-stage` |
| `.env.prod` | 生产服务器 | `dist-prod` |

关键开关：`VITE_APP_TENANT_ENABLE`、`VITE_APP_CAPTCHA_ENABLE`、`VITE_DROP_DEBUGGER`、`VITE_DROP_CONSOLE`、`VITE_SOURCEMAP`。

## 调试

- Vue DevTools：浏览器扩展，查看组件树、Pinia 状态、路由
- 网络代理：修改 `.env.local` 中的 `VITE_BASE_URL` 指向不同后端
- 日志：`console.log` 在开发模式下保留，生产构建时 `VITE_DROP_CONSOLE=true` 会移除
- 类型检查：`npm run ts:check` 不产生输出文件，只做类型校验

## 测试

- 测试框架：Vitest
- 测试目录：`src/**/__tests__/` 或 `*.test.ts`
- 当前测试覆盖率：无（待补充）

## 代码规范

ESLint + Prettier + Stylelint + Commitlint。提交前运行 `npm run lint:eslint && npm run lint:style`。