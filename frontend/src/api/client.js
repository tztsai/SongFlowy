// API configuration
const API_BASE_URL = 'http://localhost:5000'

export const apiClient = {
  async post(endpoint, data, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const isFormData = data instanceof FormData
    
    const fetchOptions = {
      method: 'POST',
      headers: isFormData ? {} : {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: isFormData ? data : JSON.stringify(data)
    }

    const response = await fetch(url, fetchOptions)
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }
    
    return response.json()
  },

  async get(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const fetchOptions = {
      headers: {
        'Accept': 'application/json',
      },
      ...options,
      method: 'GET'
    }
    
    const response = await fetch(url, fetchOptions)
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }
    
    return response
  }
}
