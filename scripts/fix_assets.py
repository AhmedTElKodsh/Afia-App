import cv2
import numpy as np

img_path = r'd:\AI Projects\Freelance\Afia-App\oil-bottle-frames\Adobe Express - file.png'
img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
mask = img[:,:,3]
_, mask = cv2.threshold(mask, 10, 255, cv2.THRESH_BINARY)
contours_all, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

h, w = mask.shape

def get_path_data(c):
    epsilon = 0.001 * cv2.arcLength(c, True)
    approx = cv2.approxPolyDP(c, epsilon, True)
    pts = []
    for p in approx:
        pts.append(f'{p[0][0]} {p[0][1]}')
    return 'M ' + ' L '.join(pts) + ' Z'

svg_content = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
svg_content += '  <g fill="none" stroke="red" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">\n'

if hierarchy is not None:
    for i, h_info in enumerate(hierarchy[0]):
        # We want the main external contour and its immediate children (holes)
        if h_info[3] == -1: # No parent (External)
            svg_content += f'    <path d="{get_path_data(contours_all[i])}"/>\n'
        elif h_info[3] != -1: # Has parent (Hole)
            # Only include large holes (like the handle)
            if cv2.contourArea(contours_all[i]) > 1000:
                svg_content += f'    <path d="{get_path_data(contours_all[i])}"/>\n'

svg_content += '  </g>\n</svg>'

with open(r'd:\AI Projects\Freelance\Afia-App\oil-bottle-frames\Adobe Express - file.svg', 'w') as f:
    f.write(svg_content)

# Also update the "clean" version used by the app logic if any
with open(r'd:\AI Projects\Freelance\Afia-App\oil-bottle-frames\afia-bottle-clean.svg', 'w') as f:
    f.write(svg_content)

print("Vector SVGs generated successfully.")
