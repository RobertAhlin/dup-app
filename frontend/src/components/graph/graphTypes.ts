import type { NodeTypes, EdgeTypes } from 'reactflow'
import HubNode from './HubNode'
import TaskNode from './TaskNode'
import HubTaskEdge from './HubTaskEdge'

// Freeze the maps to guarantee referential + structural stability across dev StrictMode & HMR cycles.
// This prevents accidental mutation that could trigger React Flow #002 warning.
export const nodeTypes: NodeTypes = Object.freeze({
  hubNode: HubNode,
  taskNode: TaskNode,
})

export const edgeTypes: EdgeTypes = Object.freeze({
  floatingHubTask: HubTaskEdge,
})
