import { defaultSettings } from '@/constants/default-settings'
import { getByPath, setByPath } from '@/helpers/objects'

const STORAGE_KEY = 'stuffbox:settings'
const CHANNEL = 'settings'
const listeners = []

const getAll = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : { ...defaultSettings }
  } catch {
    return { ...defaultSettings }
  }
}

const setAll = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    const bc = new BroadcastChannel(CHANNEL)
    bc.postMessage(value)
    bc.close()
    listeners.forEach((cb) => cb(value))
  } catch {}
}

const get = (path, defaultValue) => {
  if (!path) return getAll()
  const value = getByPath(getAll(), path)
  return value !== undefined ? value : defaultValue
}

const set = (path, value) => {
  const updated = setByPath(getAll(), path, value)
  setAll(updated)
}

const subscribe = (callback) => {
  listeners.push(callback)
  const bc = new BroadcastChannel(CHANNEL)

  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) {
      try {
        const next = event.newValue
          ? { ...defaultSettings, ...JSON.parse(event.newValue) }
          : { ...defaultSettings }
        callback(next)
      } catch {}
    }
  }

  const onBroadcast = (event) => {
    callback(event.data)
  }

  window.addEventListener('storage', onStorage)
  bc.addEventListener('message', onBroadcast)

  return () => {
    listeners.splice(listeners.indexOf(callback), 1)
    window.removeEventListener('storage', onStorage)
    bc.removeEventListener('message', onBroadcast)
    bc.close()
  }
}

const registerDevTools = () => {
  window.settings = { get, set, getAll, setAll }
}

export const settings = { get, set, getAll, setAll, subscribe, registerDevTools }
