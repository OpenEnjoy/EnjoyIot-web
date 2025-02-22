<template>
  <yt-crud
    ref="crudRef"
    :data="data"
    :column="column"
    :table-props="{
        selection: false,
      }"
    @save-fun="onSave"
    @del-fun="handleDelete"
    @onLoad="getData"
    :loading="state.loading"
    :total="state.total"
    v-model:page="state.page"
    v-model:query="state.query"
  />
</template>

<script lang="ts" setup>
import { IColumn } from '@/components/common/types/tableCommon'
import { getConfigList, saveConfig, deleteConfig } from '@/api/eiot/alarm/alarm.api'
import { getRuleList } from '@/api/eiot/ruleEngine/rule.api'
import YtCrud from '@/components/common/yt-crud.vue'
import { getConfigAll } from '@/api/eiot/channel/configs.api'
import {getTemplatesList} from "@/api/eiot/channel/templates.api";

const state = reactive({
  page: {
    pageSize: 10,
    pageNum: 1,
  },
  total: 0,
  loading: false,
  query: {},
})
const column = ref<IColumn[]>([{
  label: '配置名称',
  key: 'name',
  search: true,
  rules: [{ required: true, message: '配置名称不能为空' }],
}, {
  label: '告警等级',
  key: 'level',
  tableWidth: 120,
  search: true,
  type: 'select',
  rules: [{ required: true, message: '请选择告警等级' }],
  componentProps: {
    style: 'width: 150px',
    options: [{
      label: 1,
      value: 1,
    }, {
      label: 2,
      value: 2,
    }, {
      label: 3,
      value: 3,
    }, {
      label: 4,
      value: 4,
    }, {
      label: 5,
      value: 5,
    }],
  }
}, {
  label: '消息模板',
  key: 'messageTemplateId',
  type: 'select',
  tableWidth: 120,
  componentProps: {
    labelAlias: 'title',
    valueAlias: 'id',
    options: []
  }
}, {
  label: '规则',
  key: 'ruleInfoId',
  tableWidth: 120,
  type: 'select',
  componentProps: {
    labelAlias: 'name',
    valueAlias: 'id',
    options: []
  }
}, {
  label: '是否启用',
  key: 'status',
  tableWidth: 120,
  type: 'switch',
  componentProps: {
    activeValue: 0,
    inactiveValue: 1,
  }
}, {
  label: '告警描述',
  key: 'description',
  hide: true,
  componentProps: {
    type: 'textarea',
    rows: 4,
  }
}])

const getDict = async () => {
  let options: any[] = []
  const res1 = await getRuleList({
    pageSize: 100,
    pageNum: 1,
    tye: 'scene',
  })
  const res2 = await getRuleList({
    pageSize: 100,
    pageNum: 1,
    typ: 'flow',
  })
  options = [...res1.list, ...res2.list]
  column.value.forEach(item => {
    if (item.key === 'ruleInfoId') {
      item.componentProps.options = options
    }
  })

  getTemplatesList({}).then(res => {
    console.log("gettem:",res)
    column.value.forEach(item => {
    if (item.key === 'messageTemplateId') {
      item.componentProps.options = res.list
    }
  })
  })
}
getDict()
const getData =  () => {
  state.loading = true
  getConfigList({
    ...state.page,
    ...state.query,
  }).then((res) => {
    data.value = res.list
    state.total = res.total
  }).finally(() => {
    state.loading = false
  })
}
// 保存数据
const onSave = ({type, data, cancel}: any) => {
  state.loading = true
  saveConfig(toRaw(data)).then(res => {
      cancel()
      getData()
  }).finally(() => {
    state.loading = false
  })


}
// 删除
const handleDelete =  (row: any) => {
  state.loading = true
  deleteConfig(row.id).then(res => {
      ElMessage.success('删除成功!')
      getData()
  }).finally(() => {
    state.loading = false
  })
}
const data = ref([])
</script>

<!-- <style lang="scss" scoped>

</style> -->
