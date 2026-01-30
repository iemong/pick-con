import type { ComponentInfo } from "./types"

interface FiberNode {
  tag: number
  type: any
  memoizedProps: Record<string, unknown>
  memoizedState: any
  stateNode: any
  return: FiberNode | null
  child: FiberNode | null
  sibling: FiberNode | null
}

export function collectReactComponent(
  element: Element
): ComponentInfo | null {
  const fiber = getFiber(element)
  if (!fiber) return null

  const hierarchy = getComponentHierarchy(fiber)
  if (hierarchy.length === 0) return null

  const nearestComponent = findNearestComponent(fiber)
  const props = nearestComponent
    ? safeSerialize(nearestComponent.memoizedProps)
    : undefined
  const state = nearestComponent
    ? extractState(nearestComponent)
    : undefined

  return {
    framework: "react",
    hierarchy,
    props: props as Record<string, unknown> | undefined,
    state: state as Record<string, unknown> | undefined,
  }
}

function getFiber(element: Element): FiberNode | null {
  for (const key of Object.keys(element)) {
    if (key.startsWith("__reactFiber$")) {
      return (element as any)[key] as FiberNode
    }
  }
  return null
}

function getComponentHierarchy(fiber: FiberNode): string[] {
  const components: string[] = []
  let current: FiberNode | null = fiber

  while (current) {
    if (isComponentFiber(current)) {
      const name = getComponentName(current)
      if (name) {
        components.unshift(name)
      }
    }
    current = current.return
  }

  return components
}

function findNearestComponent(fiber: FiberNode): FiberNode | null {
  let current: FiberNode | null = fiber
  while (current) {
    if (isComponentFiber(current)) return current
    current = current.return
  }
  return null
}

function isComponentFiber(fiber: FiberNode): boolean {
  // tag 0 = FunctionComponent, 1 = ClassComponent,
  // 11 = ForwardRef, 15 = SimpleMemoComponent
  return [0, 1, 11, 15].includes(fiber.tag)
}

function getComponentName(fiber: FiberNode): string | null {
  const type = fiber.type
  if (!type) return null
  if (typeof type === "string") return null
  return type.displayName || type.name || null
}

function extractState(fiber: FiberNode): Record<string, unknown> | null {
  // Class component
  if (fiber.tag === 1 && fiber.stateNode?.state) {
    return safeSerialize(fiber.stateNode.state) as Record<string, unknown>
  }

  // Function component (hooks)
  if ((fiber.tag === 0 || fiber.tag === 11 || fiber.tag === 15) && fiber.memoizedState) {
    const states: unknown[] = []
    let hook = fiber.memoizedState

    while (hook) {
      // useState/useReducer hooks have a queue property
      if (hook.queue !== null && hook.queue !== undefined) {
        states.push(hook.memoizedState)
      }
      hook = hook.next
    }

    if (states.length === 0) return null

    const result: Record<string, unknown> = {}
    states.forEach((s, i) => {
      result[`state_${i}`] = safeSerialize(s)
    })
    return result
  }

  return null
}

function safeSerialize(
  value: unknown,
  depth = 0,
  maxDepth = 3,
  seen = new WeakSet()
): unknown {
  if (depth > maxDepth) return "..."
  if (value === null || value === undefined) return value
  if (typeof value === "function") return "fn"
  if (typeof value === "symbol") return value.toString()
  if (value instanceof HTMLElement)
    return `<${value.tagName.toLowerCase()}>`
  if (typeof value !== "object") return value

  const obj = value as object
  if (seen.has(obj)) return "[Circular]"
  seen.add(obj)

  if (Array.isArray(value)) {
    return value
      .slice(0, 10)
      .map((v) => safeSerialize(v, depth + 1, maxDepth, seen))
  }

  const result: Record<string, unknown> = {}
  const entries = Object.entries(value as Record<string, unknown>)
  for (const [key, val] of entries.slice(0, 20)) {
    if (key.startsWith("_") || key.startsWith("$$")) continue
    result[key] = safeSerialize(val, depth + 1, maxDepth, seen)
  }
  return result
}
