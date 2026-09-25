export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface TreemapInputItem<T> {
  id: string
  value: number
  data: T
}

export interface TreemapRectItem<T> {
  x: number
  y: number
  width: number
  height: number
  data: T
}

export interface HierarchicalSectorNode<T> {
  sector: string
  totalValue: number
  rect: Rect
  items: TreemapRectItem<T>[]
}

interface LayoutItem<T> {
  value: number
  data: T
}

function worstRatio(row: number[], w: number): number {
  if (row.length === 0) return Infinity
  const sum = row.reduce((a, b) => a + b, 0)
  if (sum === 0 || w === 0) return Infinity
  const rMax = Math.max(...row)
  const rMin = Math.min(...row)
  const wSq = w * w
  const sumSq = sum * sum
  return Math.max((wSq * rMax) / sumSq, sumSq / (wSq * rMin))
}

function squarify<T>(
  children: LayoutItem<T>[],
  rect: Rect
): TreemapRectItem<T>[] {
  const result: TreemapRectItem<T>[] = []
  if (children.length === 0 || rect.width <= 0 || rect.height <= 0) {
    return result
  }

  const totalValue = children.reduce((s, c) => s + c.value, 0)
  if (totalValue <= 0) {
    const equalVal = 1
    children = children.map(c => ({ ...c, value: equalVal }))
  }

  const totalArea = rect.width * rect.height
  const normalized = children.map(c => ({
    area: (c.value / (totalValue || 1)) * totalArea,
    data: c.data,
  }))

  let currentRect = { ...rect }
  let remaining = [...normalized]

  while (remaining.length > 0) {
    const isHorizontal = currentRect.width >= currentRect.height
    const side = isHorizontal ? currentRect.height : currentRect.width

    let row = [remaining[0]]
    let rowAreas = [remaining[0].area]

    let i = 1
    while (i < remaining.length) {
      const nextArea = remaining[i].area
      const candidateAreas = [...rowAreas, nextArea]
      if (worstRatio(candidateAreas, side) <= worstRatio(rowAreas, side)) {
        row.push(remaining[i])
        rowAreas.push(nextArea)
        i++
      } else {
        break
      }
    }

    const rowAreaSum = rowAreas.reduce((a, b) => a + b, 0)
    const rowThickness = side > 0 ? rowAreaSum / side : 0

    let offset = 0
    for (const item of row) {
      const itemLen = rowThickness > 0 ? item.area / rowThickness : 0
      if (isHorizontal) {
        result.push({
          x: Math.round(currentRect.x),
          y: Math.round(currentRect.y + offset),
          width: Math.max(1, Math.round(rowThickness)),
          height: Math.max(1, Math.round(itemLen)),
          data: item.data,
        })
      } else {
        result.push({
          x: Math.round(currentRect.x + offset),
          y: Math.round(currentRect.y),
          width: Math.max(1, Math.round(itemLen)),
          height: Math.max(1, Math.round(rowThickness)),
          data: item.data,
        })
      }
      offset += itemLen
    }

    if (isHorizontal) {
      currentRect.x += rowThickness
      currentRect.width = Math.max(0, currentRect.width - rowThickness)
    } else {
      currentRect.y += rowThickness
      currentRect.height = Math.max(0, currentRect.height - rowThickness)
    }

    remaining = remaining.slice(row.length)
  }

  return result
}

export function layoutHierarchicalTreemap<T extends { sector?: string }>(
  items: TreemapInputItem<T>[],
  bounds: Rect,
  headerHeight: number = 24,
  _padding: number = 0
): HierarchicalSectorNode<T>[] {
  if (items.length === 0 || bounds.width <= 0 || bounds.height <= 0) {
    return []
  }

  const sectorGroups = new Map<string, TreemapInputItem<T>[]>()
  for (const item of items) {
    const sectorName = item.data.sector || 'Otros'
    if (!sectorGroups.has(sectorName)) {
      sectorGroups.set(sectorName, [])
    }
    sectorGroups.get(sectorName)!.push(item)
  }

  const sectorList = Array.from(sectorGroups.entries()).map(([sector, groupItems]) => ({
    sector,
    totalValue: groupItems.reduce((acc, it) => acc + (it.value > 0 ? it.value : 1), 0),
    items: groupItems,
  }))

  sectorList.sort((a, b) => b.totalValue - a.totalValue)

  const sectorInputItems: LayoutItem<{
    sector: string
    totalValue: number
    groupItems: TreemapInputItem<T>[]
  }>[] = sectorList.map(s => ({
    value: s.totalValue,
    data: { sector: s.sector, totalValue: s.totalValue, groupItems: s.items },
  }))

  const sectorRects = squarify(sectorInputItems, bounds)

  const result: HierarchicalSectorNode<T>[] = []

  for (const sr of sectorRects) {
    const sectorData = sr.data
    const availableWidth = Math.max(1, sr.width)
    const availableHeight = Math.max(1, sr.height - headerHeight)

    const sortedGroupItems = [...sectorData.groupItems].sort((a, b) => b.value - a.value)
    const childLayoutItems: LayoutItem<T>[] = sortedGroupItems.map(it => ({
      value: it.value > 0 ? it.value : 1,
      data: it.data,
    }))

    const childRects = squarify(childLayoutItems, {
      x: 0,
      y: 0,
      width: availableWidth,
      height: availableHeight,
    })

    result.push({
      sector: sectorData.sector,
      totalValue: sectorData.totalValue,
      rect: {
        x: sr.x,
        y: sr.y,
        width: sr.width,
        height: sr.height,
      },
      items: childRects,
    })
  }

  return result
}

