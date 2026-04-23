<template>
  <div>
    <div class="list-box">
      <el-collapse v-model="activeName">
        <el-collapse-item :name="index" v-for="(item, index) in list" :key="item.__uiKey || index">
          <template #title>
            <div class="flex" style="justify-content: space-between;width: 100%;">
              <div class="cu-title" @click.stop>
                <el-radio-group style="margin-right: 20px;" model-value="1" class="ml-4">
                  <el-radio label="1" size="large">设备数据过滤</el-radio>
                </el-radio-group>
                <div class="item">
                  <el-radio-group v-model="item.deviceRadio">
                    <el-radio-button label="指定设备" />
                    <el-radio-button label="使用当前设备" />
                  </el-radio-group>
                </div>
                <div class="item" v-if="item.deviceRadio === '指定设备'">
                  <select-device v-model:dn="item.dn" placeholder="选择设备" @on-select="(row) => hadnleSelectDevice(row, item)" />
                </div>
              </div>
              <div style="padding-right: 10px;">
                <el-button @click="removeFliter(index)">删除</el-button>
              </div>
            </div>
          </template>
          <div class="condition-box" v-if="item.pk || item.deviceRadio === '使用当前设备'">
            <div class="flex items-center" style="padding: 10px;"> 
              <div class="mr-4">条件组合</div> 
              <el-radio-group v-model="item.cond"> 
                <el-radio :label="2">全部满足 (AND)</el-radio> 
                <el-radio :label="1">任意满足 (OR)</el-radio> 
                <el-radio :label="3">全部不满足 (NOT)</el-radio> 
              </el-radio-group> 
            </div>
            <div class="main">
              <div class="title">条件</div>
              <div class="main-box">
                <div class="box" v-for="(cond, condIndex) in item.conditions" :key="cond.__uiKey || condIndex">
                  <div class="item">
                    <el-row style="width: 100%;">
                      <el-col :span="4">
                        <el-select v-model="cond.type" placeholder="类型" @change="onTypeChange(cond)">
                          <el-option label="设备属性" value="property" />
                          <el-option label="设备状态" value="state" />
                          <el-option label="设备标签" value="tag" />
                        </el-select>
                      </el-col>
                      <el-col :span="6">
                        <el-cascader
                          v-if="cond.type === 'property'"
                          v-model="cond.identifier"
                          filterable
                          clearable
                          :show-all-levels="false"
                          :props="pathCascaderProps"
                          :options="getPropertyPathTree(item)"
                          placeholder="选择字段路径（支持逐层展开）"
                          @change="(e) => conditionChange(cond, e)"
                        />
                        <el-select
                          v-else
                          v-model="cond.identifier"
                          filterable
                          placeholder="选择字段路径"
                          @change="(e) => conditionChange(cond, e)"
                        >
                           <el-option
                             v-for="opt in getOptions(cond, item)"
                             :key="opt.identifier"
                             :label="formatPathOptionLabel(opt)"
                             :value="opt.identifier"
                           />
                        </el-select>
                      </el-col>
                      <el-col :span="14">
                        <el-row class="param-item">
                          <el-col :span="8">
                            <el-select v-model="cond.comparator" @change="onComparatorChange(cond)" placeholder="选择比较方式">
                              <el-option
                                v-for="cp in getAvailableComparators(getPk(item), cond.identifier)"
                                :label="cp.name"
                                :value="cp.value"
                                :key="cp.value"
                              >
                                <span>{{ cp.name }}</span>
                                <span v-if="cp.description" style="color: #999; font-size: 12px; margin-left: 8px;">
                                  {{ cp.description }}
                                </span>
                              </el-option>
                            </el-select>
                          </el-col>
                          <el-col :span="16">
                            <el-select
                              v-if="isBooleanCondition(item, cond)"
                              v-model="cond.value"
                              placeholder="选择布尔值"
                            >
                              <el-option
                                v-for="opt in getBooleanOptions(item, cond)"
                                :key="opt.value"
                                :label="opt.label"
                                :value="opt.value"
                              />
                            </el-select>
                            <el-select
                              v-else-if="isEnumCondition(item, cond)"
                              v-model="cond.value"
                              placeholder="选择枚举值"
                            >
                              <el-option
                                v-for="opt in getEnumOptions(item, cond)"
                                :key="opt.value"
                                :label="opt.label"
                                :value="opt.value"
                              />
                            </el-select>
                            <el-date-picker
                              v-else-if="isDateCondition(item, cond)"
                              v-model="cond.value"
                              type="date"
                              value-format="YYYY-MM-DD"
                              format="YYYY-MM-DD"
                              placeholder="选择日期"
                              style="width: 100%;"
                            />
                            <el-date-picker
                              v-else-if="isDateTimeCondition(item, cond)"
                              v-model="cond.value"
                              type="datetime"
                              value-format="YYYY-MM-DD HH:mm:ss"
                              format="YYYY-MM-DD HH:mm:ss"
                              placeholder="选择日期时间"
                              style="width: 100%;"
                            />
                            <el-input
                              v-else
                              v-model="cond.value"
                              auto-complete="off"
                              :placeholder="getValuePlaceholder(cond.comparator, getPk(item), cond.identifier)"
                              @blur="validateParamValue(cond, getPk(item))"
                            />
                          </el-col>
                        </el-row>
                      </el-col>
                    </el-row>
                  </div>
                  <el-button type="danger" size="small" style="margin-left: 10px;" @click="handleRemoveCondition(item, condIndex)">
                    <Icon icon="ep:delete" />
                  </el-button>
                </div>
              </div>
            </div>
            <el-button type="primary" size="small" style="margin-top: 12px;" @click="handleAddCondition(item)">新增条件</el-button>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
    <el-button style="margin-top: 10px;" @click="handleAdd">新增过滤器</el-button>
  </div>
</template>
<script lang="ts" setup>
import { propTypes } from '@/utils/propTypes'

import SelectDevice from '@/components/EiotSelect/select-device.vue'
import {ThingModelApi} from "@/api/eiot/thingmodel";

const props = defineProps({
  filters: propTypes.array.def([]),
  listeners: propTypes.array.def([]),
})
const emits = defineEmits(['update:filters'])
const arr: number[] = []
for (let i = 0; i < 100; i++) {
  arr.push(i)
}
const activeName = ref<number[]>(arr)
const list = ref<any[]>([])

const makeUiKey = () => `flt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const normalizeCondition = (raw: any) => ({
  ...(raw || {}),
  __uiKey: raw?.__uiKey || makeUiKey(),
})
const normalizeFilterItem = (raw: any) => {
  let item = raw || {}
  if (item.config && typeof item.config === 'string') {
    try {
      item = JSON.parse(item.config || '{}')
    } catch (e) {
      item = { ...item }
    }
  }
  return {
    ...item,
    cond: item.cond === undefined ? 2 : item.cond,
    conditions: Array.isArray(item.conditions) ? item.conditions.map((c: any) => normalizeCondition(c)) : [],
    __uiKey: item.__uiKey || makeUiKey(),
  }
}
const stripUiField = (raw: any) => {
  const rest = { ...(raw || {}) }
  delete rest.__uiKey
  if (Array.isArray(rest.conditions)) {
    rest.conditions = rest.conditions.map((c: any) => {
      const cRest = { ...(c || {}) }
      delete cRest.__uiKey
      return cRest
    })
  }
  return rest
}

watch(
  () => props.filters,
  (val) => {
    list.value = (val || []).map((item: any) => normalizeFilterItem(item))
  },
  { deep: true, immediate: true }
)

const hadnleSelectDevice = (device, row) => {
  if (!device.productKey) return
  row.pk = device.productKey
  getProductObjectModel(device.productKey)
}
const getProductObjectModel = (pk) => {
  if (!pk) {
    return
  }
  ThingModelApi.getThingModelByProductKey(pk).then((res) => {
    const data = res || {}
    initThingModel(pk, data)
  });
}

const COMPLEX_TYPE_SET = new Set(['object', 'struct', 'array'])

const normalizeTypeName = (type?: string) => {
  if (!type) return 'string'
  if (type === 'struct') return 'object'
  return type
}

const getDataTypeLabel = (dataType: any) => {
  const raw = typeof dataType === 'object' ? dataType?.type : dataType
  if (!raw) return 'any'
  return normalizeTypeName(raw)
}

const formatPathOptionLabel = (item: any) => {
  if (!item) return ''
  if (item.identifier === '*') return item.name || '*'
  const typeLabel = getDataTypeLabel(item.dataType)
  return `${item.name || item.identifier} [${typeLabel}]`
}

const mapTypeToUi = (type?: string) => {
  const t = normalizeTypeName(type)
  switch (t) {
    case 'int32':
    case 'int64':
      return 'int'
    case 'float':
    case 'double':
      return 'float'
    case 'bool':
    case 'boolean':
      return 'bool'
    case 'text':
    case 'string':
      return 'string'
    case 'date':
      return 'date'
    case 'datetime':
      return 'datetime'
    case 'position':
      return 'position'
    case 'enum':
      return 'enum'
    case 'array':
      return 'array'
    case 'object':
      return 'object'
    default:
      return t
  }
}

const pathCascaderProps = {
  emitPath: false,
  value: 'value',
  label: 'label',
  children: 'children',
}

const buildNestedPathTree = (
  baseIdentifier: string,
  baseName: string,
  dataType: any,
  depth = 0
): any => {
  const normalizedType = normalizeTypeName(dataType?.type || dataType)
  const node: any = {
    value: baseIdentifier,
    label: `${baseName} [${normalizedType}]`,
    dataType: typeof dataType === 'object' ? dataType : { type: normalizedType },
  }
  if (depth >= 4) {
    return node
  }
  if (normalizedType === 'object') {
    const properties = dataType?.specs?.properties || []
    const children = properties
      .filter((p: any) => p?.identifier && p?.dataType)
      .map((p: any) =>
        buildNestedPathTree(
          `${baseIdentifier}.${p.identifier}`,
          p.name || p.identifier,
          p.dataType,
          depth + 1
        )
      )
    if (children.length > 0) {
      node.children = children
    }
  } else if (normalizedType === 'array') {
    const itemType = dataType?.specs?.itemType
    if (itemType) {
      const child = buildNestedPathTree(
        `${baseIdentifier}[*]`,
        '每项',
        itemType,
        depth + 1
      )
      node.children = [child]
    }
  }
  return node
}

const buildNestedPathOptions = (
  baseIdentifier: string,
  baseName: string,
  dataType: any,
  depth = 0
): Array<{ type: string; identifier: string; name: string; dataType: any }> => {
  const normalizedType = normalizeTypeName(dataType?.type || dataType)
  const baseOption = {
    type: 'property',
    identifier: baseIdentifier,
    name: baseName,
    dataType: typeof dataType === 'object' ? dataType : { type: normalizedType }
  }
  if (depth >= 4) {
    return [baseOption]
  }
  if (normalizedType === 'object') {
    const properties = dataType?.specs?.properties || []
    const options: Array<{ type: string; identifier: string; name: string; dataType: any }> = []
    properties.forEach((p: any) => {
      if (!p?.identifier || !p?.dataType) return
      const nextIdentifier = `${baseIdentifier}.${p.identifier}`
      const nextName = `${baseName} / ${p.name || p.identifier}`
      options.push(...buildNestedPathOptions(nextIdentifier, nextName, p.dataType, depth + 1))
    })
    return options.length ? options : [baseOption]
  }
  if (normalizedType === 'array') {
    const itemType = dataType?.specs?.itemType
    if (!itemType) return [baseOption]
    const nextIdentifier = `${baseIdentifier}[*]`
    const nextName = `${baseName} / 每项`
    return buildNestedPathOptions(nextIdentifier, nextName, itemType, depth + 1)
  }
  return [baseOption]
}

const stateMap = ref(new Map())
const initThingModel = (pk, res) => {
  const propertyTree: any[] = [{ value: '*', label: '任意字段（*）' }]
  const modelItems: any[] = []
  let items: any[] = []
  modelItems.push({
    name: '属性',
    items: items,
  })
  res?.model?.properties &&
    res.model.properties.forEach((p) => {
      propertyTree.push(
        buildNestedPathTree(
          p.identifier,
          p.name || p.identifier,
          p.dataType
        )
      )
      items.push(
        ...buildNestedPathOptions(
          p.identifier,
          p.name || p.identifier,
          p.dataType
        )
      )
      return
      items.push({
        type: 'property',
        identifier: p.identifier,
        name: p.name,
        dataType: p.dataType,
      })
    })

  modelItems.push({
    name: '状态',
    items: [
      {
        type: 'state',
        identifier: 'online',
        name: '是否在线',
      },
    ],
  })
  stateMap.value.set(pk, {
    modelItems,
    propertyTree,
  })
  handleEmits()
}

const getPropertyPathTree = (item) => {
  const pk = getPk(item)
  return stateMap.value.get(pk)?.propertyTree || []
}

const getPk = (item) => {
  if (item.deviceRadio === '指定设备') {
    return item.pk
  }
  if (props.listeners && props.listeners.length > 0) {
    const l = props.listeners.find(x => x.type === 'device' && x.pk)
    return l ? l.pk : null
  }
  return null
}

watch(
  () => props.listeners,
  (val) => {
    if (val) {
      val.forEach((l) => {
        if (l.type === 'device' && l.pk) {
          getProductObjectModel(l.pk)
        }
      })
    }
  },
  { deep: true, immediate: true }
)

const handleEmits = () => {
  list.value.forEach((config: any) => {
    if (config?.pk && !stateMap.value.has(config.pk)) getProductObjectModel(config.pk)
    if (config.cond === undefined) config.cond = 2

    // Ensure type is set for conditions
    if (config.conditions) {
      config.conditions.forEach((c: any) => {
        if (!c.type && c.identifier && config.pk) {
          const groups = stateMap.value.get(config.pk)?.modelItems
          if (groups) {
            for (const g of groups) {
              const found = g.items.find((i: any) => i.identifier === c.identifier)
              if (found) {
                c.type = found.type
                break
              }
            }
          }
        }
      })
    }
  })
  emits('update:filters', toRaw(list.value).map((item: any) => stripUiField(item)))
}
watch(
  list,
  () => {
    handleEmits()
  },
  {
    deep: true,
  }
)
// 鏂板杩囨护鍣?
const handleAdd = () => {
  list.value.push(normalizeFilterItem({
    deviceRadio: '指定设备',
    cond: 2,
    conditions: [
      {
        parameters: [],
      },
    ],
  }))
}

// 鍒犻櫎杩囨护鍣?
const removeFliter = (index: number) => {
  list.value.splice(index, 1)
}
const comparators = ref([
  { name: '等于', value: '==', description: '值完全相等' },
  { name: '不等于', value: '!=', description: '值不相等' },
  { name: '大于', value: '>', description: '数值大于比较值' },
  { name: '小于', value: '<', description: '数值小于比较值' },
  { name: '大于等于', value: '>=', description: '数值大于等于比较值' },
  { name: '小于等于', value: '<=', description: '数值小于等于比较值' },
  { name: '在区间内', value: 'between', description: '格式：最小值-最大值，例如 10-20' },
  { name: '不在区间内', value: 'notBetween', description: '格式：最小值-最大值，例如 10-20' },
  { name: '包含', value: 'contain', description: '包含指定关键字' },
  { name: '不包含', value: 'notContain', description: '不包含指定关键字' }
])

// 鏍规嵁灞炴€х被鍨嬭幏鍙栧彲鐢ㄧ殑姣旇緝鍣?
const getAvailableComparators = (pk: string, identifier: string) => {
  // 纭繚comparators瀛樺湪
  if (!comparators.value || !Array.isArray(comparators.value) || comparators.value.length === 0) {
    return []
  }

  // 妫€鏌ュ繀瑕佺殑鍙傛暟
  if (!pk || !identifier) {
    return comparators.value
  }

  // 鑾峰彇灞炴€х殑鏁版嵁绫诲瀷
  const propertyType = getPropertyDataType(pk, identifier)

  // 鏍规嵁鏁版嵁绫诲瀷杩囨护姣旇緝鍣?
  switch (propertyType) {
    case 'int':
    case 'float':
    case 'double':
    case 'long':
    case 'int32':
    case 'int64':
      // 鏁板€肩被鍨嬶細鏀寔鎵€鏈夋瘮杈冨櫒
      return comparators.value

    case 'text':
    case 'string':
      // 瀛楃涓茬被鍨嬶細涓嶆敮鎸佹暟鍊兼瘮杈?
      return comparators.value.filter(c =>
        !['>', '<', '>=', '<=', 'between', 'notBetween'].includes(c.value)
      )
    case 'date':
    case 'datetime':
      return comparators.value.filter(c =>
        ['==', '!=', '>', '<', '>=', '<=', 'between', 'notBetween'].includes(c.value)
      )

    case 'bool':
    case 'boolean':
      // 甯冨皵绫诲瀷锛氬彧鏀寔绛変簬鍜屼笉绛変簬
      return comparators.value.filter(c =>
        ['==', '!='].includes(c.value)
      )

    case 'enum':
      return comparators.value.filter(c =>
        ['==', '!=', 'contain', 'notContain'].includes(c.value)
      )
    case 'array':
    case 'object':
    case 'struct':
      return comparators.value.filter(c =>
        ['==', '!=', 'contain', 'notContain'].includes(c.value)
      )

    default:
      // 鏈煡绫诲瀷锛氳繑鍥炲熀纭€姣旇緝鍣?
      return comparators.value.filter(c =>
        ['==', '!=', 'contain', 'notContain'].includes(c.value)
      )
  }
}

// 鑾峰彇灞炴€х殑鏁版嵁绫诲瀷
const getPropertyDataType = (pk: string, identifier: string) => {
  if (!pk || !identifier) return 'string'
  const groups = stateMap.value.get(pk)?.modelItems
  if (!groups) return 'string'

  let dataTypeInfo = null
  for (const group of groups) {
    const item = group.items.find(i => i.identifier === identifier)
    if (item) {
       dataTypeInfo = item.dataType
       break
    }
  }

  if (!dataTypeInfo) return 'string'

  // 濡傛灉dataType鏄璞′笖鍖呭惈type瀛楁锛屽垯浣跨敤type瀛楁鐨勫€?
  if (typeof dataTypeInfo === 'object' && dataTypeInfo.type) {
    const type = dataTypeInfo.type
    // 鏍囧噯鍖栨暟鎹被鍨嬪悕绉?
    switch (type) {
      case 'int32':
      case 'int64':
        return 'int'
      case 'float':
      case 'double':
        return 'float'
      case 'bool':
      case 'boolean':
        return 'bool'
      case 'text':
      case 'string':
        return 'string'
      case 'enum':
        return 'enum'
      case 'array':
        return 'array'
      case 'object':
        return 'object'
      case 'struct':
        return 'object'
      default:
        return type
    }
  }

  // 濡傛灉dataType鏄瓧绗︿覆锛岀洿鎺ヨ繑鍥?
  if (typeof dataTypeInfo === 'string') {
    return mapTypeToUi(dataTypeInfo)
  }

  return 'string'
}

const getConditionDataType = (item: any, cond: any) => {
  const pk = getPk(item)
  if (!pk || !cond?.identifier) return 'string'
  return getPropertyDataType(pk, cond.identifier)
}

const isBooleanCondition = (item: any, cond: any) => {
  if (!['==', '!='].includes(cond?.comparator || '')) return false
  const type = getConditionDataType(item, cond)
  if (['bool', 'boolean'].includes(type)) {
    cond.value = normalizeBooleanValue(cond?.value)
  }
  return ['bool', 'boolean'].includes(type)
}

const isDateCondition = (item: any, cond: any) => {
  const type = getConditionDataType(item, cond)
  return type === 'date' && !['between', 'notBetween'].includes(cond?.comparator || '')
}

const isDateTimeCondition = (item: any, cond: any) => {
  const type = getConditionDataType(item, cond)
  return type === 'datetime' && !['between', 'notBetween'].includes(cond?.comparator || '')
}

const isEnumCondition = (item: any, cond: any) => {
  if (!cond?.comparator) return false
  const type = getConditionDataType(item, cond)
  return type === 'enum'
}

const getEnumOptions = (item: any, cond: any) => {
  const pk = getPk(item)
  if (!pk || !cond?.identifier) return []
  const groups = stateMap.value.get(pk)?.modelItems || []
  let dataTypeInfo: any = null
  for (const group of groups) {
    const found = group.items.find((i: any) => i.identifier === cond.identifier)
    if (found?.dataType) {
      dataTypeInfo = found.dataType
      break
    }
  }
  const specs = dataTypeInfo?.specs
  if (!specs || typeof specs !== 'object') return []
  return Object.keys(specs).map((key) => ({
    value: String(key),
    label: String(specs[key] ?? key)
  }))
}

const normalizeBooleanValue = (value: any) => {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'true' || raw === '1') return '1'
  if (raw === 'false' || raw === '0') return '0'
  return raw
}

const getBooleanOptions = (item: any, cond: any) => {
  const pk = getPk(item)
  if (!pk || !cond?.identifier) {
    return [
      { value: '0', label: '0（关闭/否）' },
      { value: '1', label: '1（开启/是）' }
    ]
  }
  const groups = stateMap.value.get(pk)?.modelItems || []
  let dataTypeInfo: any = null
  for (const group of groups) {
    const found = group.items.find((i: any) => i.identifier === cond.identifier)
    if (found?.dataType) {
      dataTypeInfo = found.dataType
      break
    }
  }
  const specs = dataTypeInfo?.specs || {}
  const label0 = String(specs?.[0] ?? specs?.['0'] ?? '关闭/否')
  const label1 = String(specs?.[1] ?? specs?.['1'] ?? '开启/是')
  return [
    { value: '0', label: `0（${label0}）` },
    { value: '1', label: `1（${label1}）` }
  ]
}

// 鑾峰彇鍙傛暟鍊艰緭鍏ユ彁绀?
const getValuePlaceholder = (comparator, pk?: string, identifier?: string) => {
  if (!comparator) return '请输入比较值'
  const dataType = pk && identifier ? getPropertyDataType(pk, identifier) : 'string'
  if (['between', 'notBetween'].includes(comparator)) {
    return '请输入范围，格式：最小值-最大值'
  }
  if (['contain', 'notContain'].includes(comparator)) {
    return ['array', 'object', 'struct'].includes(dataType)
      ? '请输入关键字（建议配合子字段路径）'
      : '请输入要匹配的文本'
  }
  if (['>', '<', '>=', '<='].includes(comparator)) {
    return '请输入数值'
  }
  if (dataType === 'enum') return '请选择枚举值'
  if (['bool', 'boolean'].includes(dataType)) return '请选择布尔值（系统统一存储 0/1）'
  if (dataType === 'date') return '请选择日期'
  if (dataType === 'datetime') return '请选择日期时间'
  return '请输入比较值'
}

// 姣旇緝鍣ㄥ彉鍖栧鐞?
const onComparatorChange = (param) => {
  if (!param) return
  // 娓呯┖涔嬪墠鐨勫€硷紝閬垮厤鏍煎紡涓嶅尮閰?
  param.value = ''
}

// 楠岃瘉鍙傛暟鍊?
const validateParamValue = (param, pk?: string) => {
  if (!param || !param.value || !param.comparator) return true
}

// 鏂板鏉′欢
const handleAddCondition = (item: any) => {
  if (!item.conditions) item.conditions = []
  item.conditions.push(normalizeCondition({}))
}
// 鍒犻櫎鏉′欢
const handleRemoveCondition = (item: any, index: number) => {
  item.conditions.splice(index, 1)
}

// 鏂板鍙傛暟
const addParmeter = (cond: any) => {
  if (!cond.parameters) cond.parameters = []
  cond.parameters.push({})
}
// 鍒犻櫎鍙傛暟
const removeParmeter = (index: number, cond: any) => {
  cond.parameters.splice(index, 1)
}
const conditionChange = (cond, e) => {
  // identifier changed
  // maybe reset comparator or value
}

// 鐩戝惉绫诲瀷鍙樺寲
const onTypeChange = (cond: any) => {
  cond.identifier = ''
  cond.value = ''
  cond.comparator = ''
}

// 鑾峰彇閫夐」鍒楄〃
const getOptions = (cond: any, item: any) => {
  const pk = getPk(item)
  if (!pk) return []
  const groups = stateMap.value.get(pk)?.modelItems
  if (!groups) return []
  
  if (!cond.type) return []
  
  let result: any[] = []
  groups.forEach((g: any) => {
    g.items.forEach((i: any) => {
      if (i.type === cond.type) {
        result.push(i)
      }
    })
  })
  return result
}

onUnmounted(() => {
  list.value = []
})
</script>

<style lang="scss" scoped>
.list-box {
  margin-top: 10px;
  .cu-title {
    width: calc(100% - 30px);
    cursor: auto;
    display: flex;
    align-items: center;
    .item {
      width: 250px;
      margin-right: 10px;
    }
  }
}
::v-deep(.el-collapse-item__header) {
  background-color: #f2f2f2;
  padding: 0 12px;
}
.condition-box {
  background-color: #f2f2f2;
  padding: 15px;
  border-top: 1px solid #d9d9d9;
  .main {
    border: 2px dashed rgb(217, 217, 217);
    .title {
      padding: 12px;
      color: #333;
      font-weight: 600;
      border-bottom: 1px solid rgb(217, 217, 217);
    }
    .main-box {
      padding: 10px;
      .box {
        display: flex;
        align-items: center;
        .item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0px;
          flex: 1;
          .param-item {
            margin-bottom: 8px;
          }
        }
        // .el-button {
        //   width: 50px;
        // }
      }
    }
  }
}
</style>
