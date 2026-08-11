const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

class IntersectionObserverStub {
  constructor(callback, options) {
    this.callback = callback
    this.options = options || {}
    this.root = this.options.root || null
    this.rootMargin = this.options.rootMargin || '0px'
    this.thresholds = [].concat(this.options.threshold || 0)
  }

  observe() {}

  unobserve() {}

  disconnect() {}

  takeRecords() {
    return []
  }
}

if (!global.IntersectionObserver) {
  global.IntersectionObserver = IntersectionObserverStub
}