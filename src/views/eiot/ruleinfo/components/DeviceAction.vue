<template>
  <div class="device-action">
    <div class="select-device">
      <select-device v-model:dn="selectedDn" placeholder="选择设备" @on-select="handleSelectDevice" />
      <div class="device-tip" v-if="selectedPk">当前目标：{{ selectedPk }}/{{ selectedDn || '#' }}</div>
    </div>

    <el-empty v-if="!selectedPk" description="请先选择设备，再配置设备控制动作" :image-size="72" />

    <template v-else>
      <div v-for="(service, sIdx) in servicesRef" :key="sIdx" class="service-card">
        <div class="service-head">
          <el-select v-model="service.identifier" style="width: 260px" @change="onServiceIdentifierChange(service)">
            <el-option label="设置属性（thing.service.property.set）" value="set" />
            <el-option v-for="item in servicesList" :key="item.identifier" :label="item.name" :value="item.identifier" />
          </el-select>
          <el-button link type="danger" @click="removeService(sIdx)">删除动作</el-button>
        </div>

        <div class="service-body" v-if="service.identifier === 'set'">
          <div v-for="(param, pIdx) in service.inputData" :key="pIdx" class="param-row">
            <el-row :gutter="8">
              <el-col :span="8">
                <el-select v-model="param.identifier" placeholder="选择属性标识符">
                  <el-option v-for="prop in propertiesList" :key="prop.identifier" :label="`${prop.name} (${prop.identifier})`" :value="prop.identifier" />
                </el-select>
              </el-col>
              <el-col :span="14">
                <ThingModelValueEditor
                  :data-type="getSetParamDataType(param)"
                  :model-value="param.value"
                  @update:model-value="(v) => (param.value = v)"
                />
              </el-col>
              <el-col :span="2" class="param-op">
                <el-button link type="danger" @click="removeParam(service, pIdx)">删除</el-button>
              </el-col>
            </el-row>
          </div>
          <el-button size="small" @click="addSetParam(service)">新增属性值</el-button>
        </div>

        <div class="service-body" v-else>
          <div v-for="(param, pIdx) in service.inputData" :key="pIdx" class="param-row">
            <el-row :gutter="8">
              <el-col :span="8" class="param-label">
                <div class="name">{{ param.name || param.identifier }}</div>
                <div class="meta">{{ param.identifier }}</div>
              </el-col>
              <el-col :span="16">
                <ThingModelValueEditor
                  :data-type="param.dataType || { type: 'string' }"
                  :model-value="param.value"
                  @update:model-value="(v) => (param.value = v)"
                />
              </el-col>
            </el-row>
          </div>
          <el-empty v-if="!service.inputData?.length" description="该服务无入参" :image-size="56" />
        </div>
      </div>

      <el-button @click="addService">新增设备控制动作</el-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ThingModelApi } from '@/api/eiot/thingmodel'
import SelectDevice from '@/components/EiotSelect/select-device.vue'
import ThingModelValueEditor from './ThingModelValueEditor.vue'

const props = defineProps<{
  services: any[]
}>()

const emits = defineEmits<{
  (e: 'update:services', value: any[]): void
}>()

const servicesRef = ref<any[]>([])
const selectedPk = ref('')
const selectedDn = ref('')
const propertiesList = ref<any[]>([])
const servicesList = ref<any[]>([])

watch(
  () => props.services,
  (val) => {
    servicesRef.value = Array.isArray(val) ? val : []
    if (!servicesRef.value.length) return
    const device = servicesRef.value[0]?.device || ''
    const [pk, dn] = device.split('/')
    if (pk) {
      selectedPk.value = pk
      selectedDn.value = dn === '#' ? '' : dn || ''
      loadThingModel(pk)
    }
  },
  { immediate: true, deep: true }
)

watch(
  servicesRef,
  (val) => {
    emits('update:services', val)
  },
  { deep: true }
)

const normalizeType = (raw: any) => {
  const t = String(raw || 'string').toLowerCase()
  if (t === 'boolean') return 'bool'
  if (t === 'struct') return 'object'
  return t
}

const getDefaultValueByDataType = (dataType: any, depth = 0): any => {
  if (depth > 5) return null
  const type = normalizeType(dataType?.type)
  if (type === 'bool') return 0
  if (type === 'enum') {
    const specs = dataType?.specs || {}
    const firstKey = Object.keys(specs)[0]
    return firstKey !== undefined ? String(firstKey) : ''
  }
  if (type === 'int32' || type === 'int64') return 0
  if (type === 'float' || type === 'double') return 0
  if (type === 'date' || type === 'datetime' || type === 'position') return ''
  if (type === 'array') return []
  if (type === 'object') {
    const out: Record<string, any> = {}
    const fields = Array.isArray(dataType?.specs?.properties) ? dataType.specs.properties : []
    fields.forEach((field: any) => {
      if (!field?.identifier) return
      out[field.identifier] = getDefaultValueByDataType(field.dataType || { type: 'string' }, depth + 1)
    })
    return out
  }
  return ''
}

const handleSelectDevice = (device: any) => {
  if (!device?.productKey) return
  selectedPk.value = device.productKey
  selectedDn.value = device.dn || ''
  const target = `${selectedPk.value}/${selectedDn.value || '#'}`
  servicesRef.value.forEach((item) => {
    item.device = target
  })
  loadThingModel(device.productKey)
}

function loadThingModel(productKey: string) {
  ThingModelApi.getThingModelByProductKey(productKey).then((res: any) => {
    const model = res?.model || {}
    propertiesList.value = Array.isArray(model.properties) ? model.properties : []
    servicesList.value = Array.isArray(model.services) ? model.services : []
    servicesRef.value.forEach((item) => ensureServiceInputData(item))
  })
}

const findServiceDef = (identifier: string) => {
  return servicesList.value.find((item) => item.identifier === identifier)
}

const ensureServiceInputData = (service: any) => {
  if (service.identifier === 'set') {
    service.inputData = Array.isArray(service.inputData) ? service.inputData : []
    return
  }
  const def = findServiceDef(service.identifier)
  if (!def) {
    service.inputData = []
    return
  }
  const oldMap = new Map((service.inputData || []).map((p: any) => [p.identifier, p.value]))
  service.inputData = (def.inputData || []).map((p: any) => ({
    identifier: p.identifier,
    name: p.name,
    required: !!p.required,
    dataType: p.dataType || { type: 'string' },
    value: oldMap.has(p.identifier) ? oldMap.get(p.identifier) : getDefaultValueByDataType(p.dataType || { type: 'string' })
  }))
}

const getSetParamDataType = (param: any) => {
  const prop = propertiesList.value.find((item) => item.identifier === param.identifier)
  return prop?.dataType || { type: 'string' }
}

const addService = () => {
  if (!selectedPk.value) return
  servicesRef.value.push({
    device: `${selectedPk.value}/${selectedDn.value || '#'}`,
    identifier: 'set',
    inputData: []
  })
}

const removeService = (index: number) => {
  servicesRef.value.splice(index, 1)
}

const addSetParam = (service: any) => {
  service.inputData = Array.isArray(service.inputData) ? service.inputData : []
  const firstProp = propertiesList.value[0]
  service.inputData.push({
    identifier: firstProp?.identifier || '',
    value: firstProp ? getDefaultValueByDataType(firstProp.dataType || { type: 'string' }) : ''
  })
}

const removeParam = (service: any, paramIndex: number) => {
  service.inputData.splice(paramIndex, 1)
}

const onServiceIdentifierChange = (service: any) => {
  if (!selectedPk.value) return
  service.device = `${selectedPk.value}/${selectedDn.value || '#'}`
  ensureServiceInputData(service)
}
</script>

<style scoped lang="scss">
.device-action {
  .select-device {
    width: 320px;
    margin-bottom: 12px;
  }

  .device-tip {
    margin-top: 6px;
    font-size: 12px;
    color: #606266;
  }
}

.service-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
  padding: 12px;
  margin-bottom: 12px;
}

.service-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.param-row {
  margin-bottom: 10px;
}

.param-row:last-child {
  margin-bottom: 0;
}

.param-label {
  .name {
    font-size: 13px;
    color: #303133;
  }

  .meta {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
  }
}

.param-op {
  display: flex;
  align-items: center;
}
</style>
