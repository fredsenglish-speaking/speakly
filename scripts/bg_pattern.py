# Builds public/bg-pattern.svg and public/bg-pattern-dark.svg: common English
# abbreviations with their meaning ("BTW – by the way"), tiled faintly and densely
# behind every page. Run: python3 scripts/bg_pattern.py
from xml.sax.saxutils import escape

PHRASES = [
    ("BTW", "by the way"), ("ASAP", "as soon as possible"), ("FYI", "for your information"), ("IMO", "in my opinion"),
    ("TBH", "to be honest"), ("e.g.", "for example"), ("DIY", "do it yourself"), ("i.e.", "that is"),
    ("P.S.", "postscript"), ("RSVP", "please reply"), ("ETA", "arrival time"), ("FAQ", "common questions"),
    ("AKA", "also known as"), ("TBC", "to be confirmed"), ("ID", "identity"), ("etc.", "and so on"),
    ("vs", "versus"), ("Mr", "mister"), ("Dr", "doctor"), ("a.m.", "morning"),
    ("p.m.", "afternoon"), ("TBA", "to be announced"), ("N/A", "not available"), ("VIP", "very important person"),
    ("DOB", "date of birth"), ("THX", "thanks"), ("OMG", "oh my god"), ("LOL", "laughing out loud"),
]
COLS, ROWS, CELL_W, CELL_H = 4, 7, 170, 92
TILTS = [-5, 3, -2, 4, -4, 2, 0]


def svg(color, alpha):
    items = []
    for i, (a, m) in enumerate(PHRASES):
        row, col = divmod(i, COLS)
        x = col * CELL_W + (12 if row % 2 else 40)
        y = row * CELL_H + 40
        tilt = TILTS[(row + col) % len(TILTS)]
        items.append(
            f"<g transform='translate({x} {y}) rotate({tilt})'>"
            f"<text font-family='Georgia,serif' font-size='28' font-weight='700'>{escape(a)}</text>"
            f"<text y='20' font-family='Helvetica,Arial,sans-serif' font-size='14'>{escape(m)}</text></g>"
        )
    w, h = COLS * CELL_W, ROWS * CELL_H
    return (
        f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'>"
        f"<g fill='{color}' opacity='{alpha}'>{''.join(items)}</g></svg>"
    )


open("public/bg-pattern.svg", "w").write(svg("#0b1f4d", 0.115))
open("public/bg-pattern-dark.svg", "w").write(svg("#d4af6a", 0.07))
