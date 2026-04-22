#!/usr/bin/env python3
"""Generate TickTack app screenshots for GitHub README — 3 screens"""

from PIL import Image, ImageDraw, ImageFont
import os, math

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── helpers ──────────────────────────────────────────────────────────────────

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def fill_gradient_v(img, x0, y0, x1, y1, c_top, c_bot):
    draw = ImageDraw.Draw(img)
    ct, cb = hex2rgb(c_top), hex2rgb(c_bot)
    for y in range(y0, y1):
        t = (y - y0) / max(y1 - y0 - 1, 1)
        draw.line([(x0, y), (x1, y)], fill=lerp_color(ct, cb, t))

def blend_rect(img, xy, radius, fill_hex, alpha=255):
    x0, y0, x1, y1 = xy
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    c = hex2rgb(fill_hex) + (alpha,)
    ld.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=c)
    result = Image.alpha_composite(img.convert("RGBA"), layer)
    return result.convert("RGB")

def font(size):
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

# ── Phone frame ───────────────────────────────────────────────────────────────

W, H = 390, 844  # iPhone 14 size

def make_canvas():
    img = Image.new("RGB", (W, H), "#0D0D1A")
    # gradient bg
    fill_gradient_v(img, 0, 0, W, H, "#0D0D1A", "#141428")
    return img

def draw_phone_chrome(img):
    draw = ImageDraw.Draw(img)
    # dynamic island
    di_w, di_h = 120, 34
    di_x = (W - di_w) // 2
    draw.rounded_rectangle([di_x, 8, di_x + di_w, 8 + di_h], radius=17, fill="#050508")
    # status bar items
    f_status = font(22)
    draw.text((32, 18), "9:41", fill="#EEEEEE", font=f_status)
    # battery
    bx, by = W - 80, 20
    draw.rounded_rectangle([bx, by, bx + 44, by + 20], radius=4, outline="#EEEEEE", width=2)
    draw.rounded_rectangle([bx + 44, by + 6, bx + 48, by + 14], radius=2, fill="#EEEEEE")
    draw.rounded_rectangle([bx + 2, by + 2, bx + 42, by + 18], radius=3, fill="#4ADE80")
    return img

# ── SCREEN 1: Home Screen ─────────────────────────────────────────────────────

def make_screen1():
    img = make_canvas()
    img = draw_phone_chrome(img)
    draw = ImageDraw.Draw(img)

    f_hdr   = font(32)
    f_title = font(26)
    f_sub   = font(20)
    f_sm    = font(18)
    f_xs    = font(16)
    f_tab   = font(22)

    # Header
    header_y = 60
    img = blend_rect(img, [0, header_y, W, header_y + 56], 0, "#111124", 255)
    draw = ImageDraw.Draw(img)
    draw.text((24, header_y + 14), "TickTack", fill="#FFFFFF", font=f_hdr)
    # menu dots
    for i in range(3):
        cx = W - 40 + i * 12
        draw.ellipse([cx - 3, header_y + 26, cx + 3, header_y + 32], fill="#888888")

    # Tabs
    tabs_y = header_y + 56
    img = blend_rect(img, [0, tabs_y, W, tabs_y + 48], 0, "#0D0D1A", 255)
    draw = ImageDraw.Draw(img)
    tabs = [("Все", True), ("Личное", False), ("Работа", False), ("🔒", False)]
    tx = 16
    for label, active in tabs:
        tw = int(font(22).getlength(label)) + 24
        if active:
            img = blend_rect(img, [tx, tabs_y + 8, tx + tw, tabs_y + 38], 14, "#4F46E5", 255)
            draw = ImageDraw.Draw(img)
            draw.text((tx + tw // 2, tabs_y + 23), label, fill="#FFFFFF", font=f_tab, anchor="mm")
        else:
            draw.text((tx + tw // 2, tabs_y + 23), label, fill="#666688", font=f_tab, anchor="mm")
        tx += tw + 8

    # Tasks
    def task_row(img, y, title, subtitle, accent, done=False, badge=None, badge_col="#FF6B6B", loc=None, opacity=230):
        img = blend_rect(img, [16, y, W - 16, y + 68], 14, "#1A1A30", opacity)
        draw = ImageDraw.Draw(img)
        cx, cy = 50, y + 34
        r = 14
        if done:
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hex2rgb(accent))
            draw.line([(cx - 7, cy), (cx - 2, cy + 6), (cx + 7, cy - 6)], fill="white", width=2)
        else:
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=hex2rgb(accent), width=2)
        tc = "#444466" if done else "#FFFFFF"
        draw.text((72, y + 14), title, fill=tc, font=f_sub)
        if done:
            tw2 = int(f_sub.getlength(title))
            draw.line([(72, y + 30), (72 + tw2, y + 30)], fill="#444466", width=1)
        if subtitle:
            draw.text((72, y + 42), subtitle, fill="#666688", font=f_xs)
        if loc:
            lw = int(f_xs.getlength(loc)) + 20
            img = blend_rect(img, [72, y + 42, 72 + lw, y + 60], 8, "#0E3040", 220)
            draw = ImageDraw.Draw(img)
            draw.text((72 + lw // 2, y + 51), loc, fill="#22D3EE", font=f_xs, anchor="mm")
        if badge:
            bx = W - 52
            img = blend_rect(img, [bx, y + 22, bx + 28, y + 46], 8, badge_col, 255)
            draw = ImageDraw.Draw(img)
            draw.text((bx + 14, y + 34), badge, fill="white", font=f_xs, anchor="mm")
        return img

    ty = tabs_y + 60
    gap = 76

    img = task_row(img, ty,        "Купить молоко",      "Сегодня, 18:00",  "#FF6B6B", badge="!", badge_col="#FF6B6B")
    img = task_row(img, ty+gap,    "Отчёт за квартал",   "Вчера, 17:00",    "#4F46E5", done=True)
    img = task_row(img, ty+gap*2,  "Зайти в аптеку",     "",                "#22D3EE", loc="📍 500м · Пушкина, 12")
    img = task_row(img, ty+gap*3,  "Созвон с командой",  "Завтра, 11:00",   "#F59E0B", badge="~", badge_col="#F59E0B")
    img = task_row(img, ty+gap*4,  "Прочитать книгу",    "Пт, 20:00",       "#666688", opacity=160)

    # FAB
    draw = ImageDraw.Draw(img)
    fab_x, fab_y = W - 56, H - 100
    # shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for i in range(12, 0, -1):
        a = int(8 * i)
        sd.ellipse([fab_x - 28 - i, fab_y - 28 - i, fab_x + 28 + i, fab_y + 28 + i], fill=(79, 70, 229, a))
    img = Image.alpha_composite(img.convert("RGBA"), shadow).convert("RGB")
    draw = ImageDraw.Draw(img)
    draw.ellipse([fab_x - 28, fab_y - 28, fab_x + 28, fab_y + 28], fill=hex2rgb("#4F46E5"))
    draw.text((fab_x, fab_y), "+", fill="white", font=font(40), anchor="mm")

    return img

# ── SCREEN 2: Add Reminder ────────────────────────────────────────────────────

def make_screen2():
    img = make_canvas()
    img = draw_phone_chrome(img)
    draw = ImageDraw.Draw(img)

    f_hdr  = font(30)
    f_lbl  = font(22)
    f_val  = font(24)
    f_sm   = font(20)
    f_xs   = font(18)
    f_btn  = font(26)

    header_y = 60
    img = blend_rect(img, [0, header_y, W, header_y + 56], 0, "#111124", 255)
    draw = ImageDraw.Draw(img)
    draw.text((W // 2, header_y + 28), "Новое напоминание", fill="#FFFFFF", font=f_hdr, anchor="mm")
    draw.text((24, header_y + 28), "✕", fill="#666688", font=font(28), anchor="lm")

    def field(img, y, label, value, accent="#4F46E5", icon=None):
        img = blend_rect(img, [16, y, W - 16, y + 62], 12, "#1A1A30", 240)
        draw = ImageDraw.Draw(img)
        draw.text((44 if icon else 24, y + 14), label, fill="#666688", font=font(18))
        draw.text((44 if icon else 24, y + 34), value, fill="#FFFFFF", font=font(24))
        if icon:
            draw.text((22, y + 31), icon, fill=accent, font=font(20), anchor="lm")
        # right arrow
        ax = W - 32
        draw.line([(ax, y + 22), (ax + 8, y + 31), (ax, y + 40)], fill="#444466", width=2)
        return img

    fy = 134
    gap = 70

    img = field(img, fy,      "Название задачи",  "Купить продукты 🛒",    icon=None)
    img = field(img, fy+gap,  "Дата и время",     "Сегодня, 18:00",         accent="#4F46E5", icon="⏰")
    img = field(img, fy+gap*2,"Повтор",            "Еженедельно",            accent="#A78BFA", icon="🔁")
    img = field(img, fy+gap*3,"Место",             "📍 Магнит, Пушкина 12", accent="#22D3EE", icon="📍")
    img = field(img, fy+gap*4,"Список",            "🛒 Покупки",             accent="#F59E0B", icon="📋")

    # Priority row
    pry = fy + gap * 5 + 8
    draw = ImageDraw.Draw(img)
    draw.text((24, pry), "Приоритет", fill="#666688", font=font(18))
    labels = [("Низкий", "#34D399", False), ("Средний", "#F59E0B", True), ("Высокий", "#FF6B6B", False)]
    px = 24
    for lbl, col, active in labels:
        pw = int(font(20).getlength(lbl)) + 28
        if active:
            img = blend_rect(img, [px, pry + 22, px + pw, pry + 50], 12, col, 255)
            draw = ImageDraw.Draw(img)
            draw.text((px + pw // 2, pry + 36), lbl, fill="#000000", font=font(20), anchor="mm")
        else:
            draw = ImageDraw.Draw(img)
            draw.rounded_rectangle([px, pry + 22, px + pw, pry + 50], radius=12, outline=hex2rgb(col), width=2)
            draw.text((px + pw // 2, pry + 36), lbl, fill=col, font=font(20), anchor="mm")
        px += pw + 12

    # Save button
    btn_y = H - 120
    # gradient button
    btn_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for x in range(24, W - 24):
        t = (x - 24) / (W - 48)
        c1, c2 = hex2rgb("#4F46E5"), hex2rgb("#7C3AED")
        col = lerp_color(c1, c2, t) + (255,)
        bd = ImageDraw.Draw(btn_layer)
        bd.line([(x, btn_y), (x, btn_y + 60)], fill=col)
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([24, btn_y, W - 24, btn_y + 60], radius=16, fill=255)
    btn_layer.putalpha(mask)
    img = Image.alpha_composite(img.convert("RGBA"), btn_layer).convert("RGB")
    draw = ImageDraw.Draw(img)
    draw.text((W // 2, btn_y + 30), "Сохранить", fill="#FFFFFF", font=f_btn, anchor="mm")

    return img

# ── SCREEN 3: Location Reminder ───────────────────────────────────────────────

def make_screen3():
    img = make_canvas()
    img = draw_phone_chrome(img)
    draw = ImageDraw.Draw(img)

    header_y = 60
    img = blend_rect(img, [0, header_y, W, header_y + 56], 0, "#111124", 255)
    draw = ImageDraw.Draw(img)
    draw.text((W // 2, header_y + 28), "Место напоминания", fill="#FFFFFF", font=font(30), anchor="mm")
    draw.text((24, header_y + 28), "←", fill="#4F46E5", font=font(28), anchor="lm")

    # Map-like area
    map_y = header_y + 56
    map_h = 320
    fill_gradient_v(img, 0, map_y, W, map_y + map_h, "#0A1628", "#0D2040")
    draw = ImageDraw.Draw(img)

    # Grid lines (map streets)
    for y in range(map_y, map_y + map_h, 40):
        draw.line([(0, y), (W, y)], fill=(255, 255, 255, 15) if False else "#0F2035")
    for x in range(0, W, 50):
        draw.line([(x, map_y), (x, map_y + map_h)], fill="#0F2035")
    # Streets
    draw.line([(0, map_y + 160), (W, map_y + 160)], fill="#162840", width=8)
    draw.line([(0, map_y + 240), (W, map_y + 240)], fill="#162840", width=6)
    draw.line([(W // 2 - 30, map_y), (W // 2 - 30, map_y + map_h)], fill="#162840", width=10)
    draw.line([(W // 2 + 80, map_y), (W // 2 + 80, map_y + map_h)], fill="#162840", width=6)
    # Blocks
    blocks = [(40, map_y+20, 160, map_y+150), (180, map_y+20, 340, map_y+150),
              (40, map_y+170, 160, map_y+230), (180, map_y+170, 340, map_y+230),
              (360, map_y+20, W-20, map_y+230), (40, map_y+250, 250, map_y+310)]
    for bk in blocks:
        img = blend_rect(img, list(bk), 4, "#0E1E30", 200)
    draw = ImageDraw.Draw(img)

    # Radius circle
    cx, cy = W // 2 - 30 + 30, map_y + 155
    # Glow
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r in range(100, 0, -4):
        a = int(30 * (1 - r / 100))
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(34, 211, 238, a))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(img)
    draw.ellipse([cx - 100, cy - 100, cx + 100, cy + 100], outline=hex2rgb("#22D3EE"), width=2)
    draw.ellipse([cx - 102, cy - 102, cx + 102, cy + 102], outline=hex2rgb("#22D3EE"), width=1)

    # Pin
    pin_r = 16
    draw.ellipse([cx - pin_r, cy - pin_r, cx + pin_r, cy + pin_r], fill=hex2rgb("#22D3EE"))
    draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill="#0D0D1A")
    # label bubble
    bw, bh = 200, 42
    bx, by2 = cx - bw // 2, cy - pin_r - bh - 12
    img = blend_rect(img, [bx, by2, bx + bw, by2 + bh], 10, "#111124", 240)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([bx, by2, bx + bw, by2 + bh], radius=10, outline=hex2rgb("#22D3EE"), width=1)
    draw.text((bx + bw // 2, by2 + bh // 2), "Пушкина ул., 12", fill="#22D3EE", font=font(20), anchor="mm")

    # Radius selector
    rs_y = map_y + map_h + 16
    draw = ImageDraw.Draw(img)
    draw.text((24, rs_y), "Радиус срабатывания", fill="#FFFFFF", font=font(26))
    radii = [("100м", False), ("300м", False), ("500м", True), ("1 км", False)]
    rx = 24
    for lbl, active in radii:
        rw = int(font(22).getlength(lbl)) + 28
        if active:
            img = blend_rect(img, [rx, rs_y + 36, rx + rw, rs_y + 66], 12, "#22D3EE", 255)
            draw = ImageDraw.Draw(img)
            draw.text((rx + rw // 2, rs_y + 51), lbl, fill="#000000", font=font(22), anchor="mm")
        else:
            draw = ImageDraw.Draw(img)
            draw.rounded_rectangle([rx, rs_y + 36, rx + rw, rs_y + 66], radius=12, outline=hex2rgb("#22D3EE"), width=2)
            draw.text((rx + rw // 2, rs_y + 51), lbl, fill="#22D3EE", font=font(22), anchor="mm")
        rx += rw + 12

    # Trigger selector
    trg_y = rs_y + 88
    draw.text((24, trg_y), "Сработать когда", fill="#FFFFFF", font=font(26))
    for i, (lbl, active) in enumerate([("Прихожу", True), ("Ухожу", False)]):
        tx = 24 + i * 180
        tw = 160
        if active:
            img = blend_rect(img, [tx, trg_y + 36, tx + tw, trg_y + 66], 12, "#4F46E5", 255)
            draw = ImageDraw.Draw(img)
            draw.text((tx + tw // 2, trg_y + 51), lbl, fill="#FFFFFF", font=font(24), anchor="mm")
        else:
            draw = ImageDraw.Draw(img)
            draw.rounded_rectangle([tx, trg_y + 36, tx + tw, trg_y + 66], radius=12, outline=hex2rgb("#4F46E5"), width=2)
            draw.text((tx + tw // 2, trg_y + 51), lbl, fill="#4F46E5", font=font(24), anchor="mm")

    # Save button
    btn_y = H - 100
    btn_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for x in range(24, W - 24):
        t = (x - 24) / (W - 48)
        c1, c2 = hex2rgb("#22D3EE"), hex2rgb("#0891B2")
        col = lerp_color(c1, c2, t) + (255,)
        bd = ImageDraw.Draw(btn_layer)
        bd.line([(x, btn_y), (x, btn_y + 56)], fill=col)
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([24, btn_y, W - 24, btn_y + 56], radius=16, fill=255)
    btn_layer.putalpha(mask)
    img = Image.alpha_composite(img.convert("RGBA"), btn_layer).convert("RGB")
    draw = ImageDraw.Draw(img)
    draw.text((W // 2, btn_y + 28), "Сохранить место", fill="#000000", font=font(26), anchor="mm")

    return img

# ── Generate all ──────────────────────────────────────────────────────────────

screens = [
    ("screenshot_1_home.png",     make_screen1),
    ("screenshot_2_add.png",      make_screen2),
    ("screenshot_3_location.png", make_screen3),
]

for fname, fn in screens:
    img = fn()
    path = os.path.join(OUT_DIR, fname)
    img.save(path, "PNG")
    print(f"Saved: {path}  ({img.size[0]}x{img.size[1]})")
