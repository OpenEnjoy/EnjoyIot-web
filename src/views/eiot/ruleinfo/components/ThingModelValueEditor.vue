<template>
  <div class="tm-value-editor">
    <template v-if="type === 'bool'">
      <el-select :model-value="stringValue" placeholder="请选择" @update:model-value="onBoolChange">
        <el-option v-for="opt in boolOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </template>

    <template v-else-if="type === 'enum'">
      <el-select :model-value="stringValue" placeholder="请选择" @update:model-value="onEnumChange">
        <el-option v-for="opt in enumOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </template>

    <template v-else-if="type === 'int32' || type === 'int64'">
      <el-input-number :model-value="numberValue" :controls="false" style="width: 100%" @update:model-value="onIntChange" />
    </template>

    <template v-else-if="type === 'float' || type === 'double'">
      <el-input-number
        :model-value="numberValue"
        :controls="false"
        :precision="4"
        style="width: 100%"
        @update:model-value="onFloatChange"
      />
    </template>

    <template v-else-if="type === 'date'">
      <el-date-picker
        type="date"
        value-format="YYYY-MM-DD"
        format="YYYY-MM-DD"
        placeholder="YYYY-MM-DD"
        style="width: 100%"
        :model-value="stringValue"
        @update:model-value="onStringChange"
      />
    </template>

    <template v-else-if="type === 'datetime'">
      <el-date-picker
        type="datetime"
        value-format="YYYY-MM-DD HH:mm:ss"
        format="YYYY-MM-DD HH:mm:ss"
        placeholder="YYYY-MM-DD HH:mm:ss"
        style="width: 100%"
        :model-value="stringValue"
        @update:model-value="onStringChange"
      />
    </template>

    <template v-else-if="type === 'position'">
      <el-row :gutter="8">
        <el-col :span="12">
          <el-input-number
            :model-value="position.lat"
            :controls="false"
            :precision="6"
            style="width: 100%"
            placeholder="纬度"
            @update:model-value="(v) => onPositionChange('lat', v)"
          />
        </el-col>
        <el-col :span="12">
          <el-input-number
            :model-value="position.lon"
            :controls="false"
            :precision="6"
            style="width: 100%"
            placeholder="经度"
            @update:model-value="(v) => onPositionChange('lon', v)"
          />
        </el-col>
      </el-row>
    </template>

    <template v-else-if="type === 'object'">
      <div class="complex-box">
        <div v-for="field in objectFields" :key="field.identifier" class="complex-item">
          <div class="complex-label">
            <span>{{ field.name || field.identifier }}</span>
            <span class="complex-key">{{ field.identifier }}</span>
          </div>
          <ThingModelValueEditor
            :data-type="field.dataType || { type: 'string' }"
            :model-value="objectValue[field.identifier]"
            @update:model-value="(v) => setObjectFieldValue(field.identifier, v)"
          />
        </div>
        <el-empty v-if="!objectFields.length" description="object 无可编辑字段" :image-size="56" />
      </div>
    </template>

    <template v-else-if="type === 'array'">
      <div class="complex-box">
        <div class="array-toolbar">
          <el-button size="small" @click="appendArrayItem">新增元素</el-button>
        </div>
        <div v-for="(item, idx) in arrayValue" :key="idx" class="array-item">
          <div class="array-item-head">
            <span>元素 {{ idx + 1 }}</span>
            <el-button size="small" link type="danger" @click="removeArrayItem(idx)">删除</el-button>
          </div>
          <ThingModelValueEditor :data-type="arrayItemType" :model-value="item" @update:model-value="(v) => setArrayItem(idx, v)" />
        </div>
        <el-empty v-if="!arrayValue.length" description="array 暂无元素" :image-size="56" />
      </div>
    </template>

    <template v-else>
      <el-input :model-value="stringValue" placeholder="请输入" @update:model-value="onStringChange" />
    </template>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ThingModelValueEditor' })

const props = defineProps<{
  dataType?: any
  modelValue?: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const normalizeType = (raw: any) => {
  const t = String(raw || 'string').toLowerCase()
  if (t === 'boolean') return 'bool'
  if (t === 'struct') return 'object'
  return t
}

const type = computed(() => normalizeType(props.dataType?.type))

const getSpecs = () => (props.dataType?.specs && typeof props.dataType.specs === 'object' ? props.dataType.specs : {})

const stringValue = computed(() => {
  const v = props.modelValue
  if (v === undefined || v === null) return ''
  return String(v)
})

const numberValue = computed(() => {
  const v = Number(props.modelValue)
  return Number.isNaN(v) ? undefined : v
})

const boolOptions = computed(() => {
  const specs = getSpecs()
  return [
    { value: '0', label: `${String(specs['0'] ?? '关闭')}（存储0）` },
    { value: '1', label: `${String(specs['1'] ?? '开启')}（存储1）` }
  ]
})

const enumOptions = computed(() => {
  const specs = getSpecs()
  return Object.keys(specs).map((key) => ({ value: String(key), label: `${String(specs[key])} (${key})` }))
})

const position = computed(() => {
  const raw = String(props.modelValue || '')
  const [latRaw, lonRaw] = raw.split(',')
  const lat = Number(latRaw)
  const lon = Number(lonRaw)
  return {
    lat: Number.isNaN(lat) ? undefined : lat,
    lon: Number.isNaN(lon) ? undefined : lon
  }
})

const objectValue = computed<Record<string, any>>(() => {
  if (props.modelValue && typeof props.modelValue === 'object' && !Array.isArray(props.modelValue)) {
    return props.modelValue
  }
  return {}
})

const objectFields = computed<any[]>(() => {
  const specs = getSpecs()
  return Array.isArray(specs.properties) ? specs.properties : []
})

const arrayItemType = computed(() => {
  const specs = getSpecs()
  return specs.itemType || { type: 'string' }
})

const arrayValue = computed<any[]>(() => {
  return Array.isArray(props.modelValue) ? props.modelValue : []
})

const onStringChange = (v: string) => emit('update:modelValue', v ?? '')
const onBoolChange = (v: string) => emit('update:modelValue', v === '1' ? 1 : 0)
const onEnumChange = (v: string) => emit('update:modelValue', v ?? '')
const onIntChange = (v: number | undefined) => emit('update:modelValue', typeof v === 'number' ? Math.trunc(v) : null)
const onFloatChange = (v: number | undefined) => emit('update:modelValue', typeof v === 'number' ? v : null)

const onPositionChange = (part: 'lat' | 'lon', value: number | undefined) => {
  const lat = part === 'lat' ? value : position.value.lat
  const lon = part === 'lon' ? value : position.value.lon
  if (lat === undefined || lon === undefined) {
    emit('update:modelValue', '')
    return
  }
  emit('update:modelValue', `${lat},${lon}`)
}

const setObjectFieldValue = (key: string, value: any) => {
  emit('update:modelValue', { ...objectValue.value, [key]: value })
}

const createDefaultValue = (dataType: any, depth = 0): any => {
  if (depth > 5) return null
  const t = normalizeType(dataType?.type)
  if (t === 'bool') return 0
  if (t === 'enum') {
    const specs = dataType?.specs || {}
    const firstKey = Object.keys(specs)[0]
    return firstKey !== undefined ? String(firstKey) : ''
  }
  if (t === 'int32' || t === 'int64') return 0
  if (t === 'float' || t === 'double') return 0
  if (t === 'date') return ''
  if (t === 'datetime') return ''
  if (t === 'position') return ''
  if (t === 'array') return []
  if (t === 'object') {
    const out: Record<string, any> = {}
    const fields = Array.isArray(dataType?.specs?.properties) ? dataType.specs.properties : []
    fields.forEach((f: any) => {
      if (!f?.identifier) return
      out[f.identifier] = createDefaultValue(f.dataType || { type: 'string' }, depth + 1)
    })
    return out
  }
  return ''
}

const appendArrayItem = () => {
  emit('update:modelValue', [...arrayValue.value, createDefaultValue(arrayItemType.value)])
}

const removeArrayItem = (idx: number) => {
  emit('update:modelValue', arrayValue.value.filter((_, index) => index !== idx))
}

const setArrayItem = (idx: number, value: any) => {
  const copy = [...arrayValue.value]
  copy[idx] = value
  emit('update:modelValue', copy)
}
</script>

<style scoped lang="scss">
.complex-box {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
  padding: 10px;
}

.complex-item {
  margin-bottom: 10px;
}

.complex-item:last-child {
  margin-bottom: 0;
}

.complex-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
  color: #606266;
}

.complex-key {
  color: #909399;
}

.array-toolbar {
  margin-bottom: 8px;
}

.array-item {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
  background: #fff;
}

.array-item:last-child {
  margin-bottom: 0;
}

.array-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #606266;
}
</style>
