import request from '@/config/axios'

enum Api {
  configList = '/eiot/device-alert/config/page',
  configGet = '/eiot/device-alert/config/get',
  configCreate = '/eiot/device-alert/config/create',
  configUpdate = '/eiot/device-alert/config/update',
  configDelete = '/eiot/device-alert/config/delete',
  configListByDevice = '/eiot/device-alert/config/list-by-device',
  configListByProduct = '/eiot/device-alert/config/list-by-product',
  recordList = '/eiot/device-alert/record/page',
  recordListByDevice = '/eiot/device-alert/record/list-by-device',
}

export interface ConditionVO {
  type: string
  key: string
  operator: string
  value: string
}

export interface TriggerOptionsVO {
  durationSec?: number
  silentSec?: number
  enableRecover?: boolean
}

export interface DeviceAlertConfigVO {
  id?: number
  name: string
  productId?: number
  deviceId?: number
  level?: string
  conditions: ConditionVO[]
  triggerOptions?: TriggerOptionsVO
  status?: number
  remark?: string
}

export interface DeviceAlertRecordVO {
  id: number
  deviceId: number
  productId?: number
  alertConfigId: number
  alertTime: number
  alertState: string
  level?: string
  name?: string
  details?: string
  readFlg?: boolean
}

export const getDeviceAlertConfigPage = (data) => {
  return request.get({ url: Api.configList, params: data })
}

export const getDeviceAlertConfig = (id: number) => {
  return request.get({ url: Api.configGet, params: { id } })
}

export const createDeviceAlertConfig = (data: DeviceAlertConfigVO) => {
  return request.post({ url: Api.configCreate, data })
}

export const updateDeviceAlertConfig = (data: DeviceAlertConfigVO) => {
  return request.put({ url: Api.configUpdate, data })
}

export const deleteDeviceAlertConfig = (id: number) => {
  return request.delete({ url: Api.configDelete, params: { id } })
}

export const getDeviceAlertConfigListByDevice = (deviceId: number) => {
  return request.get({ url: Api.configListByDevice, params: { deviceId } })
}

export const getDeviceAlertConfigListByProduct = (productId: number) => {
  return request.get({ url: Api.configListByProduct, params: { productId } })
}

export const getDeviceAlertRecordPage = (data) => {
  return request.get({ url: Api.recordList, params: data })
}

export const getDeviceAlertRecordListByDevice = (deviceId: number) => {
  return request.get({ url: Api.recordListByDevice, params: { deviceId } })
}
