// API configuration
const API_BASE_URL = 'http://localhost:5000'

export const apiClient = {
  async post(endpoint, data, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const response = await fetch(url, {
      method: 'POST',
      ...options,
      body: data
    })
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }
    
    return response.json()
  },

  async get(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const response = await fetch(url, {
      method: 'GET',
      ...options
    })
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }
    
    return response.json()
  }
}
