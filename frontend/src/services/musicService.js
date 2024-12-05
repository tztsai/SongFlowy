import { API_ENDPOINTS, createApiClient } from '../config/api'

const apiClient = createApiClient()

export const musicService = {
  async uploadAudio(file) {
    try {
      return await apiClient.upload(API_ENDPOINTS.UPLOAD, file)
    } catch (error) {
      console.error('Error uploading audio:', error)
      throw error
    }
  },

  async processAudio(audioData) {
    try {
      return await apiClient.post(API_ENDPOINTS.PROCESS_AUDIO, audioData)
    } catch (error) {
      console.error('Error processing audio:', error)
      throw error
    }
  },

  async getNotes() {
    try {
      return await apiClient.get(API_ENDPOINTS.GET_NOTES)
    } catch (error) {
      console.error('Error fetching notes:', error)
      throw error
    }
  },

  async saveNotes(notes) {
    try {
      return await apiClient.post(API_ENDPOINTS.SAVE_NOTES, { notes })
    } catch (error) {
      console.error('Error saving notes:', error)
      throw error
    }
  }
}
