from PIL import Image, ImageDraw, ImageFont
import os

# Icon sizes required for iOS
SIZES = [
    (20, 1), (20, 2), (20, 3),
    (29, 1), (29, 2), (29, 3),
    (40, 1), (40, 2), (40, 3),
    (60, 2), (60, 3),
    (76, 1), (76, 2),
    (83, 2),  # 83.5 -> 167
    (1024, 1),
]

OUTPUT_DIR = "ios/TickTack/Images.xcassets/AppIcon.appiconset"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def make_icon(size):
    img = Image.new("RGB", (size, size), color=(17, 17, 17))
    draw = ImageDraw.Draw(img)

    font_size = int(size * 0.46)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        font = ImageFont.load_default()

    # --- Normal "T" (right half) ---
    t_bbox = draw.textbbox((0, 0), "T", font=font)
    t_w = t_bbox[2] - t_bbox[0]
    t_h = t_bbox[3] - t_bbox[1]
    gap = int(size * 0.04)

    total_w = t_w * 2 + gap
    start_x = (size - total_w) / 2
    y = (size - t_h) / 2 - t_bbox[1]

    # Normal T
    x1 = start_x - t_bbox[0]
    draw.text((x1, y), "T", fill=(255, 255, 255), font=font)

    # --- Flipped "T" (rendered separately, then rotated) ---
    t_img = Image.new("RGBA", (t_w, t_h), (0, 0, 0, 0))
    t_draw = ImageDraw.Draw(t_img)
    t_draw.text((-t_bbox[0], -t_bbox[1]), "T", fill=(255, 255, 255), font=font)
    t_flipped = t_img.rotate(180)

    x2 = int(start_x + t_w + gap)
    y2 = int((size - t_h) / 2)
    img.paste(t_flipped, (x2, y2), t_flipped)

    return img

contents = {"images": [], "info": {"author": "xcode", "version": 1}}

for base_size, scale in SIZES:
    pixel_size = base_size * scale
    img = make_icon(pixel_size)
    filename = f"icon_{base_size}x{base_size}@{scale}x.png"
    img.save(os.path.join(OUTPUT_DIR, filename))

    size_str = f"{base_size}x{base_size}"
    scale_str = f"{scale}x"

    idiom = "iphone"
    if base_size in [76, 83]:
        idiom = "ipad"
    elif base_size == 1024:
        idiom = "ios-marketing"

    contents["images"].append({
        "filename": filename,
        "idiom": idiom,
        "scale": scale_str,
        "size": size_str
    })

import json
with open(os.path.join(OUTPUT_DIR, "Contents.json"), "w") as f:
    json.dump(contents, f, indent=2)

print("Icons generated successfully!")
