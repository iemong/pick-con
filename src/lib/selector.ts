export function generateSelector(element: Element): string {
  const parts: string[] = []
  let current: Element | null = element

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`)
      break
    }

    const parent = current.parentElement
    if (!parent) {
      parts.unshift(current.tagName.toLowerCase())
      break
    }

    const tag = current.tagName.toLowerCase()
    const siblings = Array.from(parent.children)

    // Try class-based selector first
    if (current.className && typeof current.className === "string") {
      const classes = current.className.trim().split(/\s+/).filter(Boolean)
      if (classes.length > 0) {
        const classSelector =
          tag + "." + classes.map((c) => CSS.escape(c)).join(".")
        const matchingSiblings = siblings.filter((s) => {
          try {
            return s.matches(classSelector)
          } catch {
            return false
          }
        })
        if (matchingSiblings.length === 1) {
          parts.unshift(classSelector)
          current = parent
          continue
        }
      }
    }

    // Fall back to nth-child
    const sameTagSiblings = siblings.filter(
      (s) => s.tagName === current!.tagName
    )
    if (sameTagSiblings.length > 1) {
      const index = siblings.indexOf(current) + 1
      parts.unshift(`${tag}:nth-child(${index})`)
    } else {
      parts.unshift(tag)
    }

    current = parent
  }

  return parts.join(" > ")
}
