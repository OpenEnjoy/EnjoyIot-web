<template>
  <div>
    <el-table :data="list" border style="width: 95%">
      <el-table-column label="序号" align="center" width="180" />
      <el-table-column label="设备ID" align="center" width="80" />
      <el-table-column label="产品" align="center" width="180" />
      <el-table-column label="设备DN" align="center" />
      <el-table-column label="状态" align="center" />
      <el-table-column label="创建时间" align="center" />
      <el-table-column label="操作" align="center" />
    </el-table>
    <div class="mt-[20px] w-400px ml-auto">
      <el-pagination
        v-model:current-page="page.pageNo"
        v-model:page-size="page.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, pager, jumper"
        :total="page.total"
        @size-change="getList"
        @current-change="getList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">


import {getChildrenDeviceList} from "@/api/eiot/deviceinfo/devices.api";

const props = defineProps({
  deviceInfo: {
    type: Object,
    default: () => {}
  }
})

const page = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0
})
const list = ref([])

const getList = () => {
  getChildrenDeviceList({
    pageNo: page.pageNo,
    pageSize: page.pageSize,
    coverData: props.deviceInfo.deviceId,
  }).then((res) => {
    list.value = res.data
    console.log(res)
  })
}

onMounted(() => {
  console.log(props.deviceInfo)
  getList()
})
</script>

<style scoped></style>
