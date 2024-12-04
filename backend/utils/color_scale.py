import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import plotly.express as px
import colour

def rgb_to_wavelength(R, G, B):
    # Step 1: Normalize and Linearize RGB
    def linearize(c):
        c = c / 255.0
        if c <= 0.04045:
            return c / 12.92
        else:
            return ((c + 0.055) / 1.055) ** 2.4

    R_lin = linearize(R)
    G_lin = linearize(G)
    B_lin = linearize(B)

    # Step 2: Convert Linear RGB to XYZ
    rgb_linear = np.array([R_lin, G_lin, B_lin])
    XYZ = colour.sRGB_to_XYZ(rgb_linear)

    # Step 3: Calculate Chromaticity Coordinates (x, y)
    x, y = colour.XYZ_to_xy(XYZ)

    # Step 4: Get Spectral Locus Data
    cmfs = colour.MSDS_CMFS['CIE 1931 2 Degree Standard Observer']
    wavelengths = cmfs.wavelengths
    spectral_xy = colour.MSDS_to_XYZ(cmfs)
    spectral_xy = colour.XYZ_to_xy(spectral_xy)

    # Step 5: Find the Closest Point on the Spectral Locus
    spectral_x = spectral_xy[:, 0]
    spectral_y = spectral_xy[:, 1]
    distances = np.sqrt((spectral_x - x) ** 2 + (spectral_y - y) ** 2)
    min_index = np.argmin(distances)
    closest_wavelength = wavelengths[min_index]

    return closest_wavelength

def wavelength_to_rgb(wavelength_nm):
    """Convert monochromatic light of a given wavelength to RGB."""

    cmfs = colour.MSDS_CMFS["CIE 1931 2 Degree Standard Observer"]
    xyz = colour.wavelength_to_XYZ(wavelength_nm, cmfs)
    rgb = colour.XYZ_to_sRGB(xyz)
    
    return (np.clip(rgb, 0, 1) * 255).astype(int)

def get_note_colors():
    """Get colors for each note in the chromatic scale."""
    notes = ['D', 'd', 'C', 'B', 'b', 'A', 'a', 'G', 'g', 'F', 'E', 'e']

    # Custom color palette designed for musical notes
    # Using a combination of warm and cool colors with good contrast
    hex_colors = [
        '#FF0000',  # Bright Red
        '#FF8000',  # Orange
        '#FFD700',  # Gold
        '#00FF00',  # Bright Green
        '#00FFAA',  # Spring Green
        '#00FFFF',  # Cyan
        '#0080FF',  # Sky Blue
        '#0000FF',  # Blue
        '#8000FF',  # Purple
        '#FF00FF',  # Magenta
        '#FF0080',  # Pink
        '#FF4040',  # Light Red
    ]
    
    colors = []
    for color in hex_colors:
        # Convert hex to RGB
        color = color.lstrip('#')
        r = int(color[0:2], 16)
        g = int(color[2:4], 16)
        b = int(color[4:6], 16)
        colors.append((r, g, b))

    # colors = wavelength_to_rgb(np.logspace(np.log10(440), np.log10(622), 12))

    return list(zip(notes, colors))

def visualize_color_wheel(colors):
    """Create a visualization of the musical color wheel."""

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
    plt.title('Musical Color Wheel', pad=20, fontsize=16, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('color_wheel.png', dpi=300, bbox_inches='tight')
    plt.show()

if __name__ == "__main__":
    colors = get_note_colors()
    
    print({
        note: f'#{r:02X}{g:02X}{b:02X}'
        for note, (r, g, b) in colors
    })

    visualize_color_wheel(colors)
