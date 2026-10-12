/**
 * App-shell platform detection + external-link bridge.
 *
 * The MintyFit app shells (Android WebView, iOS WKWebView) inject
 * `window.__MINTY_PLATFORM__` ('android' | 'ios') before page content loads
 * and append `MintyFitApp-<platform>` to the User-Agent. Client code uses
 * these helpers for shell-specific behavior — currently: App Store
 * Guideline 3.1.1 compliance (no in-app Stripe checkout on iOS).
 *
 * `openExternal()` asks the shell to open a URL in the system browser via
 * the react-native-webview postMessage bridge (both shells handle the
 * 'openExternal' message). Falls back to window.open in a plain browser.
 */

export function getShellPlatform() {
  if (typeof window === 'undefined') return null
  if (window.__MINTY_PLATFORM__) return window.__MINTY_PLATFORM__
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  if (ua.includes('MintyFitApp-iOS')) return 'ios'
  if (ua.includes('MintyFitApp-Android')) return 'android'
  return null
}

export function isIOSShell() {
  return getShellPlatform() === 'ios'
}

export function openExternal(url) {
  if (typeof window !== 'undefined' && window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openExternal', url }))
    return
  }
  window.open(url, '_blank', 'noopener')
}
