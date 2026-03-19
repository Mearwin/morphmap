import type { Entity, Link } from '../types'
import { THEME } from '../constants'
import { influenceStrokeWidth } from './labelPlacement'
import { computeControlPoint } from './curve'
import { buildAdjacency, getAncestors, getDescendants } from './graph'

const PAD = 80
const NODE_RADIUS = 8
const TITLE_FONT_SIZE = 14
const LABEL_FONT_SIZE = 11
const HEADER_HEIGHT = 44
const COL_WIDTH = 180
const ROW_HEIGHT = 50

interface LayoutNode {
  id: string
  title: string
  year: string
  x: number
  y: number
  isSelected: boolean
}

/**
 * Build a simple left-to-right layout: ancestors -> selected -> descendants,
 * each column sorted by date. No dependency on timeline node positions.
 */
function layoutSubgraph(
  selectedId: string,
  games: Entity[],
  links: Link[],
): { nodes: LayoutNode[]; subLinks: Link[] } {
  const adj = buildAdjacency(links)
  const ancestorIds = getAncestors(selectedId, links, adj)
  const descendantIds = getDescendants(selectedId, links, adj)
  const allIds = new Set([selectedId, ...ancestorIds, ...descendantIds])

  const gameMap = new Map(games.map(g => [g.id, g]))

  // Build columns: ancestors (left), selected (center), descendants (right)
  const ancestorList = [...ancestorIds].map(id => gameMap.get(id)!).filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))
  const descendantList = [...descendantIds].map(id => gameMap.get(id)!).filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))

  const selectedGame = gameMap.get(selectedId)
  if (!selectedGame) return { nodes: [], subLinks: [] }

  const layoutNodes: LayoutNode[] = []

  // Ancestors column
  const ancestorColX = PAD
  for (let i = 0; i < ancestorList.length; i++) {
    const g = ancestorList[i]
    layoutNodes.push({
      id: g.id,
      title: g.title,
      year: g.date.slice(0, 4),
      x: ancestorColX,
      y: PAD + HEADER_HEIGHT + i * ROW_HEIGHT,
      isSelected: false,
    })
  }

  // Selected column (center)
  const selectedColX = ancestorList.length > 0 ? ancestorColX + COL_WIDTH : PAD
  const selectedY = PAD + HEADER_HEIGHT + Math.max(ancestorList.length - 1, descendantList.length - 1, 0) * ROW_HEIGHT / 2
  layoutNodes.push({
    id: selectedGame.id,
    title: selectedGame.title,
    year: selectedGame.date.slice(0, 4),
    x: selectedColX,
    y: selectedY,
    isSelected: true,
  })

  // Descendants column
  const descendantColX = selectedColX + COL_WIDTH
  for (let i = 0; i < descendantList.length; i++) {
    const g = descendantList[i]
    layoutNodes.push({
      id: g.id,
      title: g.title,
      year: g.date.slice(0, 4),
      x: descendantColX,
      y: PAD + HEADER_HEIGHT + i * ROW_HEIGHT,
      isSelected: false,
    })
  }

  // Filter links to subgraph
  const ancestorsWithSelected = new Set([selectedId, ...ancestorIds])
  const descendantsWithSelected = new Set([selectedId, ...descendantIds])
  const subLinks = links.filter(l => {
    if (!allIds.has(l.source) || !allIds.has(l.target)) return false
    return (ancestorsWithSelected.has(l.source) && ancestorsWithSelected.has(l.target))
      || (descendantsWithSelected.has(l.source) && descendantsWithSelected.has(l.target))
  })

  return { nodes: layoutNodes, subLinks }
}

export function exportSubgraphAsPng(
  selectedId: string,
  games: Entity[],
  links: Link[],
  gameColors: Map<string, string>,
) {
  const { nodes, subLinks } = layoutSubgraph(selectedId, games, links)
  if (nodes.length === 0) return

  // Compute canvas size from layout
  let maxX = 0, maxY = 0
  for (const n of nodes) {
    maxX = Math.max(maxX, n.x)
    maxY = Math.max(maxY, n.y)
  }
  const canvasW = maxX + PAD
  const canvasH = maxY + PAD

  const canvas = document.createElement('canvas')
  const dpr = 2
  canvas.width = canvasW * dpr
  canvas.height = canvasH * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  // Background
  ctx.fillStyle = THEME.bg
  ctx.fillRect(0, 0, canvasW, canvasH)

  // Header
  const selectedNode = nodes.find(n => n.isSelected)
  if (selectedNode) {
    const dotColor = gameColors.get(selectedNode.id) ?? THEME.textMuted
    ctx.fillStyle = dotColor
    ctx.beginPath()
    ctx.arc(PAD, HEADER_HEIGHT / 2, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = THEME.text
    ctx.font = `600 ${TITLE_FONT_SIZE}px Inter, -apple-system, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(
      `${selectedNode.title} (${selectedNode.year}) — Influence Lineage`,
      PAD + 14,
      HEADER_HEIGHT / 2,
    )
  }

  // Build node position map
  const nodePos = new Map(nodes.map(n => [n.id, n]))

  // Draw links
  for (const link of subLinks) {
    const source = nodePos.get(link.source)
    const target = nodePos.get(link.target)
    if (!source || !target) continue

    const { midX, controlY } = computeControlPoint(source, target, 0.2, 60)

    ctx.globalAlpha = 0.5
    ctx.strokeStyle = THEME.textMuted
    ctx.lineWidth = influenceStrokeWidth(link.through.length)
    ctx.beginPath()
    ctx.moveTo(source.x, source.y)
    ctx.quadraticCurveTo(midX, controlY, target.x, target.y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // Draw nodes
  for (const node of nodes) {
    const color = gameColors.get(node.id) ?? THEME.textMuted
    const r = node.isSelected ? NODE_RADIUS * 1.5 : NODE_RADIUS

    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    if (node.isSelected) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Label
    const fontSize = node.isSelected ? LABEL_FONT_SIZE + 1 : LABEL_FONT_SIZE
    const fontWeight = node.isSelected ? '600' : '400'
    ctx.font = `${fontWeight} ${fontSize}px Inter, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = node.isSelected ? THEME.text : THEME.textMuted

    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetY = 1
    ctx.fillText(`${node.title} (${node.year})`, node.x, node.y - r - 4)
    ctx.restore()
  }

  // Watermark
  ctx.fillStyle = THEME.textMuted
  ctx.globalAlpha = 0.4
  ctx.font = '10px Inter, -apple-system, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText('Morphmap', canvasW - 12, canvasH - 8)
  ctx.globalAlpha = 1

  // Trigger download
  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `morphmap-${selectedId}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
