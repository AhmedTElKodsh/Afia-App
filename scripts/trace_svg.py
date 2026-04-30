import cv2
import numpy as np

img_path = r'd:\AI Projects\Freelance\Afia-App\oil-bottle-frames\Adobe Express - file.png'
img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)

print(f"Shape: {img.shape}")

# Create a binary mask of the drawing
if img.shape[2] == 4:
    # Use alpha channel if present
    mask = img[:,:,3]
    _, mask = cv2.threshold(mask, 10, 255, cv2.THRESH_BINARY)
else:
    # Otherwise use grayscale threshold
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

# Find contours
contours, hierarchy = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

print(f"Found {len(contours)} contours")

# We want to convert contours to SVG.
# Since the line might have thickness, findContours will find outer and inner edges of the line.
# Let's save a raw SVG with all large contours to see what it looks like.

h, w = mask.shape

svg_content = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
svg_content += '<g fill="none" stroke="red" stroke-width="2">\n'

for c in contours:
    if cv2.contourArea(c) > 100: # Filter out small noise
        # Smooth the contour
        epsilon = 0.005 * cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, epsilon, True)
        
        path = "M "
        for i, point in enumerate(approx):
            x, y = point[0]
            if i == 0:
                path += f"{x} {y} "
            else:
                path += f"L {x} {y} "
        path += "Z"
        svg_content += f'  <path d="{path}"/>\n'

svg_content += '</g>\n</svg>'

out_path = r'd:\AI Projects\Freelance\Afia-App\oil-bottle-frames\extracted_outline.svg'
with open(out_path, 'w') as f:
    f.write(svg_content)

print(f"Saved SVG to {out_path}")
