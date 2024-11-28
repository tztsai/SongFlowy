import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { createStore } from 'vuex'
import './assets/main.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const store = createStore({
  state() {
    return {
      currentScale: ['G', 'F', 'E', 'D', 'C', 'B', 'A'],
      bpm: 80,
      isPlaying: false,
      currentChord: 'Am'
    }
  },
  mutations: {
    setScale(state, scale) {
      state.currentScale = scale
    },
    setBpm(state, bpm) {
      state.bpm = bpm
    },
    setIsPlaying(state, isPlaying) {
      state.isPlaying = isPlaying
    },
    setCurrentChord(state, chord) {
      state.currentChord = chord
    }
  }
})

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark'
  }
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(store)
app.use(vuetify)
app.mount('#app')
