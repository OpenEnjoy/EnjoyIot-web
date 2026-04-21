export const normalizeThingModelType = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'int':
    case 'int32':
      return 'int32'
    case 'long':
    case 'int64':
      return 'int64'
    case 'float':
      return 'float'
    case 'decimal':
    case 'double':
      return 'double'
    case 'str':
    case 'string':
      return 'string'
    case 'text':
      return 'text'
    case 'date':
      return 'date'
    case 'timestamp':
    case 'datetime':
      return 'datetime'
    case 'struct':
    case 'object':
      return 'object'
    case 'array':
      return 'array'
    case 'boolean':
    case 'bool':
      return 'bool'
    case 'enum':
      return 'enum'
    case 'position':
      return 'position'
    default:
      return (type || 'text').toLowerCase()
  }
}

export const isNumericThingModelType = (type?: string) =>
  ['int32', 'int64', 'float', 'double'].includes(normalizeThingModelType(type))

export const isTextThingModelType = (type?: string) =>
  ['string', 'text', 'date', 'datetime', 'position'].includes(normalizeThingModelType(type))

export const isComplexThingModelType = (type?: string) =>
  ['object', 'array'].includes(normalizeThingModelType(type))

export const parseSpecText = (text?: string, fallback: any = {}) => {
  if (!text || !text.trim()) {
    return fallback
  }
  return JSON.parse(text)
}

export const formatSpecText = (value: any) => {
  if (value == null) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  return JSON.stringify(value, null, 2)
}

export const stringifyThingModelValue = (value: any) => {
  if (value == null) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  return JSON.stringify(value, null, 2)
}

export const ParseProperty = (model, enumItems, boolItem) => {
  const modelRaw = JSON.parse(JSON.stringify(model))
  const dataType = modelRaw.dataType || { specs: {} }
  dataType.type = normalizeThingModelType(dataType.type)
  if (!dataType.specs) {
    dataType.specs = {}
  }

  if (dataType.type == 'enum') {
    dataType.specs = {}
    enumItems.forEach((item) => {
      if (item?.value !== undefined && item?.value !== '') {
        dataType.specs[item.value] = item.name
      }
    })
  } else if (dataType.type == 'bool') {
    dataType.specs = {
      '0': boolItem._true,
      '1': boolItem._false
    }
  } else if (['int32', 'int64'].includes(dataType.type)) {
    dataType.specs = {
      min: dataType.specs.min,
      max: dataType.specs.max
    }
  } else if (['float', 'double'].includes(dataType.type)) {
    dataType.specs = {
      min: dataType.specs.min,
      max: dataType.specs.max,
      precision: dataType.specs.precision
    }
  } else if (['string', 'text'].includes(dataType.type)) {
    dataType.specs = {
      length: dataType.specs.length
    }
  } else if (['date', 'datetime'].includes(dataType.type)) {
    dataType.specs = {
      format: dataType.specs.format
    }
  } else if (dataType.type == 'position') {
    dataType.specs = {
      locateType: dataType.specs.locateType
    }
  } else if (dataType.type == 'object') {
    const parsed = parseSpecText(dataType.schemaText, { properties: [] })
    dataType.specs = {
      properties: parsed.properties || parsed.fields || []
    }
  } else if (dataType.type == 'array') {
    const parsed = parseSpecText(dataType.itemTypeText, { type: 'string' })
    dataType.specs = {
      itemType: parsed
    }
  } else {
    dataType.specs = {}
  }

  return {
    description: modelRaw.description,
    unit: modelRaw.unit,
    identifier: modelRaw.identifier,
    name: modelRaw.name,
    dataType,
    accessMode: modelRaw.accessMode || 'r'
  }
}
