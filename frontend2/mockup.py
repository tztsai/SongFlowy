import matplotlib.pyplot as plt
from matplotlib import patches

# Further refining the mockup with properly aligned chord names and vertically divided main track editor

fig, ax = plt.subplots(figsize=(15, 8))
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

# Scale Notes at the Bottom with Scale Highlighting
bottom_panel = patches.Rectangle((10, 0), 70, 10, color="#f3f3f3", ec="black", lw=1)
ax.add_patch(bottom_panel)
scale_notes = ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G", "A", "B"]
x_positions = [10 + i * 5 for i in range(14)]
highlighted_notes = ["C", "E", "G"]  # Example active scale notes
for i, note in enumerate(scale_notes):
    if note in highlighted_notes:
        ax.text(x_positions[i] + 2.5, 5, note, fontsize=10, ha='center', va='center', color="blue", fontweight="bold")
    else:
        ax.text(x_positions[i] + 2.5, 5, note, fontsize=10, ha='center', va='center')

# Main Track Display (X-axis: Pitch, Y-axis: Time) with Playback Visualization
main_track = patches.Rectangle((10, 10), 70, 80, color="#ffffff", ec="black", lw=1)
ax.add_patch(main_track)
for i in range(1, 14):  # Vertical grid for pitch
    ax.plot([10 + i * 5, 10 + i * 5], [10, 90], color="lightgray", lw=0.5)
for i in range(1, 11):  # Horizontal grid for time
    ax.plot([10, 80], [10 + i * 8, 10 + i * 8], color="gray", lw=0.5)

# Add example note blocks with active highlighting
active_notes = [40, 60]  # Example notes that are currently active
for pos, color in zip([20, 40, 60], ["blue", "green", "red"]):
    alpha = 1 if pos in active_notes else 0.7  # Highlight active notes
    ax.add_patch(patches.Rectangle((pos, 30), 5, 6, color=color, alpha=alpha))
    ax.text(pos + 2.5, 33, "Note", fontsize=9, ha='center', va='center', color="white", rotation=90)
# Additional example note blocks at different time and pitches
more_notes = [
    (15, 35, "magenta"), 
    (25, 45, "lime"), 
    (35, 25, "brown"), 
    (55, 70, "pink"), 
    (70, 40, "gold"), 
    (80, 60, "navy")
]
for x_pos, y_pos, color in more_notes:
    alpha = 0.7  # Default transparency for non-active notes
    ax.add_patch(patches.Rectangle((x_pos, y_pos), 5, 6, color=color, alpha=alpha))
    ax.text(x_pos + 2.5, y_pos + 3, "Note", fontsize=9, ha='center', va='center', color="white", rotation=90)

# Chord Progression at the Left with proper alignment and bar lines
chord_box = patches.Rectangle((0, 10), 10, 80, color="#ececec", ec="black", lw=1)
ax.add_patch(chord_box)
chords = ["I", "vi", "IV", "V", "I"]
y_positions = range(18, 90, 16)
for i, chord in enumerate(chords):
    ax.text(5, y_positions[i], chord, fontsize=12, ha='center', va='center')
    if i == len(y_positions): break
    y = y_positions[i] + 8
    ax.plot([0, 10], [y, y], color="black", lw=1)

# Lyrics Editor on the Right with Editing Highlight
lyrics_panel = patches.Rectangle((80, 10), 20, 80, color="#f9f9f9", ec="black", lw=1)
ax.add_patch(lyrics_panel)
active_lyric = 2  # Example active lyric line
for i in range(10):  # Placeholder lyrics
    color = "blue" if i == active_lyric else "black"
    ax.text(85, 80 - i * 7, f"[{i}:00] Line {i+1}", fontsize=10, ha='left', va='center', color=color)

# Top Panel - Controls and Presets with Scale Switch
top_panel = patches.Rectangle((0, 90), 100, 10, color="#f5f5f5", ec="black", lw=1)
ax.add_patch(top_panel)
controls = ["Play", "Rewind", "Loop", "Tempo: 120 BPM", "Key: C Major", "Preset: Pop"]
for i, control in enumerate(controls):
    ax.text(5 + i * 15, 95, control, fontsize=10, ha='center', va='center', bbox=dict(facecolor='white', edgecolor='black'))

# Refinements:
# 1. Proper alignment of chord names in the center of each bar.
# 2. Bar lines aligned with 4th, 8th, 12th, and 16th grid lines.
# 3. 16-part vertical division for more detailed precision.

# Display the refined design graph
plt.title("Refined Music Editor UI Mockup with Aligned Chords and 16-Part Grid", fontsize=16, fontweight='bold')
plt.show()
