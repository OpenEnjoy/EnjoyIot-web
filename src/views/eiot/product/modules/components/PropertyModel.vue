<template>
  <div style="width: 100%">
    <el-form ref="formRef" class="model-form" :rules="rules" label-width="120px" :model="propertyRef">
      <el-form-item label="名称" prop="name">
        <el-input v-model="propertyRef.name" auto-complete="off" />
      </el-form-item>
      <el-form-item label="标识符" prop="identifier">
        <el-input :disabled="isUpdate" v-model="propertyRef.identifier" auto-complete="off" />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="propertyRef.description" auto-complete="off" />
      </el-form-item>
      <el-form-item v-if="!isProperty" label="是否必填">
        <el-switch
          v-model="propertyRef.required"
          inline-prompt
          active-text="是"
          inactive-text="否"
        />
      </el-form-item>
      <el-form-item v-if="isProperty" label="单位">
        <el-input v-model="propertyRef.unit" auto-complete="off" />
      </el-form-item>

      <el-form-item label="数据类型" prop="dataType.type">
        <el-select v-model="propertyRef.dataType.type" placeholder="请选择数据类型">
          <el-option label="int32" value="int32" />
          <el-option label="int64" value="int64" />
          <el-option label="float" value="float" />
          <el-option label="double" value="double" />
          <el-option label="bool" value="bool" />
          <el-option label="enum" value="enum" />
          <el-option label="string" value="string" />
          <el-option label="text" value="text" />
          <el-option label="date (YYYY-MM-DD)" value="date" />
          <el-option label="datetime (YYYY-MM-DD HH:mm:ss)" value="datetime" />
          <el-option label="array" value="array" />
          <el-option label="object" value="object" />
          <el-option v-if="isProperty" label="position" value="position" />
        </el-select>
      </el-form-item>
      <div v-if="selectedTypeHint" class="type-hint">{{ selectedTypeHint }}</div>

      <el-form-item v-if="isSelectType('position')">
        <el-row :gutter="20" style="width: 100%">
          <el-col :span="4">定位方式</el-col>
          <el-col :span="8">
            <el-select v-model="propertyRef.dataType.specs.locateType" placeholder="请选择定位方式">
              <el-option label="经纬度" value="lonLat" />
              <el-option label="基站" value="basestation" />
              <el-option label="IP" value="ipinfo" />
            </el-select>
          </el-col>
        </el-row>
      </el-form-item>

      <el-form-item v-if="isSelectType('int32') || isSelectType('int64')">
        <el-col :span="4">取值范围</el-col>
        <el-col :span="6">
          <el-input v-model="propertyRef.dataType.specs.min" placeholder="最小值" />
        </el-col>
        <el-col class="line" :span="1" style="text-align: center">-</el-col>
        <el-col :span="6">
          <el-input v-model="propertyRef.dataType.specs.max" placeholder="最大值" />
        </el-col>
      </el-form-item>

      <el-form-item v-if="isSelectType('float') || isSelectType('double')">
        <el-col :span="4">取值范围</el-col>
        <el-col :span="4">
          <el-input v-model="propertyRef.dataType.specs.min" placeholder="最小值" />
        </el-col>
        <el-col class="line" :span="1" style="text-align: center">-</el-col>
        <el-col :span="4">
          <el-input v-model="propertyRef.dataType.specs.max" placeholder="最大值" />
        </el-col>
        <el-col :span="1" />
        <el-col :span="8">
          <el-input v-model="propertyRef.dataType.specs.precision" placeholder="精度">
            <template #append>保留小数位</template>
          </el-input>
        </el-col>
      </el-form-item>

      <el-form-item v-if="isSelectType('bool')">
        <el-col :span="4">值映射文案</el-col>
        <el-col :span="3">存储值 0</el-col>
        <el-col :span="6">
          <el-input v-model="boolItemRef._true" placeholder="例如 在线 / online / 启用" />
        </el-col>
        <el-col :span="1" />
        <el-col :span="3">存储值 1</el-col>
        <el-col :span="6">
          <el-input v-model="boolItemRef._false" placeholder="例如 离线 / offline / 禁用" />
        </el-col>
      </el-form-item>
      <div v-if="isSelectType('bool')" class="type-hint">
        系统统一存储为数字 0/1；此处配置“显示文案映射”。可填写中文或英文。
      </div>
      <div v-if="isSelectType('bool')" class="type-hint">
        当前映射预览：0 => {{ boolItemRef._true || '(未配置)' }}，1 => {{ boolItemRef._false || '(未配置)' }}
      </div>

      <el-form-item label="枚举值" v-if="isSelectType('enum')">
        <el-col v-for="item in enumItemsRef" :span="24" :key="item.value || item.name">
          <el-row>
            <el-col :span="4">枚举值</el-col>
            <el-col :span="4">
              <el-input v-model="item.value" placeholder="例如 0" />
            </el-col>
            <el-col :span="1" />
            <el-col :span="4">枚举描述</el-col>
            <el-col :span="7">
              <el-input v-model="item.name" placeholder="例如 离线" />
            </el-col>
            <el-col :span="1" />
            <el-col :span="3">
              <el-button type="danger" plain @click="delEnum(item)">删除</el-button>
            </el-col>
          </el-row>
        </el-col>
        <el-button @click="addEnumItem()" type="primary" plain>新增枚举项</el-button>
      </el-form-item>

      <el-form-item v-if="isSelectType('string') || isSelectType('text')">
        <el-col :span="4">长度</el-col>
        <el-col :span="6">
          <el-input v-model="propertyRef.dataType.specs.length" placeholder="默认 1024" />
        </el-col>
      </el-form-item>

      <el-form-item v-if="isSelectType('date') || isSelectType('datetime')">
        <el-col :span="4">格式</el-col>
        <el-col :span="10">
          <el-input
            v-model="propertyRef.dataType.specs.format"
            :placeholder="isSelectType('datetime') ? '例如 yyyy-MM-dd HH:mm:ss' : '例如 yyyy-MM-dd'"
          />
        </el-col>
      </el-form-item>

      <el-form-item label="对象字段" v-if="isSelectType('object')">
        <div style="width: 100%">
          <div style="display: flex; gap: 8px; margin-bottom: 8px">
            <el-button size="small" @click="showObjectAdvanced = !showObjectAdvanced">
              {{ showObjectAdvanced ? '隐藏高级 JSON' : '高级 JSON' }}
            </el-button>
            <el-button size="small" @click="useObjectTemplate">套用模板</el-button>
          </div>
          <NestedFieldEditor v-model="objectFields" />
          <div v-if="showObjectAdvanced" style="margin-top: 12px">
            <div style="display: flex; gap: 8px; margin-bottom: 8px">
              <el-button size="small" @click="formatObjectSchemaText">格式化 JSON</el-button>
              <el-button size="small" @click="validateObjectSchemaText">校验 JSON</el-button>
              <el-button size="small" @click="syncObjectFieldsFromSchemaText">JSON 同步到可视化</el-button>
            </div>
            <el-input v-model="propertyRef.dataType.schemaText" type="textarea" :rows="8" />
          </div>
        </div>
      </el-form-item>

      <el-form-item label="数组元素" v-if="isSelectType('array')">
        <div style="width: 100%">
          <div style="display: flex; gap: 8px; margin-bottom: 8px">
            <el-select v-model="arrayItemType" style="width: 220px" placeholder="元素类型">
              <el-option v-for="t in arrayItemTypeOptions" :key="t" :label="t" :value="t" />
            </el-select>
            <el-button size="small" @click="showArrayAdvanced = !showArrayAdvanced">
              {{ showArrayAdvanced ? '隐藏高级 JSON' : '高级 JSON' }}
            </el-button>
            <el-button size="small" @click="useArrayTemplate">套用模板</el-button>
          </div>

          <div v-if="arrayItemType === 'object'">
            <NestedFieldEditor v-model="arrayObjectFields" />
          </div>

          <div v-if="showArrayAdvanced" style="margin-top: 12px">
            <div style="display: flex; gap: 8px; margin-bottom: 8px">
              <el-button size="small" @click="formatArrayItemTypeText">格式化 JSON</el-button>
              <el-button size="small" @click="validateArrayItemTypeText">校验 JSON</el-button>
              <el-button size="small" @click="syncArrayFieldsFromItemTypeText">JSON 同步到可视化</el-button>
            </div>
            <el-input v-model="propertyRef.dataType.itemTypeText" type="textarea" :rows="6" />
          </div>
        </div>
      </el-form-item>

      <el-form-item v-if="isProperty && !isSelectType('position')" label="读写" prop="accessMode">
        <el-radio-group v-model="propertyRef.accessMode">
          <el-radio value="rw">读写</el-radio>
          <el-radio value="r">只读</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { propTypes } from '@/utils/propTypes'
import { formatSpecText, normalizeThingModelType, parseSpecText } from '@/views/eiot/product/util'
import NestedFieldEditor from './NestedFieldEditor.vue'

const props = defineProps({
  property: { type: Object, default: () => ({}) },
  enumItems: { type: Array, default: () => [] },
  boolItem: { type: Object, default: () => ({}) },
  isProperty: propTypes.bool.def(false),
  isUpdate: propTypes.bool.def(false)
})

const propertyRef = ref<any>(props.property)
const boolItemRef = ref<any>(props.boolItem)
const enumItemsRef = ref<any>(props.enumItems)
const formRef = ref()

const showObjectAdvanced = ref(false)
const showArrayAdvanced = ref(false)
const primitiveTypeOptions = ['int32', 'int64', 'float', 'double', 'bool', 'enum', 'string', 'text', 'date', 'datetime']
const arrayItemTypeOptions = [...primitiveTypeOptions, 'object']
const objectFields = ref<any[]>([])
const arrayObjectFields = ref<any[]>([])
const arrayItemType = ref<string>('string')

const rules = reactive({
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  identifier: [{ required: true, message: '请输入标识符', trigger: 'blur' }],
  accessMode: [{ required: true, message: '请选择读写权限', trigger: 'blur' }],
  'dataType.type': [{ required: true, message: '请选择数据类型', trigger: 'change' }]
})

const selectedTypeHint = computed(() => {
  const type = normalizeThingModelType(propertyRef.value?.dataType?.type)
  const tips: Record<string, string> = {
    date: 'date: only date, e.g. 2026-04-21',
    datetime: 'datetime: date + time, e.g. 2026-04-21 14:30:45',
    object: 'object can contain primitive fields, object fields, and array fields.',
    array: 'array is a list. item type can be primitive or object.'
  }
  return tips[type] || ''
})

const mapFieldFromSpec = (specField: any) => {
  const dataType = specField?.dataType || {}
  const type = normalizeThingModelType(dataType.type || specField?.type || 'string')
  const field: any = {
    _id: `${Date.now()}_${Math.random()}`,
    identifier: specField?.identifier || '',
    name: specField?.name || '',
    type,
    children: [],
    arrayItemType: 'string',
    arrayItemChildren: []
  }
  if (type === 'object') {
    field.children = parseFields(dataType?.specs?.properties || [])
  }
  if (type === 'array') {
    const itemType = dataType?.specs?.itemType || {}
    field.arrayItemType = normalizeThingModelType(itemType.type || 'string')
    if (field.arrayItemType === 'object') {
      field.arrayItemChildren = parseFields(itemType?.specs?.properties || [])
    }
  }
  return field
}

const parseFields = (fields: any[]) => {
  if (!Array.isArray(fields)) return []
  return fields.map((f) => mapFieldFromSpec(f))
}

const buildDataType = (field: any) => {
  const type = normalizeThingModelType(field?.type || 'string')
  if (type === 'object') {
    return {
      type: 'object',
      specs: {
        properties: buildFieldSpecs(field.children || [])
      }
    }
  }
  if (type === 'array') {
    const itemType = normalizeThingModelType(field?.arrayItemType || 'string')
    return {
      type: 'array',
      specs: {
        itemType:
          itemType === 'object'
            ? {
                type: 'object',
                specs: {
                  properties: buildFieldSpecs(field.arrayItemChildren || [])
                }
              }
            : {
                type: itemType
              }
      }
    }
  }
  return { type }
}

const buildFieldSpecs = (fields: any[]) => {
  return (fields || [])
    .filter((f) => f?.identifier)
    .map((f) => ({
      identifier: f.identifier,
      name: f.name || f.identifier,
      dataType: buildDataType(f)
    }))
}

const syncObjectSchemaText = () => {
  if (!isSelectType('object')) return
  propertyRef.value.dataType.schemaText = formatSpecText({
    properties: buildFieldSpecs(objectFields.value)
  })
}

const syncArrayItemTypeText = () => {
  if (!isSelectType('array')) return
  if (arrayItemType.value === 'object') {
    propertyRef.value.dataType.itemTypeText = formatSpecText({
      type: 'object',
      specs: {
        properties: buildFieldSpecs(arrayObjectFields.value)
      }
    })
    return
  }
  propertyRef.value.dataType.itemTypeText = formatSpecText({
    type: normalizeThingModelType(arrayItemType.value || 'string')
  })
}

const syncObjectFieldsFromSchemaText = () => {
  const parsed = parseSpecText(propertyRef.value.dataType.schemaText, { properties: [] })
  objectFields.value = parseFields(parsed.properties || parsed.fields || [])
}

const syncArrayFieldsFromItemTypeText = () => {
  const parsed = parseSpecText(propertyRef.value.dataType.itemTypeText, { type: 'string' })
  arrayItemType.value = normalizeThingModelType(parsed.type || 'string')
  arrayObjectFields.value = parseFields(parsed?.specs?.properties || parsed?.properties || [])
}

const hydrateComplexSpecs = () => {
  propertyRef.value.dataType = propertyRef.value.dataType || { specs: {} }
  propertyRef.value.dataType.type = normalizeThingModelType(propertyRef.value.dataType.type)
  propertyRef.value.dataType.specs = propertyRef.value.dataType.specs || {}

  if (propertyRef.value.dataType.type === 'object') {
    propertyRef.value.dataType.schemaText =
      propertyRef.value.dataType.schemaText || formatSpecText(propertyRef.value.dataType.specs)
    syncObjectFieldsFromSchemaText()
  }
  if (propertyRef.value.dataType.type === 'array') {
    propertyRef.value.dataType.itemTypeText =
      propertyRef.value.dataType.itemTypeText || formatSpecText(propertyRef.value.dataType.specs?.itemType)
    syncArrayFieldsFromItemTypeText()
  }
}

watch(
  () => propertyRef.value?.dataType?.type,
  () => hydrateComplexSpecs(),
  { immediate: true }
)

watch(objectFields, () => syncObjectSchemaText(), { deep: true })
watch([arrayItemType, arrayObjectFields], () => syncArrayItemTypeText(), { deep: true })

const useObjectTemplate = () => {
  objectFields.value = [
    mapFieldFromSpec({ identifier: 'lat', name: 'Latitude', dataType: { type: 'double' } }),
    mapFieldFromSpec({ identifier: 'lng', name: 'Longitude', dataType: { type: 'double' } })
  ]
  syncObjectSchemaText()
}

const useArrayTemplate = () => {
  arrayItemType.value = 'object'
  arrayObjectFields.value = [mapFieldFromSpec({ identifier: 'value', name: 'Value', dataType: { type: 'double' } })]
  syncArrayItemTypeText()
}

const formatObjectSchemaText = () => {
  const parsed = parseSpecText(propertyRef.value.dataType.schemaText, { properties: [] })
  propertyRef.value.dataType.schemaText = formatSpecText(parsed)
}

const formatArrayItemTypeText = () => {
  const parsed = parseSpecText(propertyRef.value.dataType.itemTypeText, { type: 'string' })
  propertyRef.value.dataType.itemTypeText = formatSpecText(parsed)
}

const validateObjectSchemaText = () => {
  parseSpecText(propertyRef.value.dataType.schemaText, { properties: [] })
  ElMessage.success('Object JSON valid')
}

const validateArrayItemTypeText = () => {
  parseSpecText(propertyRef.value.dataType.itemTypeText, { type: 'string' })
  ElMessage.success('Array item JSON valid')
}

const validate = async () => {
  await formRef.value.validate()
  const type = normalizeThingModelType(propertyRef.value.dataType?.type)
  if (type === 'object') {
    const parsed = parseSpecText(propertyRef.value.dataType.schemaText, { properties: [] })
    if (!parsed.properties && !parsed.fields) throw new Error('对象类型必须提供 properties 或 fields')
  }
  if (type === 'array') {
    const parsed = parseSpecText(propertyRef.value.dataType.itemTypeText, { type: 'string' })
    if (!parsed.type) throw new Error('数组类型必须提供 itemType.type')
  }
  return true
}

const isSelectType = (type: string | number) => normalizeThingModelType(propertyRef.value.dataType?.type) === type

const addEnumItem = () => enumItemsRef.value.push({})
const delEnum = (item: any) => {
  const index = enumItemsRef.value.findIndex((current: any) => current.value === item.value && current.name === item.name)
  enumItemsRef.value.splice(index, 1)
}

defineExpose({ validate })
</script>

<style lang="scss" scoped>
.type-hint {
  margin: -8px 0 12px 120px;
  font-size: 12px;
  color: #606266;
}

::v-deep(.el-form-item) {
  .el-form-item {
    margin-bottom: 10px;
  }
}
</style>
