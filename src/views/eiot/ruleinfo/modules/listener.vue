<template>
  <div>
    <div class="list-box">
      <el-collapse v-model="activeName">
        <el-collapse-item :name="index" v-for="(item, index) in list" :key="index">
          <template #title>
            <div class="flex" style="justify-content: space-between;width: 100%;">
              <div class="cu-title" @click.stop>
                <el-radio-group style="margin-right: 20px;" v-model="item.type" class="ml-4">
                  <el-radio label="device" size="large">设备监听</el-radio>
                </el-radio-group>
                <div class="item">
                  <select-product v-model:pk="item.pk" @on-select="(row) => handleSelectProduct(row, item)" />
                </div>
                <div class="item" v-if="item.pk">
                  <select-device v-model:dn="item.dn" placeholder="默认全部设备" :product-pk="item.pk || ''" @on-select="handleEmits" />
                </div>
              </div>
              <div style="padding-right: 10px;">
                <el-button @click="removeListener(index)">删除</el-button>
              </div>
            </div>
          </template>
          <div class="condition-box" v-if="item.pk">
            <div class="main">
              <div class="title">条件</div>
              <div class="main-box">
                <div class="box" v-for="(cond, condIndex) in item.conditions" :key="condIndex">
                  <div class="item">
                    <el-row style="width: 100%;">
                      <el-col :span="7">
                        <el-select v-model="cond.identifier" filterable @change="(e) => conditionChange(cond, (stateMap.get(item.pk)?.modelItems || []), e)">
                          <el-option-group v-for="group in (stateMap.get(item.pk)?.modelItems || [])" :key="group.name" :label="group.name">
                            <el-option v-for="pro in group.items" :label="formatPathOptionLabel(pro)" :value="pro.identifier" :key="pro.identifier" />
                          </el-option-group>
                        </el-select>
                      </el-col>
                      <el-col :span="15" v-if="!cond?.identifier?.endsWith(':*')">
                        <el-row class="param-item" v-for="(param, paramIndex) in cond.parameters" :key="param.identifier">
                          <!-- 灞炴€т笂鎶ョ殑灞炴€ч€夋嫨 -->
                          <el-col :span="10" v-if="cond.identifier == 'report'">
                            <el-cascader
                              v-model="param.identifier"
                              filterable
                              clearable
                              style="width: 100%;"
                              :show-all-levels="false"
                              :props="pathCascaderProps"
                              :options="getPropertyPathTree(item.pk)"
                              placeholder="选择属性字段路径（逐层展开）"
                            />
                          </el-col>
                          <!-- 浜嬩欢鐨勫睘鎬ч€夋嫨 -->
                          <el-col :span="10" v-else-if="cond.type == 'event' && cond.identifier && !cond.identifier.endsWith(':*')">
                            <el-cascader
                              v-model="param.identifier"
                              filterable
                              clearable
                              style="width: 100%;"
                              :show-all-levels="false"
                              :props="pathCascaderProps"
                              :options="getEventPathTree(item.pk, cond.identifier)"
                              placeholder="选择事件字段路径（逐层展开）"
                            />
                          </el-col>
                          <!-- 鏈嶅姟鐨勫睘鎬ч€夋嫨 -->
                          <el-col :span="10" v-else-if="cond.type == 'service' && cond.identifier && !cond.identifier.endsWith(':*')">
                            <el-cascader
                              v-model="param.identifier"
                              filterable
                              clearable
                              style="width: 100%;"
                              :show-all-levels="false"
                              :props="pathCascaderProps"
                              :options="getServicePathTree(item.pk, cond.identifier)"
                              placeholder="选择服务输出字段路径（逐层展开）"
                            />
                          </el-col>
                          <el-col :span="6">
                            <el-select v-model="param.comparator" @change="onComparatorChange(param)" placeholder="选择比较方式">
                              <el-option
                                v-for="cp in getAvailableComparators(item.pk, cond, param)"
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
                          <el-col :span="5">
                            <el-select
                              v-if="isBooleanParam(item.pk, cond, param)"
                              v-model="param.value"
                              placeholder="选择布尔值"
                            >
                              <el-option
                                v-for="opt in getParamBooleanOptions(item.pk, cond, param)"
                                :key="opt.value"
                                :label="opt.label"
                                :value="opt.value"
                              />
                            </el-select>
                            <el-select
                              v-else-if="isEnumParam(item.pk, cond, param)"
                              v-model="param.value"
                              placeholder="选择枚举值"
                            >
                              <el-option
                                v-for="opt in getParamEnumOptions(item.pk, cond, param)"
                                :key="opt.value"
                                :label="opt.label"
                                :value="opt.value"
                              />
                            </el-select>
                            <el-date-picker
                              v-else-if="isDateParam(item.pk, cond, param)"
                              v-model="param.value"
                              type="date"
                              value-format="YYYY-MM-DD"
                              format="YYYY-MM-DD"
                              placeholder="选择日期"
                              style="width: 100%;"
                            />
                            <el-date-picker
                              v-else-if="isDateTimeParam(item.pk, cond, param)"
                              v-model="param.value"
                              type="datetime"
                              value-format="YYYY-MM-DD HH:mm:ss"
                              format="YYYY-MM-DD HH:mm:ss"
                              placeholder="选择日期时间"
                              style="width: 100%;"
                            />
                            <el-input
                              v-else
                              v-model="param.value"
                              auto-complete="off"
                              :placeholder="getValuePlaceholder(param.comparator, item.pk, cond, param)"
                              @blur="validateParamValue(param, item.pk, cond)"
                            />
                          </el-col>
                          <el-col :span="1">
                            <el-button
                              style="margin-left: 6px;"
                              type="danger"
                              size="small"
                              circle
                              @click="removeParmeter(paramIndex, cond)"
                            >
                              <Icon icon="ep:delete" />
                            </el-button>
                          </el-col>
                        </el-row>
                      </el-col>
                      <el-col :span="2" v-if="!cond?.identifier?.endsWith(':*') && cond.identifier">
                        <el-button type="primary" size="small" circle @click="addParmeter(cond)">
                          <Icon icon="ep:plus" />
                        </el-button>
                      </el-col>
                    </el-row>
                  </div>
                  <el-button
                    type="danger"
                    size="small"
                    style="margin-left: 10px;"
                    @click="handleRemoveCondition(item, condIndex)"
                  >
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
    <el-button style="margin-top: 10px;" @click="handleAdd">新增监听器</el-button>
  </div>
</template>
<script lang="ts" setup>
import { propTypes } from '@/utils/propTypes'
import { generateUUID } from '@/utils'

import SelectProduct from '@/components/EiotSelect/select-product.vue'
import SelectDevice from '@/components/EiotSelect/select-device.vue'
import {ThingModelApi} from "@/api/eiot/thingmodel";

const props = defineProps({
  listeners: propTypes.array.def([]),
})
const emits = defineEmits(['update:listeners'])
const arr: number[] = []
for (let i = 0; i < 100; i++) {
  arr.push(i)
}

const activeName = ref<number[]>(arr)
const list = ref<any[]>(props.listeners || [])
const syncingFromProps = ref(false)

// 閫夋嫨浜у搧-璋冪敤鐗╂ā鍨?
const handleSelectProduct = (product, item) => {
  console.log('product', product)
  if (!product.productKey) return
  console.log('item', item)
  item.dn = ''
  getProductObjectModel(product.productKey)

}

const getProductObjectModel = (pk) => {
  if (!pk) {
    return
  }
  ThingModelApi.getThingModelByProductKey(pk).then((res) => {
    const data = res || {}
    initThingModel(pk, data)
  })
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
      return 'int'
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
    case 'date':
      return 'date'
    case 'datetime':
      return 'datetime'
    case 'position':
      return 'position'
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
    dataType: typeof dataType === 'object' ? dataType : { type: normalizedType }
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
): Array<{ identifier: string; name: string; dataType: any }> => {
  const normalizedType = normalizeTypeName(dataType?.type || dataType)
  const baseOption = {
    identifier: baseIdentifier,
    name: baseName,
    dataType: typeof dataType === 'object' ? dataType : { type: normalizedType }
  }
  if (depth >= 4) {
    return [baseOption]
  }
  if (normalizedType === 'object') {
    const properties = dataType?.specs?.properties || []
    const options: Array<{ identifier: string; name: string; dataType: any }> = []
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
const initThingModel = (pk, res) => {
  const state: any = {
    modelItems: [],
    properties: [],
    events: [],
    services: [],
    propertyTree: [{ value: '*', label: '任意字段（*）' }],
    eventTreeMap: {},
    serviceTreeMap: {},
  }

  state.modelItems.push({
    name: '通配',
    items: [
      {
        type: 'state',
        identifier: 'state:*',
        name: '设备上下线',
      },
      {
        type: 'event',
        identifier: 'event:*',
        name: '任意事件上报',
      },
      {
        type: 'service_reply',
        identifier: 'service_reply:*',
        name: '任意服务回复',
      },
    ],
  })

  let items: any[] = []
  state.modelItems.push({
    name: '精准匹配',
    items: items,
  })
  items.push({
    type: 'property',
    identifier: 'report',
    name: '属性上报',
  })
  res?.model?.events &&
  res.model.events.forEach((s) => {
    items.push({
      type: 'event',
      identifier: s.identifier,
      name: s.name,
    })
  })
  res?.model?.services &&
  res.model.services.forEach((s) => {
    items.push({
      type: 'service',
      identifier: s.identifier,
      name: s.name,
    })
  })

  state.properties.push({
    identifier: '*',
    name: '任意',
  })
  res?.model?.properties &&
  res.model.properties.forEach((p) => {
    state.propertyTree.push(
      buildNestedPathTree(
        p.identifier,
        p.name || p.identifier,
        p.dataType
      )
    )
    state.properties.push(
      ...buildNestedPathOptions(
        p.identifier,
        p.name || p.identifier,
        p.dataType
      )
    )
    return
    state.properties.push({
      identifier: p.identifier,
      name: p.name,
      dataType: p.dataType, // 淇濆瓨瀹屾暣鐨?dataType 淇℃伅
    })
  })

  res?.model?.events &&
  res.model.events.forEach((s) => {
    let items: any[] = []
    const treeItems: any[] = [{ value: '*', label: '任意字段（*）' }]
    state.events.push({
      identifier: s.identifier,
      items: items,
    })
    state.eventTreeMap[s.identifier] = treeItems

    (s.outputData || []).forEach((p) => {
      treeItems.push(
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
        identifier: p.identifier,
        name: p.name,
        dataType: p.dataType, // 淇濆瓨瀹屾暣鐨?dataType 淇℃伅
      })
    })
  })

  res?.model?.services &&
  res.model.services.forEach((s) => {
    let items: any[] = []
    const treeItems: any[] = [{ value: '*', label: '任意字段（*）' }]
    state.services.push({
      identifier: s.identifier,
      items: items,
    })
    state.serviceTreeMap[s.identifier] = treeItems

    (s.outputData || []).forEach((p) => {
      treeItems.push(
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
        identifier: p.identifier,
        name: p.name,
        dataType: p.dataType, // 淇濆瓨瀹屾暣鐨?dataType 淇℃伅
      })
    })
  })
  stateMap.value.set(pk, state)
  handleEmits()
}

const getPropertyPathTree = (pk: string) => {
  return stateMap.value.get(pk)?.propertyTree || []
}

const getEventPathTree = (pk: string, eventIdentifier: string) => {
  return stateMap.value.get(pk)?.eventTreeMap?.[eventIdentifier] || []
}

const getServicePathTree = (pk: string, serviceIdentifier: string) => {
  return stateMap.value.get(pk)?.serviceTreeMap?.[serviceIdentifier] || []
}

const stateMap = ref(new Map())
const handleEmits = () => {
  const arr = toRaw(list.value).map((m) => {
    let config = m
    console.log('config:', config)
    if (config.config) {
      config = JSON.parse(config.config || '{}')
    }
    if (!stateMap.value.has(config.pk)) getProductObjectModel(config.pk)
    return {
      ...config,
    }
  })
  emits('update:listeners', arr)
}
watch(
  () => props.listeners,
  (val) => {
    syncingFromProps.value = true
    list.value = Array.isArray(val) ? [...val] : []
    nextTick(() => {
      syncingFromProps.value = false
    })
  },
  {
    immediate: true,
    deep: true,
  }
)
watch(
  list,
  () => {
    if (syncingFromProps.value) return
    handleEmits()
  },
  {
    deep: true,
  }
)
// 鏂板鐩戝惉鍣?
const handleAdd = () => {
  list.value.push({
    type: 'device',
    conditions: [
      {
        parameters: [],
      },
    ],
  })
}

// 鍒犻櫎鐩戝惉鍣?
const removeListener = (index: number) => {
  list.value.splice(index, 1)
}
/**
 * 鏉′欢姣旇緝鍣ㄩ厤缃?- 涓嶦xpression.java涓殑琛ㄨ揪寮忓鐞嗕繚鎸佷竴鑷?
 *
 * 瀵瑰簲Expression.java涓殑eval鏂规硶鏀寔鐨勬搷浣滅:
 * - == : 瀛楃涓茬浉绛夋瘮杈?(value.equals(triggerValue))
 * - != : 瀛楃涓蹭笉绛夋瘮杈?(!value.equals(triggerValue))
 * - > : 鏁板€煎ぇ浜庢瘮杈?(Double.parseDouble(value) > Double.parseDouble(triggerValue))
 * - < : 鏁板€煎皬浜庢瘮杈?(Double.parseDouble(value) < Double.parseDouble(triggerValue))
 * - >= : 鏁板€煎ぇ浜庣瓑浜庢瘮杈?(Double.parseDouble(value) >= Double.parseDouble(triggerValue))
 * - <= : 鏁板€煎皬浜庣瓑浜庢瘮杈?(Double.parseDouble(value) <= Double.parseDouble(triggerValue))
 * - between : 鏁板€艰寖鍥村唴姣旇緝锛屾牸寮? "鏈€灏忓€?鏈€澶у€? (min <= value <= max)
 * - notBetween : 鏁板€艰寖鍥村姣旇緝锛屾牸寮? "鏈€灏忓€?鏈€澶у€? (value <= min || value >= max)
 * - contain : 瀛楃涓插寘鍚瘮杈?(value.contains(triggerValue))
 * - notContain : 瀛楃涓蹭笉鍖呭惈姣旇緝 (!value.contains(triggerValue))
 */
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

// 鑾峰彇浜嬩欢鐨勫睘鎬у垪琛?
const getEventProperties = (pk: string, eventIdentifier: string) => {
  const state = stateMap.value.get(pk)
  if (!state || !state.events) return []

  const event = state.events.find(e => e.identifier === eventIdentifier)
  if (!event || !event.items) return []

  // 娣诲姞"浠绘剰"閫夐」鍜屽叿浣撳睘鎬?
  return [{ identifier: '*', name: '任意字段' }, ...event.items]
}

// 鑾峰彇鏈嶅姟鐨勮緭鍑哄弬鏁板垪琛?
const getServiceProperties = (pk: string, serviceIdentifier: string) => {
  const state = stateMap.value.get(pk)
  if (!state || !state.services) return []

  const service = state.services.find(s => s.identifier === serviceIdentifier)
  if (!service || !service.items) return []

  // 娣诲姞"浠绘剰"閫夐」鍜屽叿浣撳弬鏁?
  return [{ identifier: '*', name: '任意参数' }, ...service.items]
}

// 鏍规嵁灞炴€х被鍨嬭幏鍙栧彲鐢ㄧ殑姣旇緝鍣?
const getAvailableComparators = (pk: string, cond: any, param: any) => {
  // 纭繚comparators瀛樺湪
  if (!comparators.value || !Array.isArray(comparators.value) || comparators.value.length === 0) {
    return []
  }

  // 妫€鏌ュ繀瑕佺殑鍙傛暟
  if (!pk || !cond || !param) {
    return comparators.value
  }

  // 濡傛灉娌℃湁閫夋嫨鍏蜂綋灞炴€э紝杩斿洖鎵€鏈夋瘮杈冨櫒
  if (!param.identifier || param.identifier === '*') {
    return comparators.value
  }

  // 鑾峰彇灞炴€х殑鏁版嵁绫诲瀷
  const propertyType = getPropertyDataType(pk, cond, param)

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
const getPropertyDataType = (pk: string, cond: any, param: any) => {
  // 闃插尽鎬ф鏌?
  if (!pk || !cond || !param) {
    return 'string'
  }

  const state = stateMap.value.get(pk)

  if (!state) return 'string'

  let dataTypeInfo = null

  // 鏍规嵁鏉′欢绫诲瀷鑾峰彇灞炴€т俊鎭?
  if (cond.identifier === 'report') {
    // 灞炴€т笂鎶ワ細浠巔roperties涓煡鎵?
    const property = state.properties?.find(p => p.identifier === param.identifier)
    dataTypeInfo = property?.dataType
  } else if (cond.type === 'event') {
    // 浜嬩欢锛氫粠events涓煡鎵?
    const event = state.events?.find(e => e.identifier === cond.identifier)
    const eventParam = event?.items?.find(p => p.identifier === param.identifier)
    dataTypeInfo = eventParam?.dataType
  } else if (cond.type === 'service') {
    // 鏈嶅姟锛氫粠services涓煡鎵?
    const service = state.services?.find(s => s.identifier === cond.identifier)
    const serviceParam = service?.items?.find(p => p.identifier === param.identifier)
    dataTypeInfo = serviceParam?.dataType
  }

  // 澶勭悊鐗╂ā鍨嬩腑鐨勬暟鎹被鍨嬬粨鏋?
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

  if (typeof dataTypeInfo === 'string') {
    return mapTypeToUi(dataTypeInfo)
  }

  return 'string'
}

const isBooleanParam = (pk: string, cond: any, param: any) => {
  if (!['==', '!='].includes(param?.comparator || '')) return false
  const type = getPropertyDataType(pk, cond, param)
  return ['bool', 'boolean'].includes(type)
}

const isDateParam = (pk: string, cond: any, param: any) => {
  const type = getPropertyDataType(pk, cond, param)
  return type === 'date' && !['between', 'notBetween'].includes(param?.comparator || '')
}

const isDateTimeParam = (pk: string, cond: any, param: any) => {
  const type = getPropertyDataType(pk, cond, param)
  return type === 'datetime' && !['between', 'notBetween'].includes(param?.comparator || '')
}

const isEnumParam = (pk: string, cond: any, param: any) => {
  const type = getPropertyDataType(pk, cond, param)
  return type === 'enum'
}

const getParamEnumOptions = (pk: string, cond: any, param: any) => {
  const state = stateMap.value.get(pk)
  if (!state) return []

  let dataTypeInfo: any = null
  if (cond.identifier === 'report') {
    const property = state.properties?.find((p: any) => p.identifier === param.identifier)
    dataTypeInfo = property?.dataType
  } else if (cond.type === 'event') {
    const event = state.events?.find((e: any) => e.identifier === cond.identifier)
    const eventParam = event?.items?.find((p: any) => p.identifier === param.identifier)
    dataTypeInfo = eventParam?.dataType
  } else if (cond.type === 'service') {
    const service = state.services?.find((s: any) => s.identifier === cond.identifier)
    const serviceParam = service?.items?.find((p: any) => p.identifier === param.identifier)
    dataTypeInfo = serviceParam?.dataType
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

const getParamBooleanOptions = (pk: string, cond: any, param: any) => {
  const state = stateMap.value.get(pk)
  if (!state) {
    return [
      { value: '0', label: '0（关闭/否）' },
      { value: '1', label: '1（开启/是）' }
    ]
  }

  let dataTypeInfo: any = null
  if (cond.identifier === 'report') {
    const property = state.properties?.find((p: any) => p.identifier === param.identifier)
    dataTypeInfo = property?.dataType
  } else if (cond.type === 'event') {
    const event = state.events?.find((e: any) => e.identifier === cond.identifier)
    const eventParam = event?.items?.find((p: any) => p.identifier === param.identifier)
    dataTypeInfo = eventParam?.dataType
  } else if (cond.type === 'service') {
    const service = state.services?.find((s: any) => s.identifier === cond.identifier)
    const serviceParam = service?.items?.find((p: any) => p.identifier === param.identifier)
    dataTypeInfo = serviceParam?.dataType
  }

  const specs = dataTypeInfo?.specs || {}
  const label0 = String(specs?.[0] ?? specs?.['0'] ?? '关闭/否')
  const label1 = String(specs?.[1] ?? specs?.['1'] ?? '开启/是')
  return [
    { value: '0', label: `0（${label0}）` },
    { value: '1', label: `1（${label1}）` }
  ]
}

const conditionChange = (cond, list, e) => {
  // 娓呯┖涔嬪墠鐨勫弬鏁?
  cond.parameters = []

  for (let i in list) {
    for (let k in list[i].items) {
      const item = list[i].items[k]
      if (item.identifier === e) {
        cond.type = item.type || ''

        // 濡傛灉鏄簨浠躲€佹湇鍔℃垨灞炴€т笂鎶ョ被鍨嬶紝涓斾笉鏄€氶厤绗︼紝鑷姩娣诲姞涓€涓弬鏁?
        if ((item.type === 'event' || item.type === 'service' || e === 'report') && !e.endsWith(':*')) {
          cond.parameters = [{}]
        }
        return
      }
    }
  }
}

// 鑾峰彇鍙傛暟鍊艰緭鍏ユ彁绀?
const getValuePlaceholder = (comparator, pk?: string, cond?: any, param?: any) => {
  if (!comparator) return '请输入比较值'
  const dataType = pk && cond && param ? getPropertyDataType(pk, cond, param) : 'string'
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
const validateParamValue = (param, pk?: string, cond?: any) => {
  if (!param || !param.value || !param.comparator) return true

  const { comparator, value } = param

  // 鑾峰彇灞炴€ф暟鎹被鍨?
  const dataType = pk && cond ? getPropertyDataType(pk, cond, param) : 'string'

  // 楠岃瘉between鍜宯otBetween鏍煎紡
  if (comparator === 'between' || comparator === 'notBetween') {
    const parts = value.split('-')
    if (parts.length !== 2) {
      ElMessage.warning('范围值格式错误，请使用：最小值-最大值（例如 10-20）')
      return false
    }

    const min = parseFloat(parts[0])
    const max = parseFloat(parts[1])

    if (isNaN(min) || isNaN(max)) {
      ElMessage.warning('范围值必须是数字')
      return false
    }

    if (min >= max) {
      ElMessage.warning('最小值必须小于最大值')
      return false
    }
  }

  // 楠岃瘉鏁板€肩被鍨嬫搷浣滅
  if (['>', '<', '>=', '<='].includes(comparator)) {
    if (isNaN(parseFloat(value))) {
      ElMessage.warning('该比较符需要输入数值')
      return false
    }
  }

  // 鏍规嵁鏁版嵁绫诲瀷楠岃瘉鍊?
  switch (dataType) {
    case 'int':
    case 'long':
      if (!['between', 'notBetween'].includes(comparator)) {
        const intValue = parseInt(value)
        if (isNaN(intValue) || intValue.toString() !== value.trim()) {
          ElMessage.warning('请输入有效整数')
          return false
        }
      }
      break
    case 'float':
    case 'double':
      if (!['between', 'notBetween'].includes(comparator)) {
        const floatValue = parseFloat(value)
        if (isNaN(floatValue)) {
          ElMessage.warning('请输入有效数字')
          return false
        }
      }
      break
    case 'bool':
    case 'boolean':
      const boolValue = normalizeBooleanValue(value)
      if (!['1', '0'].includes(boolValue)) {
        ElMessage.warning('布尔值只允许 0 或 1（系统统一存储）')
        return false
      }
      break
  }

  return true
}

// 楠岃瘉鎵€鏈夌洃鍚櫒閰嶇疆
const validateAllListeners = () => {
  for (const listener of list.value) {
    if (!listener.conditions || listener.conditions.length === 0) {
      ElMessage.error('请至少配置一个监听条件')
      return false
    }

    for (const condition of listener.conditions) {
      if (!condition.identifier) {
        ElMessage.error('请选择监听类型')
        return false
      }

      if (!condition.identifier.endsWith(':*') && (!condition.parameters || condition.parameters.length === 0)) {
        ElMessage.error('请至少配置一个参数条件')
        return false
      }

      if (condition.parameters) {
        for (const param of condition.parameters) {
          if (!param.comparator) {
            ElMessage.error('请选择比较操作符')
            return false
          }

          if (!param.value) {
            ElMessage.error('请输入比较值')
            return false
          }

          // 璋冪敤鍗曚釜鍙傛暟楠岃瘉
          if (!validateParamValue(param)) {
            return false
          }
        }
      }
    }
  }

  return true
}

// 鏆撮湶楠岃瘉鏂规硶缁欑埗缁勪欢
defineExpose({
  validateAllListeners
})

// 鏂板鏉′欢
const handleAddCondition = (item: any) => {
  if (!item.conditions) item.conditions = []
  item.conditions.push({
    identifier: '',
    type: '',
    parameters: []
  })
}
// 鍒犻櫎鏉′欢
const handleRemoveCondition = (item: any, index: number) => {
  item.conditions.splice(index, 1)
}

// 鏂板鍙傛暟
const addParmeter = (cond: any) => {
  if (!cond.parameters) cond.parameters = []
  cond.parameters.push({
    identifier: '',
    comparator: '',
    value: ''
  })
}
// 鍒犻櫎鍙傛暟
const removeParmeter = (index: number, cond: any) => {
  cond.parameters.splice(index, 1)
}

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
          border: 2px dashed rgb(217, 217, 217);
          padding: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
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

.expression-preview {
  background-color: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 8px 12px;
  margin-top: 8px;
  font-size: 12px;
  color: #1e40af;
  display: flex;
  align-items: center;

  .el-icon {
    color: #3b82f6;
  }
}
</style>

