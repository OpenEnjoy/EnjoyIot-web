<template>
  <div class="nested-field-editor">
    <div class="toolbar">
      <el-button size="small" @click="addField">新增字段</el-button>
    </div>
    <div v-for="(field, index) in modelValue" :key="field._id || `${field.identifier}_${index}`" class="field-card">
      <el-row :gutter="8">
        <el-col :span="8">
          <el-input v-model="field.identifier" placeholder="字段标识符" @input="emitUpdate" />
        </el-col>
        <el-col :span="6">
          <el-input v-model="field.name" placeholder="字段名称" @input="emitUpdate" />
        </el-col>
        <el-col :span="6">
          <el-select v-model="field.type" placeholder="字段类型" @change="() => onFieldTypeChange(field)">
            <el-option v-for="t in fieldTypeOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-col>
        <el-col :span="4" class="row-actions">
          <el-button type="danger" link @click="removeField(index)">删除</el-button>
        </el-col>
      </el-row>

      <div v-if="field.type === 'object'" class="child-box">
        <div class="child-title">对象子字段</div>
        <NestedFieldEditor v-model="field.children" @update:model-value="emitUpdate" />
      </div>

      <div v-if="field.type === 'array'" class="child-box">
        <div class="child-title">数组元素类型</div>
        <el-select
          v-model="field.arrayItemType"
          placeholder="选择数组元素类型"
          style="width: 240px; margin-bottom: 8px"
          @change="() => onArrayItemTypeChange(field)"
        >
          <el-option v-for="t in arrayItemTypeOptions" :key="t" :label="t" :value="t" />
        </el-select>
        <div v-if="field.arrayItemType === 'object'">
          <div class="child-title">数组元素对象字段</div>
          <NestedFieldEditor v-model="field.arrayItemChildren" @update:model-value="emitUpdate" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'NestedFieldEditor' })

const props = defineProps({
  modelValue: {
    type: Array as any,
    default: () => []
  }
})

const emits = defineEmits(['update:modelValue'])

const primitiveTypeOptions = ['int32', 'int64', 'float', 'double', 'bool', 'enum', 'string', 'text', 'date', 'datetime']
const fieldTypeOptions = [...primitiveTypeOptions, 'object', 'array']
const arrayItemTypeOptions = [...primitiveTypeOptions, 'object']

const patchList = (updater: (list: any[]) => any[]) => {
  const next = updater((props.modelValue || []).map((item: any) => ({ ...item })))
  emits('update:modelValue', next)
}

const emitUpdate = () => {
  emits('update:modelValue', [...(props.modelValue || [])])
}

const addField = () => {
  patchList((list) => {
    list.push({
      _id: `${Date.now()}_${Math.random()}`,
      identifier: '',
      name: '',
      type: 'string',
      children: [],
      arrayItemType: 'string',
      arrayItemChildren: []
    })
    return list
  })
}

const removeField = (index: number) => {
  patchList((list) => {
    list.splice(index, 1)
    return list
  })
}

const onFieldTypeChange = (field: any) => {
  if (field.type === 'object') {
    field.children = field.children || []
    field.arrayItemType = undefined
    field.arrayItemChildren = []
  } else if (field.type === 'array') {
    field.arrayItemType = field.arrayItemType || 'string'
    field.arrayItemChildren = field.arrayItemChildren || []
    field.children = []
  } else {
    field.children = []
    field.arrayItemType = undefined
    field.arrayItemChildren = []
  }
  emitUpdate()
}

const onArrayItemTypeChange = (field: any) => {
  if (field.arrayItemType !== 'object') {
    field.arrayItemChildren = []
  } else {
    field.arrayItemChildren = field.arrayItemChildren || []
  }
  emitUpdate()
}
</script>

<style scoped lang="scss">
.nested-field-editor {
  .toolbar {
    margin-bottom: 8px;
  }
  .field-card {
    border: 1px solid #ebeef5;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 8px;
    background: #fff;
  }
  .row-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  .child-box {
    margin-top: 10px;
    padding: 10px;
    border: 1px dashed #dcdfe6;
    border-radius: 6px;
    background: #fafcff;
  }
  .child-title {
    font-size: 12px;
    color: #606266;
    margin-bottom: 6px;
  }
}
</style>
