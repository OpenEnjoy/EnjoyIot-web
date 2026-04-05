<template>
  <div class="product-alert-config">
    <yt-crud
      ref="crudRef"
      :data="data"
      :column="column"
      :table-props="{ selection: false }"
      :add-callback="onAddCallback"
      :edit-callback="onEditCallback"
      @save-fun="onSave"
      @del-fun="handleDelete"
      @onLoad="getData"
      :loading="state.loading"
      :total="state.total"
      v-model:page="state.page"
      v-model:query="state.query"
    >
      <template #status="scope">
        <el-switch
          v-model="scope.row.status"
          :active-value="0"
          :inactive-value="1"
          @change="handleStatusChange(scope.row)"
        />
      </template>
    </yt-crud>

    <el-dialog
      v-model="conditionDialogVisible"
      title="配置告警条件"
      width="700px"
      @closed="onConditionDialogClosed"
    >
      <div class="condition-editor">
        <div class="logic-selector">
          <el-radio-group v-model="tempConditions.logic">
            <el-radio label="AND">所有条件满足 (AND)</el-radio>
            <el-radio label="OR">任一条件满足 (OR)</el-radio>
          </el-radio-group>
        </div>

        <div class="condition-list">
          <div
            v-for="(item, index) in tempConditions.items"
            :key="index"
            class="condition-item"
          >
            <el-select v-model="item.type" placeholder="条件类型" style="width: 120px">
              <el-option label="属性" value="property" />
              <el-option label="状态" value="status" />
            </el-select>
            <el-input v-model="item.key" placeholder="属性/状态标识" style="width: 140px" />
            <el-select v-model="item.operator" placeholder="运算符" style="width: 120px">
              <el-option label="大于" value=">" />
              <el-option label="小于" value="<" />
              <el-option label="等于" value="==" />
              <el-option label="不等于" value="!=" />
              <el-option label="大于等于" value=">=" />
              <el-option label="小于等于" value="<=" />
              <el-option label="包含" value="contains" />
              <el-option label="不包含" value="not_contains" />
            </el-select>
            <el-input v-model="item.value" placeholder="比较值" style="width: 120px" />
            <el-button type="danger" @click="removeCondition(index)">删除</el-button>
          </div>
        </div>

        <el-button type="primary" plain @click="addCondition">添加条件</el-button>
      </div>

      <template #footer>
        <el-button @click="conditionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmConditions">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { IColumn } from '@/components/common/types/tableCommon'
import {
  getDeviceAlertConfigPage,
  createDeviceAlertConfig,
  updateDeviceAlertConfig,
  deleteDeviceAlertConfig,
  ConditionVO,
} from '@/api/eiot/devicealert/devicealert.api'
import YtCrud from '@/components/common/yt-crud.vue'

const props = defineProps({
  productId: {
    type: Number,
    required: true,
  },
})

const state = reactive({
  page: { pageSize: 10, pageNo: 1 },
  total: 0,
  loading: false,
  query: {},
})

const column = ref<IColumn[]>([
  {
    label: '告警名称',
    key: 'name',
    search: true,
    rules: [{ required: true, message: '告警名称不能为空' }],
  },
  {
    label: '告警等级',
    key: 'level',
    tableWidth: 120,
    type: 'select',
    rules: [{ required: true, message: '请选择告警等级' }],
    componentProps: {
      options: [
        { label: '1级', value: '1' },
        { label: '2级', value: '2' },
        { label: '3级', value: '3' },
        { label: '4级', value: '4' },
        { label: '5级', value: '5' },
      ],
    },
  },
  {
    label: '条件',
    key: 'conditionsStr',
    tableWidth: 200,
    hide: true,
  },
  {
    label: '是否启用',
    key: 'status',
    tableWidth: 120,
    type: 'switch',
    slot: true,
    componentProps: { activeValue: 0, inactiveValue: 1 },
  },
  {
    label: '备注',
    key: 'remark',
    hide: true,
    componentProps: { type: 'textarea', rows: 2 },
  },
])

const data = ref([])
const crudRef = ref()
const conditionDialogVisible = ref(false)
const tempConditions = reactive({
  logic: 'AND',
  items: [] as ConditionVO[],
})
const currentEditId = ref<number | null>(null)

const getData = () => {
  state.loading = true
  getDeviceAlertConfigPage({
    ...state.page,
    ...state.query,
    productId: props.productId,
  })
    .then((res) => {
      data.value = res.list.map((item: any) => ({
        ...item,
        conditionsStr: formatConditions(item.conditions),
      }))
      state.total = res.total
    })
    .finally(() => {
      state.loading = false
    })
}

const formatConditions = (conditions: any) => {
  if (!conditions || !conditions.items) return ''
  const logic = conditions.logic === 'AND' ? '且' : '或'
  return conditions.items
    .map((item: any) => `${item.type === 'property' ? '属性' : '状态'}: ${item.key} ${item.operator} ${item.value}`)
    .join(` ${logic} `)
}

const onAddCallback = (data: any) => {
  data.productId = props.productId
  currentEditId.value = null
  return data
}

const onEditCallback = (data: any) => {
  currentEditId.value = data.id
  if (data.conditions) {
    tempConditions.logic = data.conditions.logic || 'AND'
    tempConditions.items = [...(data.conditions.items || [])]
  } else {
    tempConditions.logic = 'AND'
    tempConditions.items = []
  }
  return data
}

const onSave = ({ data: saveData, cancel }: any) => {
  state.loading = true
  const configData = {
    ...saveData,
    conditions: tempConditions.items.length > 0 ? tempConditions : undefined,
  }

  const request = saveData.id
    ? updateDeviceAlertConfig(configData)
    : createDeviceAlertConfig(configData)

  request
    .then(() => {
      ElMessage.success('保存成功')
      cancel()
      getData()
    })
    .finally(() => {
      state.loading = false
    })
}

const handleDelete = (row: any) => {
  state.loading = true
  deleteDeviceAlertConfig(row.id)
    .then(() => {
      ElMessage.success('删除成功')
      getData()
    })
    .finally(() => {
      state.loading = false
    })
}

const handleStatusChange = (row: any) => {
  if (!row || !row.id) return
  state.loading = true
  updateDeviceAlertConfig(row)
    .then(() => {
      ElMessage.success('状态更新成功')
    })
    .catch(() => {
      row.status = row.status === 0 ? 1 : 0
      ElMessage.error('状态更新失败')
    })
    .finally(() => {
      state.loading = false
    })
}

const addCondition = () => {
  tempConditions.items.push({
    type: 'property',
    key: '',
    operator: '>',
    value: '',
  })
}

const removeCondition = (index: number) => {
  tempConditions.items.splice(index, 1)
}

const confirmConditions = () => {
  conditionDialogVisible.value = false
}

const onConditionDialogClosed = () => {
  tempConditions.items = []
  currentEditId.value = null
}

onMounted(() => {
  getData()
})
</script>

<style lang="scss" scoped>
.condition-editor {
  .logic-selector {
    margin-bottom: 16px;
  }
  .condition-list {
    margin-bottom: 16px;
    .condition-item {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }
  }
}
</style>
