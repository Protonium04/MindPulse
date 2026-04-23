import { create } from 'zustand'
import { chatAPI } from '../utils/api'

const useChatStore = create((set, get) => ({
  messages: [],
  loading: false,
  currentEmotion: null,
  currentDistress: 0,

  loadHistory: async () => {
    try {
      const res = await chatAPI.getHistory(60)
      set({ messages: res.data })
    } catch (_) {}
  },

  sendMessage: async (text, includeSpotify, includeYoutube) => {
    // Optimistically add user message
    const optimistic = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    set((s) => ({ messages: [...s.messages, optimistic], loading: true }))

    try {
      const res = await chatAPI.sendMessage(text, includeSpotify, includeYoutube)
      const data = res.data

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        created_at: new Date().toISOString(),
        detected_emotion: data.detected_emotion,
        distress_score: data.distress_score,
        coping_steps: data.coping_steps,
        doctor_referral: data.doctor_referral,
      }

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        loading: false,
        currentEmotion: data.detected_emotion,
        currentDistress: data.distress_score,
      }))

      return data
    } catch (err) {
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== optimistic.id),
        loading: false,
      }))
      throw err
    }
  },

  clearMessages: () => set({ messages: [] }),
}))

export default useChatStore
