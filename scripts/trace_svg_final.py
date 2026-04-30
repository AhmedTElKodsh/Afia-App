import cv2
import numpy as np

img_path = r'd:\AI Projects\Freelance\Afia-App\oil-bottle-frames\Adobe Express - file.png'
img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)

# Create a binary mask
if img.shape[2] == 4:
    mask = img[:,:,3]
    _, mask = cv2.threshold(mask, 10, 255, cv2.THRESH_BINARY)
else:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

# Find contours
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

# Find the largest contour (the bottle outline)
main_contour = max(contours, key=cv2.contourArea)

# Find the holes (the handle hole)
contours_all, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

h, w = mask.shape

def contour_to_svg_path(c, epsilon_factor=0.002):
    epsilon = epsilon_factor * cv2.arcLength(c, True)
    approx = cv2.approxPolyDP(c, epsilon, True)
    path = "M "
    for i, point in enumerate(approx):
        x, y = point[0]
        if i == 0:
            path += f"{x},{y} "
        else:
            path += f"L {x},{y} "
    path += "Z"
    return path

# Extract external bottle
bottle_path = contour_to_svg_path(main_contour)

# Extract handle hole (the largest internal contour)
handle_path = ""
max_hole_area = 0
if hierarchy is not None:
    for i, h_info in enumerate(hierarchy[0]):
        if h_info[3] != -1: # has parent, so it's a hole
            area = cv2.contourArea(contours_all[i])
            if area > max_hole_area:
                max_hole_area = area
                handle_path = contour_to_svg_path(contours_all[i])

# Cap extraction: find the top-most part of the bottle
# In this specific image, the cap is integrated into the outline.
# However, the user's previous SVG had a separate cap.
# Looking at Adobe Express - file.png, the cap IS part of the red line.

# Normalize coordinates to 0-1 and then to a standard size or keep as is?
# The original SVG was 210x475.
# This image is 1376x3070. Ratio: 1376/210 = 6.55, 3070/475 = 6.46. Pretty close!

target_w = 210
target_h = 475

def scale_path(c, sw, sh):
    epsilon = 0.002 * cv2.arcLength(c, True)
    approx = cv2.approxPolyDP(c, epsilon, True)
    path = "M "
    for i, point in enumerate(approx):
        x = round(point[0][0] * sw, 1)
        y = round(point[0][1] * sh, 1)
        if i == 0:
            path += f"{x},{y} "
        else:
            path += f"L {x},{y} "
    path += "Z"
    return path

sw = target_w / w
sh = target_h / h

scaled_bottle = scale_path(main_contour, sw, sh)
scaled_handle = ""
if handle_path:
    # find that handle contour again in the all_contours
    for i, h_info in enumerate(hierarchy[0]):
        if h_info[3] != -1 and cv2.contourArea(contours_all[i]) == max_hole_area:
            scaled_handle = scale_path(contours_all[i], sw, sh)

svg_final = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {target_w} {target_h}" width="{target_w}" height="{target_h}">
  <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
    <path d="{scaled_bottle}"/>
    <path d="{scaled_handle}"/>
  </g>
</svg>'''

with open(r'd:\AI Projects\Freelance\Afia-App\oil-bottle-frames\afia-bottle-new.svg', 'w') as f:
    f.write(svg_final)

print("Saved new SVG to d:\\AI Projects\\Freelance\\Afia-App\\oil-bottle-frames\\afia-bottle-new.svg")
