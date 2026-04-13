<template>
  <div class="leaflet-map-wrapper">
    <div v-if="props.isWrite" class="address-select">
      <el-input
        v-model="searchQuery"
        placeholder="输入地址搜索位置"
        clearable
        @keyup.enter="searchAddress"
      >
        <template #append>
          <el-button icon="Search" @click="searchAddress" />
        </template>
      </el-input>
      <div v-if="searchResults.length > 0" class="search-results">
        <div
          v-for="result in searchResults"
          :key="result.place_id"
          class="search-result-item"
          @click="selectSearchResult(result)"
        >
          {{ result.display_name }}
        </div>
      </div>
    </div>
    <div v-if="!props.isWrite" class="address-display">
      <span>位置: {{ displayAddress || '暂无位置信息' }}</span>
    </div>
    <div ref="mapContainer" class="map-container"></div>
  </div>
</template>

<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { propTypes } from '@/utils/propTypes'

const emits = defineEmits(['locateChange', 'addressChange'])
const props = defineProps({
  clickMap: propTypes.bool.def(false),
  isWrite: propTypes.bool.def(false),
  center: propTypes.string.def(''),
  address: propTypes.string.def('')
})

const mapContainer = ref<HTMLElement>()
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const displayAddress = ref('')
let map: L.Map | null = null
let marker: L.Marker | null = null

const initMap = () => {
  if (!mapContainer.value) return

  const defaultCenter: [number, number] = [39.9042, 116.4074]
  const initialCenter = props.center ? parseCenter(props.center) : defaultCenter

  map = L.map(mapContainer.value).setView(initialCenter, 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map)

  if (props.clickMap) {
    map.on('click', handleMapClick)
  }

  if (props.center) {
    const coords = parseCenter(props.center)
    setMarker(coords)
  }

  if (props.address) {
    displayAddress.value = props.address
  }
}

const parseCenter = (center: string): [number, number] => {
  if (!center) return [39.9042, 116.4074]
  const parts = center.split(',')
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0].trim())
    const lon = parseFloat(parts[1].trim())
    if (!isNaN(lat) && !isNaN(lon)) {
      return [lat, lon]
    }
  }
  return [39.9042, 116.4074]
}

const setMarker = (coords: [number, number]) => {
  if (!map) return

  if (marker) {
    map.removeLayer(marker)
  }

  const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })

  marker = L.marker(coords, { icon: defaultIcon }).addTo(map)
  map.setView(coords, 15)
}

const handleMapClick = (e: L.LeafletMouseEvent) => {
  const { lat, lng } = e.latlng
  setMarker([lat, lng])
  reverseGeocode(lat, lng)
  emits('locateChange', [lat, lng])
}

const searchAddress = async () => {
  if (!searchQuery.value.trim()) return

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}&limit=5`
    )
    const data = await response.json()
    searchResults.value = data
  } catch (error) {
    console.error('地址搜索失败:', error)
    ElMessage.error('地址搜索失败')
  }
}

const selectSearchResult = (result: any) => {
  const lat = parseFloat(result.lat)
  const lon = parseFloat(result.lon)
  const address = result.display_name

  setMarker([lat, lon])
  displayAddress.value = address
  searchResults.value = []

  emits('locateChange', [lat, lon])
  emits('addressChange', address)
}

const reverseGeocode = async (lat: number, lon: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    )
    const data = await response.json()
    if (data && data.display_name) {
      displayAddress.value = data.display_name
      emits('addressChange', data.display_name)
    }
  } catch (error) {
    console.error('逆地理编码失败:', error)
  }
}

watch(() => props.center, (newCenter) => {
  if (newCenter && map) {
    const coords = parseCenter(newCenter)
    setMarker(coords)
  }
})

watch(() => props.address, (newAddress) => {
  if (newAddress) {
    displayAddress.value = newAddress
  }
})

onMounted(() => {
  nextTick(() => {
    initMap()
  })
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.leaflet-map-wrapper {
  width: 100%;
}

.address-select {
  margin-bottom: 10px;
  position: relative;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.search-result-item {
  padding: 10px;
  cursor: pointer;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.search-result-item:hover {
  background-color: #f5f7fa;
}

.search-result-item:last-child {
  border-bottom: none;
}

.address-display {
  margin-bottom: 10px;
  font-size: 14px;
  color: #606266;
  padding: 10px 0;
}

.map-container {
  width: 100%;
  height: 300px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

:deep(.leaflet-control-attribution) {
  font-size: 10px;
}
</style>
