/**
 * Turns an axios rejection into a message that describes what actually went
 * wrong.
 *
 * The reflex `err.response?.data?.message || 'Invalid credentials'` is wrong
 * for every failure that never reached the server: a dead backend, a refused
 * connection and a request that timed out all arrive with `err.response`
 * undefined, so they fall through to the credentials wording. The user then
 * retries a password that was correct all along, and eventually starts
 * deleting localStorage looking for the "corrupt" state that is not there.
 *
 * The distinction is drawn from the error itself, not the caller: `response`
 * present means the server answered and its message is the truth; absent means
 * we never got a reply, and only the transport knows why.
 */
export const getApiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  // Axios reports its own timeout as ECONNABORTED (ETIMEDOUT on some adapters);
  // both mean the request was abandoned client-side with no reply.
  if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') {
    return 'The server took too long to respond. Please check your connection and try again.'
  }

  if (!err?.response) {
    // No response object at all: DNS failure, connection refused, CORS block,
    // offline browser, or a request cancelled before it settled.
    return typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'You appear to be offline. Reconnect and try again.'
      : 'Unable to reach the server right now. Please try again in a moment.'
  }

  const { status, data } = err.response

  // 5xx bodies are usually a stack trace or an empty proxy page; showing them
  // helps nobody, and it is never the user's input that is at fault.
  if (status >= 500) {
    return 'The server is temporarily unavailable. Please try again in a moment.'
  }

  return data?.message || fallback
}

/**
 * Same as {@link getApiErrorMessage}, but for requests made with
 * `responseType: 'blob'`.
 *
 * A binary download that fails still comes back as JSON, and axios hands it
 * over as a Blob because that is what the request asked for. Reading
 * `data.message` off it yields undefined, so every failed download would report
 * the generic fallback instead of the real reason. This unpacks the body first.
 */
export const getBlobApiErrorMessage = async (err, fallback) => {
  const data = err?.response?.data
  if (!(data instanceof Blob)) {
    return getApiErrorMessage(err, fallback)
  }

  try {
    const parsed = JSON.parse(await data.text())
    return getApiErrorMessage({ ...err, response: { ...err.response, data: parsed } }, fallback)
  } catch {
    // Not JSON — an HTML error page or a truncated body. The status still
    // carries enough meaning to pick the right message.
    return getApiErrorMessage({ ...err, response: { ...err.response, data: null } }, fallback)
  }
}

/**
 * True when the request never reached the server, so retrying the same input
 * later is reasonable — as opposed to a 4xx, where the input itself is the
 * problem. Callers use this to decide whether to offer "try again" rather than
 * to phrase the message.
 */
export const isTransientApiError = (err) =>
  err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT' || !err?.response || err.response.status >= 500
