# Builds the app icons and favicon from the Speakly logo: the cap-and-book emblem on ivory.
# Run: python3 scripts/app_icons.py speakly-logo.png  (the full logo with transparent background; needs Pillow)
import sys
from PIL import Image

IVORY = (247, 243, 234)

logo = Image.open(sys.argv[1] if len(sys.argv) > 1 else "speakly-logo.png").convert("RGBA")
logo = logo.crop(logo.getbbox())
# The emblem ends at the first empty column before the word "Speakly".
alpha = logo.getchannel("A")
cut = next(x for x in range(200, logo.width) if alpha.crop((x, 0, x + 1, logo.height)).getextrema()[1] < 10)
emblem = logo.crop((0, 0, cut, logo.height))
emblem = emblem.crop(emblem.getbbox())


def icon(size, share):
    """share: part of the square the emblem may fill (maskable icons need a safe margin)."""
    im = Image.new("RGB", (size, size), IVORY)
    scale = size * share / max(emblem.size)
    e = emblem.resize((round(emblem.width * scale), round(emblem.height * scale)), Image.LANCZOS)
    im.paste(e, ((size - e.width) // 2, (size - e.height) // 2), e)
    return im


icon(512, 0.74).save("public/icon-512.png")
icon(192, 0.74).save("public/icon-192.png")
icon(180, 0.74).save("public/apple-touch-icon.png")
icon(512, 0.58).save("public/icon-maskable-512.png")
icon(256, 0.92).save("app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
