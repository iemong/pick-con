import { describe, it, expect } from "vitest"
import { getSchema, SCHEMAS } from "../schema.js"

describe("getSchema", () => {
  it("returns specific command schema", () => {
    const result = JSON.parse(getSchema("run"))
    expect(result.name).toBe("run")
    expect(result.input.type).toBe("json")
    expect(result.input.schema).toBeDefined()
    expect(result.output.formats).toContain("json")
    expect(result.examples.length).toBeGreaterThan(0)
  })

  it("returns all schemas when no command specified", () => {
    const result = JSON.parse(getSchema())
    expect(result.run).toBeDefined()
    expect(result.describe).toBeDefined()
  })

  it("returns all schemas for unknown command", () => {
    const result = JSON.parse(getSchema("nonexistent"))
    expect(result.run).toBeDefined()
  })

  it("run schema has required properties", () => {
    const schema = SCHEMAS.run.input.schema as Record<string, unknown>
    expect(schema.required).toContain("name")
    expect(schema.required).toContain("url")
    expect(schema.required).toContain("steps")
  })

  it("run schema documents all actions", () => {
    const schema = SCHEMAS.run.input.schema as any
    const actionEnum = schema.properties.steps.items.properties.action.enum
    expect(actionEnum).toContain("navigate")
    expect(actionEnum).toContain("click")
    expect(actionEnum).toContain("fill")
    expect(actionEnum).toContain("assert")
    expect(actionEnum).toContain("capture")
  })
})
