# Builds the home-screen app icons: the Fred's English logo with "Speakly" under it.
# Run: python3 scripts/app_icons.py  (needs Pillow and BricolageGrotesque-Bold.ttf)
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = sys.argv[1] if len(sys.argv) > 1 else "BricolageGrotesque-Bold.ttf"
BLUE = (8, 45, 151)
logo = Image.open("public/freds-english-logo.png").convert("RGBA")


def icon(size, content):
    """content: share of the square used by logo + word (maskable icons need a safe margin)."""
    im = Image.new("RGB", (size, size), "white")
    box = int(size * content)
    lw = box
    lh = int(logo.height * lw / logo.width)
    font = ImageFont.truetype(FONT, int(box * 0.17))
    draw = ImageDraw.Draw(im)
    l, t, r, b = draw.textbbox((0, 0), "Speakly", font=font)
    gap = int(box * 0.05)
    total = lh + gap + (b - t)
    top = (size - total) // 2
    im.paste(logo.resize((lw, lh), Image.LANCZOS), ((size - lw) // 2, top), logo.resize((lw, lh), Image.LANCZOS))
    draw.text(((size - (r - l)) // 2 - l, top + lh + gap - t), "Speakly", font=font, fill=BLUE)
    return im


icon(512, 0.74).save("public/icon-512.png")
icon(192, 0.74).save("public/icon-192.png")
icon(180, 0.74).save("public/apple-touch-icon.png")
icon(512, 0.62).save("public/icon-maskable-512.png")
