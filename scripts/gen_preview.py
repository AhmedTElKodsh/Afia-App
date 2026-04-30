import cv2
import numpy as np

img_path = r'd:\AI Projects\Freelance\Afia-App\oil-bottle-frames\Adobe Express - file.png'
img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
mask = img[:,:,3]
_, mask = cv2.threshold(mask, 10, 255, cv2.THRESH_BINARY)
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
main_contour = max(contours, key=cv2.contourArea)
contours_all, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

h, w = mask.shape
target_w, target_h = 460, 1024
sw, sh = target_w / w, target_h / h

def get_path(c):
    epsilon = 0.002 * cv2.arcLength(c, True)
    approx = cv2.approxPolyDP(c, epsilon, True)
    pts = []
    for p in approx:
        pts.append(f'{round(p[0][0]*sw)} {round(p[0][1]*sh)}')
    return 'M ' + ' L '.join(pts) + ' Z'

silhouette = get_path(main_contour)
handle = ''
max_hole_area = 0
if hierarchy is not None:
    for i, h_info in enumerate(hierarchy[0]):
        if h_info[3] != -1:
            area = cv2.contourArea(contours_all[i])
            if area > max_hole_area:
                max_hole_area = area
                handle = get_path(contours_all[i])

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 1024" width="230" height="512">
  <rect width="460" height="1024" fill="#f0f0f0"/>
  <g fill="none" stroke="#e11d48" stroke-width="8" stroke-linejoin="round" stroke-linecap="round">
    <path d="{silhouette}"/>
    <path d="{handle}"/>
  </g>
</svg>'''
with open(r'd:\AI Projects\Freelance\Afia-App\oil-bottle-frames\corrected_preview.svg', 'w') as f:
    f.write(svg)

print("SVG saved to d:\\AI Projects\\Freelance\\Afia-App\\oil-bottle-frames\\corrected_preview.svg")
