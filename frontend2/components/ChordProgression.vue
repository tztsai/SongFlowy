<template>
    <div class="chord-progression">
      <div v-for="(chord, index) in chords" :key="index" class="chord">
        {{ chord }}
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        chords: ["I", "vi", "IV", "V"]
      };
    }
  };
  </script>
  
  <style scoped>
  .chord-progression {
    width: 10%;
    background-color: #ececec;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    border-right: 1px solid #ccc;
    height: 100%;
  }
  .chord {
    text-align: center;
    font-size: 18px;
    padding: 20px 0;
    border-bottom: 1px solid black;
  }
  </style>
  