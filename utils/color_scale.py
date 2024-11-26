import numpy as np
from typing import List, Tuple
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from colormath.color_objects import LabColor, sRGBColor
from colormath.color_conversions import convert_color

def lab_to_rgb(l: float, a: float, b: float) -> Tuple[int, int, int]:
    """Convert Lab color to RGB color using colormath library."""
    # Create Lab color object
    lab = LabColor(l, a, b)
    
    # Convert to sRGB
    rgb = convert_color(lab, sRGBColor)
    
    # Get RGB values and clip them
    r = max(0, min(255, round(rgb.clamped_rgb_r * 255)))
    g = max(0, min(255, round(rgb.clamped_rgb_g * 255)))
    b = max(0, min(255, round(rgb.clamped_rgb_b * 255)))
    
    return r, g, b

def get_note_colors() -> List[Tuple[str, Tuple[int, int, int]]]:
    """Get RGB colors for 12 notes starting from F4 (based on Chinese Ming Yellow)."""
    # Base Lab values for Ming Yellow
    l_value = 83.32
    base_a = 6.02
    base_b = 74.77
    
    # Radius in the a*b* plane
    radius = np.sqrt(base_a**2 + base_b**2)
    
    # Starting angle (for Ming Yellow)
    start_angle = np.arctan2(base_b, base_a)
    
    # Notes starting from F4
    notes = ['F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E']
    
    colors = []
    for i, note in enumerate(notes):
        # Calculate angle for each note (counterclockwise from start)
        angle = start_angle - (i * 2 * np.pi / 12)
        
        # Calculate a* and b* values
        a = radius * np.cos(angle)
        b = radius * np.sin(angle)
        
        # Convert to RGB
        rgb = lab_to_rgb(l_value, a, b)
        
        colors.append((note, rgb))
    
    return colors

def visualize_color_wheel():
    """Create a visualization of the musical color wheel."""
    # Get colors
    colors = get_note_colors()
    
    # Create figure and axis
    fig, ax = plt.subplots(figsize=(10, 10))
    ax.set_aspect('equal')
    
    # Set background color
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')
    
    # Create color segments
    radius = 1
    center = (0, 0)
    for i, (note, (r, g, b)) in enumerate(colors):
        # Calculate angles for the segment
        start_angle = i * 360 / 12
        end_angle = (i + 1) * 360 / 12
        
        # Create wedge
        wedge = patches.Wedge(center, radius, start_angle, end_angle, 
                            fc=np.array([r, g, b])/255, 
                            ec='white', lw=2)
        ax.add_patch(wedge)
        
        # Add note label
        angle = np.radians((start_angle + end_angle) / 2)
        x = 0.7 * np.cos(angle)
        y = 0.7 * np.sin(angle)
        ax.text(x, y, note, ha='center', va='center', fontsize=12, 
               fontweight='bold', color='black')
    
    # Set limits and remove axes
    ax.set_xlim(-1, 1)
    ax.set_ylim(-1, 1)
    ax.axis('off')
    
    # Add title
    plt.title('Musical Color Wheel\nStarting from F (Ming Yellow)', 
             pad=20, fontsize=16, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('color_wheel.png', dpi=300, bbox_inches='tight')
    plt.show()

if __name__ == "__main__":
    # Print RGB values
    colors = get_note_colors()
    for note, (r, g, b) in colors:
        print(f"Note {note}: RGB({r}, {g}, {b})")
    
    # Show color wheel
    visualize_color_wheel()