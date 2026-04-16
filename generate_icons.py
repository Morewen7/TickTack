from PIL import Image, ImageDraw
import os, json

SIZES = [
    (20, 1), (20, 2), (20, 3),
    (29, 1), (29, 2), (29, 3),
    (40, 1), (40, 2), (40, 3),
    (60, 2), (60, 3),
    (76, 1), (76, 2),
    (83, 2),
    (1024, 1),
]

OUTPUT_DIR = "ios/TickTack/Images.xcassets/AppIcon.appiconset"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def draw_tt_logo(draw, cx, cy, logo_h, color=(255, 255, 255)):
    s = round(logo_h * 0.18)
    tw = round(logo_h * 0.55)
    stem1x_rel = (tw - s) // 2
    t2start = stem1x_rel + s  # правая T сразу после стойки левой
    stem2x_rel = t2start + (tw - s) // 2
    total_w = t2start + tw

    x0 = cx - total_w // 2
    y0 = cy - logo_h // 2

    # Левая T
    draw.rectangle([x0, y0, x0 + tw, y0 + s], fill=color)
    draw.rectangle([x0 + stem1x_rel, y0, x0 + stem1x_rel + s, y0 + logo_h], fill=color)

    # Правая перевёрнутая T
    draw.rectangle([x0 + t2start, y0 + logo_h - s, x0 + t2start + tw, y0 + logo_h], fill=color)
    draw.rectangle([x0 + stem2x_rel, y0, x0 + stem2x_rel + s, y0 + logo_h], fill=color)

def make_icon(size):
    img = Image.new("RGB", (size, size), color=(17, 17, 17))
    draw = ImageDraw.Draw(img)
    logo_h = int(size * 0.52)
    draw_tt_logo(draw, size // 2, size // 2, logo_h)
    return img

contents = {"images": [], "info": {"author": "xcode", "version": 1}}

for base_size, scale in SIZES:
    pixel_size = base_size * scale
    img = make_icon(pixel_size)
    filename = f"icon_{base_size}x{base_size}@{scale}x.png"
    img.save(os.path.join(OUTPUT_DIR, filename))

    idiom = "iphone"
    if base_size in [76, 83]:
        idiom = "ipad"
    elif base_size == 1024:
        idiom = "ios-marketing"

    contents["images"].append({
        "filename": filename,
        "idiom": idiom,
        "scale": f"{scale}x",
        "size": f"{base_size}x{base_size}"
    })

with open(os.path.join(OUTPUT_DIR, "Contents.json"), "w") as f:
    json.dump(contents, f, indent=2)

print("Icons generated!")
