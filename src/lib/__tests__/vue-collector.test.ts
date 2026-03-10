import { describe, it, expect } from "vitest"
import { collectVueComponent } from "../vue-collector"

describe("collectVueComponent", () => {
  it("should return null when element has no Vue instance", () => {
    const el = document.createElement("div")
    expect(collectVueComponent(el)).toBeNull()
  })

  // Vue 3 tests
  describe("Vue 3", () => {
    it("should collect Vue 3 component info", () => {
      const el = document.createElement("div")
      ;(el as any).__vueParentComponent = {
        type: { name: "Header" },
        props: { title: "My Title" },
        setupState: { count: 0 },
        parent: {
          type: { name: "App" },
          props: null,
          setupState: null,
          parent: null,
        },
      }

      const result = collectVueComponent(el)

      expect(result).not.toBeNull()
      expect(result!.framework).toBe("vue")
      expect(result!.hierarchy).toEqual(["App", "Header"])
      expect(result!.props).toEqual({ title: "My Title" })
      expect(result!.state).toEqual({ count: 0 })
    })

    it("should handle Vue 3 component without props/setupState", () => {
      const el = document.createElement("div")
      ;(el as any).__vueParentComponent = {
        type: { name: "Simple" },
        props: null,
        setupState: null,
        parent: null,
      }

      const result = collectVueComponent(el)

      expect(result).not.toBeNull()
      expect(result!.props).toBeUndefined()
      expect(result!.state).toBeUndefined()
    })

    it("should use __name when name is not available", () => {
      const el = document.createElement("div")
      ;(el as any).__vueParentComponent = {
        type: { __name: "ScriptSetupComp" },
        props: {},
        setupState: {},
        parent: null,
      }

      const result = collectVueComponent(el)

      expect(result).not.toBeNull()
      expect(result!.hierarchy).toEqual(["ScriptSetupComp"])
    })

    it("should skip components without name or __name", () => {
      const el = document.createElement("div")
      ;(el as any).__vueParentComponent = {
        type: {},
        props: {},
        setupState: {},
        parent: {
          type: { name: "App" },
          props: null,
          setupState: null,
          parent: null,
        },
      }

      const result = collectVueComponent(el)

      expect(result).not.toBeNull()
      expect(result!.hierarchy).toEqual(["App"])
    })

    it("should handle Vue 3 component with null type", () => {
      const el = document.createElement("div")
      ;(el as any).__vueParentComponent = {
        type: null,
        props: {},
        setupState: {},
        parent: null,
      }

      const result = collectVueComponent(el)

      expect(result).not.toBeNull()
      expect(result!.hierarchy).toEqual([])
    })
  })

  // Vue 2 tests
  describe("Vue 2", () => {
    it("should collect Vue 2 component info", () => {
      const el = document.createElement("div")
      ;(el as any).__vue__ = {
        $options: { name: "MyComponent" },
        $props: { msg: "hello" },
        $data: { visible: true },
        $parent: {
          $options: { name: "App" },
          $props: null,
          $data: null,
          $parent: null,
        },
      }

      const result = collectVueComponent(el)

      expect(result).not.toBeNull()
      expect(result!.framework).toBe("vue")
      expect(result!.hierarchy).toEqual(["App", "MyComponent"])
      expect(result!.props).toEqual({ msg: "hello" })
      expect(result!.state).toEqual({ visible: true })
    })

    it("should handle Vue 2 component without props/$data", () => {
      const el = document.createElement("div")
      ;(el as any).__vue__ = {
        $options: { name: "Simple" },
        $props: null,
        $data: null,
        $parent: null,
      }

      const result = collectVueComponent(el)

      expect(result).not.toBeNull()
      expect(result!.props).toBeUndefined()
      expect(result!.state).toBeUndefined()
    })

    it("should use _componentTag when name is not available", () => {
      const el = document.createElement("div")
      ;(el as any).__vue__ = {
        $options: { _componentTag: "my-tag" },
        $props: null,
        $data: null,
        $parent: null,
      }

      const result = collectVueComponent(el)

      expect(result).not.toBeNull()
      expect(result!.hierarchy).toEqual(["my-tag"])
    })

    it("should skip Vue 2 components without name", () => {
      const el = document.createElement("div")
      ;(el as any).__vue__ = {
        $options: {},
        $props: null,
        $data: null,
        $parent: {
          $options: { name: "Root" },
          $props: null,
          $data: null,
          $parent: null,
        },
      }

      const result = collectVueComponent(el)

      expect(result).not.toBeNull()
      expect(result!.hierarchy).toEqual(["Root"])
    })
  })

  // Vue 3 takes priority over Vue 2
  it("should prefer Vue 3 when both are present", () => {
    const el = document.createElement("div")
    ;(el as any).__vueParentComponent = {
      type: { name: "Vue3Comp" },
      props: {},
      setupState: {},
      parent: null,
    }
    ;(el as any).__vue__ = {
      $options: { name: "Vue2Comp" },
      $props: {},
      $data: {},
      $parent: null,
    }

    const result = collectVueComponent(el)

    expect(result!.hierarchy).toEqual(["Vue3Comp"])
  })

  // Serialization tests
  describe("safe serialization", () => {
    it("should handle circular references", () => {
      const el = document.createElement("div")
      const data: any = { a: 1 }
      data.self = data
      ;(el as any).__vueParentComponent = {
        type: { name: "Circular" },
        props: data,
        setupState: null,
        parent: null,
      }

      const result = collectVueComponent(el)

      expect(result!.props!.self).toBe("[Circular]")
    })

    it("should handle functions, symbols, HTMLElements", () => {
      const el = document.createElement("div")
      ;(el as any).__vueParentComponent = {
        type: { name: "Mixed" },
        props: {
          fn: () => {},
          sym: Symbol("test"),
          el: document.createElement("span"),
          nil: null,
          undef: undefined,
        },
        setupState: null,
        parent: null,
      }

      const result = collectVueComponent(el)

      expect(result!.props!.fn).toBe("fn")
      expect(result!.props!.sym).toBe("Symbol(test)")
      expect(result!.props!.el).toBe("<span>")
    })

    it("should respect max depth", () => {
      const el = document.createElement("div")
      ;(el as any).__vueParentComponent = {
        type: { name: "Deep" },
        props: {
          l1: { l2: { l3: { l4: "deep" } } },
        },
        setupState: null,
        parent: null,
      }

      const result = collectVueComponent(el)

      expect((result!.props!.l1 as any).l2.l3.l4).toBe("...")
    })

    it("should skip keys starting with _, $, or __", () => {
      const el = document.createElement("div")
      ;(el as any).__vueParentComponent = {
        type: { name: "Filtered" },
        props: {
          visible: true,
          _internal: "hidden",
          $ref: "ref",
          __proto_field: "proto",
          name: "test",
        },
        setupState: null,
        parent: null,
      }

      const result = collectVueComponent(el)

      expect(result!.props!.visible).toBe(true)
      expect(result!.props!.name).toBe("test")
      expect(result!.props!._internal).toBeUndefined()
      expect(result!.props!.$ref).toBeUndefined()
      expect(result!.props!.__proto_field).toBeUndefined()
    })

    it("should limit arrays to 10 items", () => {
      const el = document.createElement("div")
      ;(el as any).__vueParentComponent = {
        type: { name: "LargeArray" },
        props: {
          items: Array.from({ length: 15 }, (_, i) => i),
        },
        setupState: null,
        parent: null,
      }

      const result = collectVueComponent(el)

      expect((result!.props!.items as unknown[]).length).toBe(10)
    })

    it("should limit object entries to 20", () => {
      const el = document.createElement("div")
      const manyProps: Record<string, number> = {}
      for (let i = 0; i < 25; i++) {
        manyProps[`prop${i}`] = i
      }
      ;(el as any).__vueParentComponent = {
        type: { name: "ManyProps" },
        props: manyProps,
        setupState: null,
        parent: null,
      }

      const result = collectVueComponent(el)

      expect(Object.keys(result!.props!).length).toBe(20)
    })

    it("should handle empty objects and arrays", () => {
      const el = document.createElement("div")
      ;(el as any).__vueParentComponent = {
        type: { name: "Empty" },
        props: { obj: {}, arr: [] },
        setupState: null,
        parent: null,
      }

      const result = collectVueComponent(el)

      expect(result!.props!.obj).toEqual({})
      expect(result!.props!.arr).toEqual([])
    })
  })
})
