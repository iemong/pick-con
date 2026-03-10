import { describe, it, expect, vi } from "vitest"

const { mockUseContext } = vi.hoisted(() => ({
  mockUseContext: vi.fn(),
}))
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react")
  return { ...actual, useContext: mockUseContext }
})

import { darkTheme, lightTheme, ThemeContext, useTheme } from "../theme"
import type { ThemeMode, ThemeContextValue } from "../theme"

describe("theme", () => {
  it("should export darkTheme with expected properties", () => {
    expect(darkTheme.bg).toBe("#0b0e14")
    expect(darkTheme.accent).toBe("#2563eb")
    expect(darkTheme.textPrimary).toBe("#d4dae5")
    expect(darkTheme.fontFamily).toContain("SF Pro Text")
  })

  it("should export lightTheme with expected properties", () => {
    expect(lightTheme.bg).toBe("#f0f3f8")
    expect(lightTheme.accent).toBe("#1d4ed8")
    expect(lightTheme.textPrimary).toBe("#1a2030")
    expect(lightTheme.fontFamily).toContain("SF Pro Text")
  })

  it("should have ThemeContext with dark defaults", () => {
    const defaultValue = (ThemeContext as any)._currentValue
    expect(defaultValue.theme).toBe(darkTheme)
    expect(defaultValue.mode).toBe("dark")
    expect(typeof defaultValue.toggleMode).toBe("function")
    defaultValue.toggleMode()
  })

  it("useTheme should call useContext with ThemeContext", () => {
    const mockValue: ThemeContextValue = {
      theme: lightTheme,
      mode: "light",
      toggleMode: () => {},
    }
    mockUseContext.mockReturnValue(mockValue)
    const result = useTheme()
    expect(mockUseContext).toHaveBeenCalledWith(ThemeContext)
    expect(result).toBe(mockValue)
  })

  it("should export type-compatible ThemeMode and ThemeContextValue", () => {
    const mode: ThemeMode = "dark"
    expect(mode).toBe("dark")

    const ctx: ThemeContextValue = {
      theme: darkTheme,
      mode: "light",
      toggleMode: () => {},
    }
    expect(ctx.mode).toBe("light")
  })
})
