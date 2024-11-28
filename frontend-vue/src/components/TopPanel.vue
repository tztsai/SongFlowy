<template>
  <v-card>
    <v-card-title>Controls</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <v-slider
            v-model="bpm"
            :min="60"
            :max="180"
            label="BPM"
            @update:modelValue="updateBpm"
          ></v-slider>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12" class="d-flex justify-center">
          <v-btn
            :color="isPlaying ? 'error' : 'success'"
            @click="togglePlay"
          >
            {{ isPlaying ? 'Stop' : 'Play' }}
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const bpm = computed({
  get: () => store.state.bpm,
  set: (value) => store.commit('setBpm', value)
})
const isPlaying = computed({
  get: () => store.state.isPlaying,
  set: (value) => store.commit('setIsPlaying', value)
})

const updateBpm = (value) => {
  store.commit('setBpm', value)
}

const togglePlay = () => {
  store.commit('setIsPlaying', !isPlaying.value)
}
</script>
