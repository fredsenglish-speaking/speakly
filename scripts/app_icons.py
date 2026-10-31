# Builds the home-screen app icons: the "Speakly." wordmark (italic Playfair, gold full stop) on navy.
# Run: python3 scripts/app_icons.py PlayfairDisplay-ExtraBoldItalic.ttf  (needs Pillow)
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = sys.argv[1] if len(sys.argv) > 1 else "PlayfairDisplay-ExtraBoldItalic.ttf"
NAVY = (11, 31, 77)
GOLD = (227, 196, 126)
IVORY = (246, 239, 223)


def icon(size, content):
    """content: share of the square's width the word may use (maskable icons need a safe margin)."""
    im = Image.new("RGB", (size, size), NAVY)
    draw = ImageDraw.Draw(im)
    px = size
    while True:
        font = ImageFont.truetype(FONT, px)
        l, t, r, b = draw.textbbox((0, 0), "Speakly.", font=font)
        if r - l <= size * content:
            break
        px -= 1
    x = (size - (r - l)) // 2 - l
    y = (size - (b - t)) // 2 - t
    draw.text((x, y), "Speakly", font=font, fill=IVORY)
    dot_x = x + draw.textlength("Speakly", font=font)
    draw.text((dot_x, y), ".", font=font, fill=GOLD)
    return im


icon(512, 0.84).save("public/icon-512.png")
icon(192, 0.84).save("public/icon-192.png")
icon(180, 0.84).save("public/apple-touch-icon.png")
icon(512, 0.66).save("public/icon-maskable-512.png")


def mark(size):
    """Browser-tab icon: just "S." so it stays readable at 16-32 px."""
    im = Image.new("RGB", (size, size), NAVY)
    draw = ImageDraw.Draw(im)
    font = ImageFont.truetype(FONT, int(size * 0.95))
    l, t, r, b = draw.textbbox((0, 0), "S.", font=font)
    x = (size - (r - l)) // 2 - l
    y = (size - (b - t)) // 2 - t
    draw.text((x, y), "S", font=font, fill=IVORY)
    draw.text((x + draw.textlength("S", font=font), y), ".", font=font, fill=GOLD)
    return im


mark(256).save("app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
