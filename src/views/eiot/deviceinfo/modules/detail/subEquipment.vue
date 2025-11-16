<template>
  <div>
    <el-table :data="list" border style="width: 95%">
      <el-table-column label="序号" type="index" align="center" width="80" />
      <el-table-column label="设备名称" property="name" align="center" width="180" />
      <el-table-column label="产品" property="productName" align="center" width="180" />
      <el-table-column label="设备DN" property="dn" align="center" />
      <el-table-column label="状态" align="center">
        <template v-slot="scope">
          <el-tag v-if="scope.row.state === 1" type="success" size="small">在线</el-tag>
          <el-tag v-else type="danger" size="small">离线</el-tag>
        </template>
      </el-table-column>
      <el-table-column :formatter="dateFormatter"  label="创建时间" prop="createTime" align="center"/>
      <el-table-column label="操作" align="center">
        <template v-slot="scope">
          <el-popconfirm title="确认要解除与网关的关联吗？" @confirm="handleDelete(scope.row)">
            <template #reference>
              <el-button link type="danger" icon="Delete">解绑</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>>
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


import {getChildrenDeviceList, unbindDevice} from "@/api/eiot/deviceinfo/devices.api";
import {dateFormatter} from "@/utils/formatTime";
import {ElPopconfirm} from "element-plus";

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
    parentId: props.deviceInfo.deviceId,
  }).then((res) => {
    list.value = res.list
    console.log(res)
  })
}

const handleDelete = async (row: any) => {
  await unbindDevice({
    id: row.id
  })
  ElMessage.success('解绑成功!')
  getList()
}

onMounted(() => {
  console.log(props.deviceInfo)
  getList()
})
</script>

<style scoped></style>
