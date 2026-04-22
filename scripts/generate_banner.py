#!/usr/bin/env python3
"""Generate TickTack feature graphic 1024x500 px"""

from PIL import Image, ImageDraw, ImageFont
import os, math

W, H = 1024, 500
img = Image.new("RGB", (W, H), "#0D0D0D")
draw = ImageDraw.Draw(img)

# ── helpers ─────────────────────────────────────────────────────────────────

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def fill_gradient_v(draw_obj, x0, y0, x1, y1, c_top, c_bot, alpha=255):
    ct = hex2rgb(c_top)
    cb = hex2rgb(c_bot)
    for y in range(y0, y1):
        t = (y - y0) / max(y1 - y0 - 1, 1)
        color = lerp_color(ct, cb, t) + (alpha,)
        draw_obj.line([(x0, y), (x1, y)], fill=color[:3])

def rounded_rect(img_obj, xy, radius, fill, border=None, border_width=1):
    from PIL import ImageDraw as ID
    x0, y0, x1, y1 = xy
    mask = Image.new("L", img_obj.size, 0)
    md = ID.Draw(mask)
    md.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=255)
    layer = Image.new("RGB", img_obj.size, fill)
    img_obj.paste(layer, mask=mask)
    if border:
        bd = ID.Draw(img_obj)
        bd.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=border, width=border_width)

def blend_rect(base, xy, radius, fill_hex, alpha):
    """Blend a rounded rect with alpha onto base image"""
    x0, y0, x1, y1 = xy
    w = x1 - x0
    h = y1 - y0
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    c = hex2rgb(fill_hex) + (alpha,)
    ld.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=c)
    base_rgba = base.convert("RGBA")
    result = Image.alpha_composite(base_rgba, layer)
    return result.convert("RGB")

def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/SFNSText.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                continue
    return ImageFont.load_default()

# ── background gradient ──────────────────────────────────────────────────────
bg_top = hex2rgb("#0D0D0D")
bg_bot = hex2rgb("#1A1A2E")
for y in range(H):
    t = y / H
    c = lerp_color(bg_top, bg_bot, t)
    draw.line([(0, y), (W, y)], fill=c)

# ── subtle grid ─────────────────────────────────────────────────────────────
for y in range(0, H, 100):
    draw.line([(0, y), (W, y)], fill=(255, 255, 255, 8) if False else (30, 30, 50))
for x in range(0, W, 128):
    draw.line([(x, 0), (x, H)], fill=(30, 30, 50))

# ── glow behind phone ────────────────────────────────────────────────────────
glow_cx, glow_cy = 752, 250
for r in range(200, 0, -4):
    alpha = int(40 * (1 - r / 200))
    draw.ellipse(
        [glow_cx - r * 1.1, glow_cy - r, glow_cx + r * 1.1, glow_cy + r],
        fill=(79, 70, 229, alpha) if False else None,
        outline=(79, 70, 229)
    )
# Better glow using RGBA layer
glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow_layer)
for r in range(180, 0, -6):
    a = int(35 * (1 - r / 180))
    gd.ellipse(
        [glow_cx - int(r * 1.1), glow_cy - r, glow_cx + int(r * 1.1), glow_cy + r],
        fill=(79, 70, 229, a)
    )
base_rgba = img.convert("RGBA")
img = Image.alpha_composite(base_rgba, glow_layer).convert("RGB")
draw = ImageDraw.Draw(img)

# ── phone body ───────────────────────────────────────────────────────────────
PX, PY, PW, PH = 636, 44, 232, 412
# shadow
shadow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow_layer)
for i in range(20, 0, -1):
    a = int(15 * i / 20)
    sd.rounded_rectangle(
        [PX - i, PY + 8 - i//2, PX + PW + i, PY + PH + 8 + i//2],
        radius=30 + i, fill=(79, 70, 229, a)
    )
base_rgba = img.convert("RGBA")
img = Image.alpha_composite(base_rgba, shadow_layer).convert("RGB")
draw = ImageDraw.Draw(img)

img = blend_rect(img, [PX, PY, PX + PW, PY + PH], 28, "#1E1E2E", 255)
draw = ImageDraw.Draw(img)
draw.rounded_rectangle([PX, PY, PX + PW, PY + PH], radius=28, outline="#3A3A5C", width=2)

# phone screen
SX, SY, SW, SH = 648, 62, 208, 378
fill_gradient_v(draw, SX, SY, SX + SW, SY + SH, "#1C1C2E", "#12121F")
draw.rounded_rectangle([SX, SY, SX + SW, SY + SH], radius=14, outline="#2A2A4A", width=1)

# notch
draw.rectangle([SX + 68, SY, SX + 68 + 72, SY + 24], fill="#1E1E2E")
draw.rounded_rectangle([SX + 78, SY + 6, SX + 78 + 52, SY + 6 + 12], radius=6, fill="#12121F")

# home bar
draw.rounded_rectangle([PX + 68, PY + PH - 16, PX + 68 + 96, PY + PH - 12], radius=2, fill="#3A3A5C")

# side buttons
draw.rounded_rectangle([PX - 4, PY + 76, PX - 1, PY + 116], radius=2, fill="#2A2A3E")
draw.rounded_rectangle([PX - 4, PY + 126, PX - 1, PY + 166], radius=2, fill="#2A2A3E")
draw.rounded_rectangle([PX + PW + 1, PY + 96, PX + PW + 4, PY + 156], radius=2, fill="#2A2A3E")

# ── screen content ────────────────────────────────────────────────────────────
f7 = font(9)
f8 = font(10)
f9 = font(11)
f10 = font(12)
f11 = font(13)
f12 = font(14)
f14 = font(16)
f16 = font(18)
f18 = font(20)
f_bold12 = font(14, bold=True)

# status bar
draw.rectangle([SX, SY, SX + SW, SY + 20], fill="#12121F")
draw.text((SX + 12, SY + 5), "9:41", fill="#888888", font=f8)
draw.text((SX + SW - 36, SY + 5), "100%", fill="#888888", font=f8)

# header
draw.rectangle([SX, SY + 20, SX + SW, SY + 54], fill="#1A1A2E")
draw.text((SX + SW // 2, SY + 30), "TickTack", fill="white", font=f_bold12, anchor="mm")
# menu dots
for dx in [0, 7, 14]:
    draw.ellipse([SX + SW - 30 + dx, SY + 40, SX + SW - 27 + dx, SY + 43], fill="#888888")

# tabs bar
draw.rectangle([SX, SY + 54, SX + SW, SY + 80], fill="#12121F")
img = blend_rect(img, [SX + 8, SY + 57, SX + 8 + 44, SY + 57 + 20], 10, "#4F46E5", 255)
draw = ImageDraw.Draw(img)
draw.text((SX + 30, SY + 67), "Все", fill="white", font=f8, anchor="mm")
draw.text((SX + 80, SY + 67), "Личное", fill="#666666", font=f8, anchor="mm")
draw.text((SX + 130, SY + 67), "Работа", fill="#666666", font=f8, anchor="mm")
draw.text((SX + 175, SY + 67), "🔒", fill="#666666", font=f8, anchor="mm")

# Task helper
def draw_task(img, draw, tx, ty, tw, th, done=False, accent="#4F46E5", title="", subtitle="", badge=None, badge_color="#FF6B6B", opacity=255):
    img = blend_rect(img, [tx, ty, tx + tw, ty + th], 10, "#1E1E35", opacity)
    draw = ImageDraw.Draw(img)
    # circle
    cx, cy = tx + 20, ty + th // 2
    r = 9
    if done:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#4F46E5")
        # checkmark
        draw.line([(cx - 5, cy), (cx - 1, cy + 4), (cx + 5, cy - 4)], fill="white", width=2)
    else:
        accent_rgb = hex2rgb(accent)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=accent_rgb, width=2)
    # title
    tc = "#555555" if done else "white"
    draw.text((tx + 36, ty + th // 2 - 8), title, fill=tc, font=f8)
    if done:
        # strikethrough
        tw2 = f8.getlength(title)
        draw.line([(tx + 36, ty + th // 2 - 4), (tx + 36 + int(tw2), ty + th // 2 - 4)], fill="#555555", width=1)
    # subtitle
    draw.text((tx + 36, ty + th // 2 + 4), subtitle, fill="#666666", font=f7)
    # badge
    if badge:
        bx = tx + tw - 30
        by = ty + th // 2 - 7
        draw.rounded_rectangle([bx, by, bx + 22, by + 13], radius=6, fill=hex2rgb(badge_color))
        draw.text((bx + 11, by + 6), badge, fill="white", font=f7, anchor="mm")
    return img, draw

TY_BASE = SY + 88
GAP = 48

img, draw = draw_task(img, draw, SX + 4, TY_BASE, 200, 42,
    done=False, accent="#4F46E5", title="Купить молоко",
    subtitle="Сегодня, 18:00", badge="!", badge_color="#FF6B6B")

img, draw = draw_task(img, draw, SX + 4, TY_BASE + GAP, 200, 42,
    done=True, title="Отчёт за квартал", subtitle="Вчера, 17:00")

# Task with location chip
img, draw = draw_task(img, draw, SX + 4, TY_BASE + GAP * 2, 200, 42,
    done=False, accent="#22D3EE", title="Зайти в аптеку", subtitle="")
draw = ImageDraw.Draw(img)
img = blend_rect(img, [SX + 40, TY_BASE + GAP * 2 + 24, SX + 40 + 56, TY_BASE + GAP * 2 + 36], 5, "#0E4C57", 230)
draw = ImageDraw.Draw(img)
draw.text((SX + 68, TY_BASE + GAP * 2 + 30), "📍 500м", fill="#22D3EE", font=f7, anchor="mm")

img, draw = draw_task(img, draw, SX + 4, TY_BASE + GAP * 3, 200, 42,
    done=False, accent="#F59E0B", title="Созвон с командой",
    subtitle="Завтра, 11:00", badge="~", badge_color="#F59E0B")

img, draw = draw_task(img, draw, SX + 4, TY_BASE + GAP * 4, 200, 42,
    done=False, accent="#666666", title="Прочитать книгу",
    subtitle="Пт, 20:00", opacity=160)

# FAB button
fab_cx, fab_cy = SX + SW - 24, SY + SH - 30
draw.ellipse([fab_cx - 20, fab_cy - 20, fab_cx + 20, fab_cy + 20], fill="#4F46E5")
draw.text((fab_cx, fab_cy), "+", fill="white", font=f18, anchor="mm")

# ── LEFT SIDE ─────────────────────────────────────────────────────────────────
draw = ImageDraw.Draw(img)

# App icon background
IX, IY, IS = 60, 55, 96
img = blend_rect(img, [IX, IY, IX + IS, IY + IS], 22, "#111111", 255)
draw = ImageDraw.Draw(img)
draw.rounded_rectangle([IX, IY, IX + IS, IY + IS], radius=22, outline="#2A2A2A", width=1)

# TT logo
lx, ly = IX + 23, IY + 22
# left bar
draw.rounded_rectangle([lx, ly, lx + 18, ly + 52], radius=2, fill="white")
# right bar (shorter)
draw.rounded_rectangle([lx + 29, ly + 14, lx + 29 + 18, ly + 52], radius=2, fill="white")
# top cap left
draw.rounded_rectangle([lx - 5, ly - 2, lx + 23, ly + 8], radius=2, fill="white")
# top cap right
draw.rounded_rectangle([lx + 24, ly + 12, lx + 52, ly + 22], radius=2, fill="white")

# App name
f_title = font(54, bold=True)
f_tag = font(18)
f_feat = font(14)
f_feat_sm = font(13)

draw.text((60, 170), "TickTack", fill="white", font=f_title)

draw.text((60, 234), "Умные напоминания для жизни", fill="#888888", font=f_tag)

# divider
draw.line([(60, 262), (320, 262)], fill="#2A2A4A", width=1)

# features
features = [
    ("⏰", "#4F46E5", "Напоминания по времени и GPS"),
    ("📍", "#22D3EE", "Геолокация — задача у нужного места"),
    ("🔒", "#F59E0B", "Приватные списки — Face ID / отпечаток"),
    ("✓",  "#34D399", "Подзадачи, приоритеты, статистика"),
    ("🌙", "#A78BFA", "Тёмная тема  ·  Бесплатно"),
]

for i, (icon, color_hex, text) in enumerate(features):
    fy = 278 + i * 34
    color_rgb = hex2rgb(color_hex)
    # dot circle bg
    circ_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(circ_layer)
    cd.ellipse([60, fy - 2, 82, fy + 20], fill=color_rgb + (50,))
    base_rgba = img.convert("RGBA")
    img = Image.alpha_composite(base_rgba, circ_layer).convert("RGB")
    draw = ImageDraw.Draw(img)
    draw.text((71, fy + 9), icon, fill=color_hex, font=f_feat_sm, anchor="mm")
    draw.text((92, fy + 2), text, fill="#CCCCCC", font=f_feat)

# ── left accent bar ──────────────────────────────────────────────────────────
bar_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(bar_layer)
for y in range(H):
    t = y / H
    if t < 0.3:
        a = int(255 * t / 0.3)
        c = (79, 70, 229, a)
    elif t < 0.5:
        a = 255
        tt = (t - 0.3) / 0.2
        r = int(79 + (34 - 79) * tt)
        g = int(70 + (211 - 70) * tt)
        b = int(229 + (238 - 229) * tt)
        c = (r, g, b, a)
    elif t < 0.7:
        a = 255
        c = (34, 211, 238, a)
    else:
        a = int(255 * (1 - t) / 0.3)
        c = (34, 211, 238, a)
    bd.line([(0, y), (4, y)], fill=c)
base_rgba = img.convert("RGBA")
img = Image.alpha_composite(base_rgba, bar_layer).convert("RGB")

# ── floating dots ─────────────────────────────────────────────────────────────
draw = ImageDraw.Draw(img)
dots = [
    (520, 80, 3, "#4F46E5", 130), (540, 120, 2, "#22D3EE", 100),
    (510, 160, 4, "#4F46E5", 80), (555, 200, 2, "#A78BFA", 130),
    (525, 340, 3, "#22D3EE", 80), (545, 380, 2, "#4F46E5", 100),
    (515, 420, 4, "#A78BFA", 80), (560, 450, 2, "#22D3EE", 130),
    (530, 50,  2, "#A78BFA", 60), (505, 280, 3, "#34D399", 80),
]
dl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
dd = ImageDraw.Draw(dl)
for (dx, dy, dr, dc, da) in dots:
    rc = hex2rgb(dc) + (da,)
    dd.ellipse([dx - dr, dy - dr, dx + dr, dy + dr], fill=rc)
base_rgba = img.convert("RGBA")
img = Image.alpha_composite(base_rgba, dl).convert("RGB")

# ── save ─────────────────────────────────────────────────────────────────────
out = os.path.join(os.path.dirname(__file__), "feature_graphic.png")
img.save(out, "PNG")
print(f"Saved: {out}  ({W}x{H})")
