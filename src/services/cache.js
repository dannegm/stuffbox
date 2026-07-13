const STORAGE_KEY = 'stuffbox:cache'

const getAll = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

const get = (key, defaultValue = null) => {
  const value = getAll()[key]
  return value !== undefined ? value : defaultValue
}

const set = (key, value) => {
  try {
    const all = getAll()
    if (value === null || value === undefined) {
      delete all[key]
    } else {
      all[key] = value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {}
}

const remove = (key) => set(key, null)

const clear = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export const cache = { get, set, remove, clear }
