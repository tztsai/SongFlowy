const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const API_ENDPOINTS = {
  // Audio processing endpoints
  UPLOAD: `${API_BASE_URL}/upload`,
  PROCESS_AUDIO: `${API_BASE_URL}/process_audio`,
  
  // Music data endpoints
  GET_NOTES: `${API_BASE_URL}/notes`,
  SAVE_NOTES: `${API_BASE_URL}/notes/save`,
  
  // Other endpoints...
}

// API client with default configuration
export const createApiClient = () => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // For handling cookies if needed
  }

  return {
    async get(endpoint) {
      const response = await fetch(endpoint, {
        ...defaultOptions,
        method: 'GET',
      })
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
      return response.json()
    },

    async post(endpoint, data) {
      const response = await fetch(endpoint, {
        ...defaultOptions,
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
      return response.json()
    },

    async upload(endpoint, file) {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header for multipart/form-data
        credentials: 'include',
      })
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
      return response.json()
    }
  }
}
