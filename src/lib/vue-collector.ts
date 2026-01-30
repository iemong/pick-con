import type { ComponentInfo } from "./types"

export function collectVueComponent(
  element: Element
): ComponentInfo | null {
  // Try Vue 3 first
  const vue3Result = collectVue3(element)
  if (vue3Result) return vue3Result

  // Try Vue 2
  const vue2Result = collectVue2(element)
  if (vue2Result) return vue2Result

  return null
}

function collectVue3(element: Element): ComponentInfo | null {
  const instance = (element as any).__vueParentComponent
  if (!instance) return null

  const hierarchy = getVue3Hierarchy(instance)
  const props = instance.props
    ? safeSerialize(instance.props)
    : undefined
  const data = instance.setupState
    ? safeSerialize(instance.setupState)
    : undefined

  return {
    framework: "vue",
    hierarchy,
    props: props as Record<string, unknown> | undefined,
    state: data as Record<string, unknown> | undefined,
  }
}

function getVue3Hierarchy(instance: any): string[] {
  const components: string[] = []
  let current = instance

  while (current) {
    const name = getVue3ComponentName(current)
    if (name) {
      components.unshift(name)
    }
    current = current.parent
  }

  return components
}

function getVue3ComponentName(instance: any): string | null {
  const type = instance.type
  if (!type) return null
  return type.name || type.__name || null
}

function collectVue2(element: Element): ComponentInfo | null {
  const vm = (element as any).__vue__
  if (!vm) return null

  const hierarchy = getVue2Hierarchy(vm)
  const props = vm.$props
    ? safeSerialize(vm.$props)
    : undefined
  const data = vm.$data
    ? safeSerialize(vm.$data)
    : undefined

  return {
    framework: "vue",
    hierarchy,
    props: props as Record<string, unknown> | undefined,
    state: data as Record<string, unknown> | undefined,
  }
}

function getVue2Hierarchy(vm: any): string[] {
  const components: string[] = []
  let current = vm

  while (current) {
    const name = current.$options?.name || current.$options?._componentTag
    if (name) {
      components.unshift(name)
    }
    current = current.$parent
  }

  return components
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
    if (key.startsWith("_") || key.startsWith("$") || key.startsWith("__")) continue
    result[key] = safeSerialize(val, depth + 1, maxDepth, seen)
  }
  return result
}
