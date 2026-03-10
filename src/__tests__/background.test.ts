import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSendMessage = vi.fn()
const mockCaptureVisibleTab = vi.fn()
const onClickedListeners: Function[] = []
const onMessageListeners: Function[] = []

vi.stubGlobal("chrome", {
  action: {
    onClicked: {
      addListener: (fn: Function) => onClickedListeners.push(fn),
    },
  },
  tabs: {
    sendMessage: mockSendMessage,
    captureVisibleTab: mockCaptureVisibleTab,
  },
  runtime: {
    onMessage: {
      addListener: (fn: Function) => onMessageListeners.push(fn),
    },
  },
})

describe("background", () => {
  beforeEach(async () => {
    vi.resetModules()
    mockSendMessage.mockReset()
    mockCaptureVisibleTab.mockReset()
    onClickedListeners.length = 0
    onMessageListeners.length = 0
    // @ts-expect-error background.ts is a side-effect-only script, not a module
    await import("../background")
  })

  it("should register action.onClicked listener", () => {
    expect(onClickedListeners).toHaveLength(1)
  })

  it("should send TEGAKARI_TOGGLE message on click with valid tab id", async () => {
    const listener = onClickedListeners[0]
    await listener({ id: 42 })
    expect(mockSendMessage).toHaveBeenCalledWith(42, { type: "TEGAKARI_TOGGLE" })
  })

  it("should not send message when tab has no id", async () => {
    const listener = onClickedListeners[0]
    await listener({})
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it("should register runtime.onMessage listener", () => {
    expect(onMessageListeners).toHaveLength(1)
  })

  it("should capture visible tab on TEGAKARI_CAPTURE", () => {
    const listener = onMessageListeners[0]
    const sendResponse = vi.fn()
    mockCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc")

    const result = listener({ type: "TEGAKARI_CAPTURE" }, {}, sendResponse)

    expect(result).toBe(true)
    expect(mockCaptureVisibleTab).toHaveBeenCalledWith({ format: "png" })
  })

  it("should call sendResponse with success on capture", async () => {
    const listener = onMessageListeners[0]
    const sendResponse = vi.fn()
    mockCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc")

    listener({ type: "TEGAKARI_CAPTURE" }, {}, sendResponse)

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        dataUrl: "data:image/png;base64,abc",
      })
    })
  })

  it("should call sendResponse with error on capture failure", async () => {
    const listener = onMessageListeners[0]
    const sendResponse = vi.fn()
    mockCaptureVisibleTab.mockRejectedValue(new Error("Capture failed"))

    listener({ type: "TEGAKARI_CAPTURE" }, {}, sendResponse)

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: "Error: Capture failed",
      })
    })
  })

  it("should not handle non-TEGAKARI_CAPTURE messages", () => {
    const listener = onMessageListeners[0]
    const sendResponse = vi.fn()

    const result = listener({ type: "OTHER_MESSAGE" }, {}, sendResponse)

    expect(result).toBeUndefined()
    expect(mockCaptureVisibleTab).not.toHaveBeenCalled()
  })

  it("should not handle null messages", () => {
    const listener = onMessageListeners[0]
    const sendResponse = vi.fn()

    const result = listener(null, {}, sendResponse)

    expect(result).toBeUndefined()
    expect(mockCaptureVisibleTab).not.toHaveBeenCalled()
  })
})
