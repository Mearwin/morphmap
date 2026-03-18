import {
  forceSimulation,
  forceX,
  forceY,
  forceCollide,
  forceManyBody,
} from 'd3-force'

interface NodeData {
  id: string
  x: number
  y: number
  radius: number
  targetX: number
  targetY: number
  title: string
}

interface WorkerConfig {
  xStrength: number
  yStrength: number
  collidePadding: number
  collideStrength: number
  chargeStrength: number
  chargeDistanceMax: number
  alphaDecay: number
}

interface InitMessage {
  type: 'init'
  nodes: NodeData[]
  config: WorkerConfig
}

interface StopMessage {
  type: 'stop'
}

type IncomingMessage = InitMessage | StopMessage

let simulation: ReturnType<typeof forceSimulation<NodeData>> | null = null

function postPositions(type: 'tick' | 'end') {
  const positions = simulation!.nodes().map(n => ({ id: n.id, x: n.x, y: n.y }))
  self.postMessage({ type, positions })
}

self.onmessage = (e: MessageEvent<IncomingMessage>) => {
  try {
    const msg = e.data

    if (msg.type === 'stop') {
      simulation?.stop()
      simulation = null
      return
    }

    if (msg.type === 'init') {
      simulation?.stop()

      const { nodes, config } = msg

      simulation = forceSimulation(nodes)
        .force('x', forceX<NodeData>().x(d => d.targetX).strength(config.xStrength))
        .force('y', forceY<NodeData>().y(d => d.targetY).strength(config.yStrength))
        .force('collide', forceCollide<NodeData>().radius(d => d.radius + config.collidePadding).strength(config.collideStrength))
        .force('charge', forceManyBody().strength(config.chargeStrength).distanceMax(config.chargeDistanceMax))
        .alphaDecay(config.alphaDecay)
        .on('tick', () => {
          try {
            postPositions('tick')
          } catch (err) {
            self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
          }
        })
        .on('end', () => {
          try {
            postPositions('end')
          } catch (err) {
            self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
          }
        })
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
