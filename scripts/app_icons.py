# Builds the home-screen app icons and the header mark: a gold serif "S" on navy with "Speakly" under it.
# Run: python3 scripts/app_icons.py CormorantGaramond-Bold.ttf  (needs Pillow)
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = sys.argv[1] if len(sys.argv) > 1 else "CormorantGaramond-Bold.ttf"
NAVY = (11, 31, 77)
GOLD = (227, 196, 126)
IVORY = (246, 239, 223)


def icon(size, content):
    """content: share of the square used by letter + word (maskable icons need a safe margin)."""
    im = Image.new("RGB", (size, size), NAVY)
    box = int(size * content)
    draw = ImageDraw.Draw(im)
    big = ImageFont.truetype(FONT, int(box * 0.78))
    word = ImageFont.truetype(FONT, int(box * 0.22))
    bl, bt, br, bb = draw.textbbox((0, 0), "S", font=big)
    wl, wt, wr, wb = draw.textbbox((0, 0), "Speakly", font=word)
    gap = int(box * 0.06)
    total = (bb - bt) + gap + (wb - wt)
    top = (size - total) // 2
    draw.text(((size - (br - bl)) // 2 - bl, top - bt), "S", font=big, fill=GOLD)
    draw.text(((size - (wr - wl)) // 2 - wl, top + (bb - bt) + gap - wt), "Speakly", font=word, fill=IVORY)
    return im


def mark(height):
    """Gold "S" on a transparent background, for the navy header."""
    font = ImageFont.truetype(FONT, height * 2)
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    l, t, r, b = probe.textbbox((0, 0), "S", font=font)
    im = Image.new("RGBA", (r - l, b - t), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((-l, -t), "S", font=font, fill=GOLD)
    return im.resize((round(im.width * height / im.height), height), Image.LANCZOS)


icon(512, 0.74).save("public/icon-512.png")
icon(192, 0.74).save("public/icon-192.png")
icon(180, 0.74).save("public/apple-touch-icon.png")
icon(512, 0.62).save("public/icon-maskable-512.png")
mark(72).save("public/speakly-mark-gold.png")
