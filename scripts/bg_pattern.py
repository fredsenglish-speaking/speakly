# Builds public/bg-pattern.svg and public/bg-pattern-dark.svg: common English
# abbreviations with their meaning ("BTW – by the way"), tiled faintly behind every page.
# Run: python3 scripts/bg_pattern.py
from xml.sax.saxutils import escape

PHRASES = [
    ("BTW", "by the way", 40, 70, -6),
    ("ASAP", "as soon as possible", 330, 50, 4),
    ("FYI", "for your information", 170, 175, 0),
    ("IMO", "in my opinion", 470, 205, -5),
    ("TBH", "to be honest", 30, 300, 3),
    ("e.g.", "for example", 290, 320, -3),
    ("DIY", "do it yourself", 120, 445, -4),
    ("i.e.", "that is", 420, 420, 5),
    ("P.S.", "postscript", 60, 570, 2),
    ("RSVP", "please reply", 300, 560, -2),
    ("ETA", "estimated time of arrival", 440, 640, -4),
    ("FAQ", "frequently asked questions", 150, 680, 3),
]


def svg(color, alpha):
    items = "".join(
        f"<g transform='translate({x} {y}) rotate({r})'>"
        f"<text font-family='Georgia,serif' font-size='34' font-weight='700'>{escape(a)}</text>"
        f"<text y='22' font-family='Helvetica,Arial,sans-serif' font-size='16'>{escape(m)}</text></g>"
        for a, m, x, y, r in PHRASES
    )
    return (
        "<svg xmlns='http://www.w3.org/2000/svg' width='640' height='720' viewBox='0 0 640 720'>"
        f"<g fill='{color}' opacity='{alpha}'>{items}</g></svg>"
    )


open("public/bg-pattern.svg", "w").write(svg("#082d97", 0.09))
open("public/bg-pattern-dark.svg", "w").write(svg("#ffffff", 0.06))
