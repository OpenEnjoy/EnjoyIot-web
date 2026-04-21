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
      <el-form-item label="单位">
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
          <el-option label="date" value="date" />
          <el-option label="datetime" value="datetime" />
          <el-option label="array" value="array" />
          <el-option label="object" value="object" />
          <el-option v-if="isProperty" label="position" value="position" />
        </el-select>
      </el-form-item>

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
        <el-col :span="1"></el-col>
        <el-col :span="8">
          <el-input v-model="propertyRef.dataType.specs.precision" placeholder="精度">
            <template #append>保留小数位</template>
          </el-input>
        </el-col>
      </el-form-item>

      <el-form-item v-if="isSelectType('bool')">
        <el-col :span="4">布尔值</el-col>
        <el-col :span="1">0</el-col>
        <el-col :span="6">
          <el-input v-model="boolItemRef._true" placeholder="0 对应标签" />
        </el-col>
        <el-col :span="1"></el-col>
        <el-col :span="1">1</el-col>
        <el-col :span="6">
          <el-input v-model="boolItemRef._false" placeholder="1 对应标签" />
        </el-col>
      </el-form-item>

      <el-form-item label=" " v-if="isSelectType('enum')">
        <el-col v-for="item in enumItemsRef" :span="24" :key="item.value || item.name">
          <el-row>
            <el-col :span="4">枚举值</el-col>
            <el-col :span="4">
              <el-input v-model="item.value" placeholder="例如 0" />
            </el-col>
            <el-col :span="1"></el-col>
            <el-col :span="4">枚举描述</el-col>
            <el-col :span="7">
              <el-input v-model="item.name" placeholder="例如 离线" />
            </el-col>
            <el-col :span="1"></el-col>
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
        <el-input
          v-model="propertyRef.dataType.schemaText"
          type="textarea"
          :rows="10"
          placeholder='请输入 JSON，例如 {"properties":[{"identifier":"lat","name":"纬度","dataType":{"type":"double"}}]}'
        />
      </el-form-item>

      <el-form-item label="数组元素" v-if="isSelectType('array')">
        <el-input
          v-model="propertyRef.dataType.itemTypeText"
          type="textarea"
          :rows="6"
          placeholder='请输入 JSON，例如 {"type":"object","specs":{"properties":[{"identifier":"value","name":"值","dataType":{"type":"double"}}]}}'
        />
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

const props = defineProps({
  property: {
    type: Object,
    default: () => ({})
  },
  enumItems: {
    type: Array,
    default: () => []
  },
  boolItem: {
    type: Object,
    default: () => ({})
  },
  isProperty: propTypes.bool.def(false),
  isUpdate: propTypes.bool.def(false)
})

const propertyRef = ref<any>(props.property)
const boolItemRef = ref<any>(props.boolItem)
const enumItemsRef = ref<any>(props.enumItems)
const formRef = ref()

const rules = reactive({
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  identifier: [{ required: true, message: '请输入标识符', trigger: 'blur' }],
  accessMode: [{ required: true, message: '请选择读写权限', trigger: 'blur' }],
  'dataType.type': [{ required: true, message: '请选择数据类型', trigger: 'change' }]
})

const hydrateComplexSpecs = () => {
  propertyRef.value.dataType = propertyRef.value.dataType || { specs: {} }
  propertyRef.value.dataType.type = normalizeThingModelType(propertyRef.value.dataType.type)
  propertyRef.value.dataType.specs = propertyRef.value.dataType.specs || {}
  if (propertyRef.value.dataType.type === 'object') {
    propertyRef.value.dataType.schemaText =
      propertyRef.value.dataType.schemaText || formatSpecText(propertyRef.value.dataType.specs)
  }
  if (propertyRef.value.dataType.type === 'array') {
    propertyRef.value.dataType.itemTypeText =
      propertyRef.value.dataType.itemTypeText || formatSpecText(propertyRef.value.dataType.specs?.itemType)
  }
}

watch(
  () => propertyRef.value?.dataType?.type,
  () => {
    hydrateComplexSpecs()
  },
  { immediate: true }
)

const validate = async () => {
  await formRef.value.validate()
  const type = normalizeThingModelType(propertyRef.value.dataType?.type)
  if (type === 'object') {
    const parsed = parseSpecText(propertyRef.value.dataType.schemaText, { properties: [] })
    if (!parsed.properties && !parsed.fields) {
      throw new Error('对象类型必须提供 properties 或 fields')
    }
  }
  if (type === 'array') {
    const parsed = parseSpecText(propertyRef.value.dataType.itemTypeText, { type: 'string' })
    if (!parsed.type) {
      throw new Error('数组类型必须提供 itemType.type')
    }
  }
  return true
}

const isSelectType = (type: string | number) => normalizeThingModelType(propertyRef.value.dataType?.type) == type

const addEnumItem = () => {
  enumItemsRef.value.push({})
}

const delEnum = (item: any) => {
  const index = enumItemsRef.value.findIndex((current: any) => current.value == item.value && current.name == item.name)
  enumItemsRef.value.splice(index, 1)
}

defineExpose({
  validate
})
</script>

<style lang="scss" scoped>
::v-deep(.el-form-item) {
  .el-form-item {
    margin-bottom: 10px;
  }
}
</style>
