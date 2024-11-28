<template>
    <div id="app" class="container">
      <TopPanel />
      <div class="editor">
        <ChordProgression />
        <MainTrackEditor />
        <LyricsEditor />
      </div>
      <ScaleNotes />
    </div>
  </template>
  
  <script>
  import TopPanel from "./components/TopPanel.vue";
  import ChordProgression from "./components/ChordProgression.vue";
  import MainTrackEditor from "./components/MainTrackEditor.vue";
  import LyricsEditor from "./components/LyricsEditor.vue";
  import ScaleNotes from "./components/ScaleNotes.vue";
  
  export default {
    components: {
      TopPanel,
      ChordProgression,
      MainTrackEditor,
      LyricsEditor,
      ScaleNotes
    }
  };
  </script>
  
  <style>
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .editor {
    display: flex;
    flex: 1;
  }
  </style>
  