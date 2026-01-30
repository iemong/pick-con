import type { PlasmoCSConfig } from "plasmo"

import { detectFramework } from "~lib/framework-detector"
import { collectReactComponent } from "~lib/react-collector"
import type { CollectRequest, CollectResult } from "~lib/types"
import { collectVueComponent } from "~lib/vue-collector"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",
}

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return
  if (event.data?.type !== "PICK_CON_COLLECT") return

  const request = event.data as CollectRequest
  const element = document.querySelector(request.selector)

  const framework = detectFramework()
  let component = null

  if (element) {
    if (framework?.framework === "React") {
      component = collectReactComponent(element)
    } else if (framework?.framework === "Vue") {
      component = collectVueComponent(element)
    }
  }

  const result: CollectResult = {
    type: "PICK_CON_RESULT",
    framework,
    component,
  }

  window.postMessage(result, "*")
})
