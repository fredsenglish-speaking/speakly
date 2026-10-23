# Builds public/bg-pattern.svg and public/bg-pattern-dark.svg: faint line drawings of
# London and New York landmarks with small UK and US flags, tiled behind every page.
def svg(line, alpha_lines, alpha_flags):
    L = f"stroke='{line}' stroke-width='3' fill='none' stroke-linejoin='round' stroke-linecap='round' opacity='{alpha_lines}'"
    big_ben = f"""<g {L}>
<path d='M95 30 L78 92 H112 Z'/><path d='M95 30 V18'/>
<rect x='76' y='92' width='38' height='34'/>
<rect x='70' y='126' width='50' height='190'/>
<circle cx='95' cy='152' r='17'/><path d='M95 152 V141 M95 152 L103 156'/>
<path d='M70 180 H120 M82 196 V300 M95 196 V300 M108 196 V300 M70 316 H120'/>
</g>"""
    liberty = f"""<g {L}>
<path d='M440 318 L448 268 H502 L510 318 Z'/>
<path d='M452 268 L462 160 Q475 150 488 160 L498 268'/>
<circle cx='475' cy='142' r='11'/>
<path d='M464 134 L456 124 M470 131 L468 119 M475 131 V117 M480 131 L482 119 M486 134 L494 124'/>
<path d='M486 162 L506 92'/><path d='M500 92 H512 L509 84 H503 Z'/><path d='M506 84 Q500 72 506 64 Q512 72 506 84'/>
<rect x='452' y='176' width='14' height='24' transform='rotate(-12 459 188)'/>
<path d='M466 200 Q475 230 470 268 M484 200 Q480 235 488 268'/>
</g>"""
    eye = f"""<g {L}>
<circle cx='215' cy='390' r='62'/><circle cx='215' cy='390' r='8'/>
""" + "".join(f"<path d='M215 390 L{215+62*c:.0f} {390+62*s:.0f}'/>" for c, s in [(1,0),(0.707,0.707),(0,1),(-0.707,0.707),(-1,0),(-0.707,-0.707),(0,-1),(0.707,-0.707)]) + \
        "".join(f"<circle cx='{215+68*c:.0f}' cy='{390+68*s:.0f}' r='5'/>" for c, s in [(1,0),(0.866,0.5),(0.5,0.866),(0,1),(-0.5,0.866),(-0.866,0.5),(-1,0),(-0.866,-0.5),(-0.5,-0.866),(0,-1),(0.5,-0.866),(0.866,-0.5)]) + \
        "<path d='M215 390 L180 478 M215 390 L250 478 M165 478 H265'/></g>"
    bridge = f"""<g {L}>
<path d='M345 440 V560 M385 440 V560 M465 440 V560 M505 440 V560'/>
<path d='M345 440 L365 410 L385 440 Z M465 440 L485 410 L505 440 Z'/>
<path d='M385 452 H465 M385 462 H465'/>
<path d='M300 510 H570'/>
<path d='M300 510 Q325 470 345 450 M385 450 Q425 500 465 450 M505 450 Q545 470 570 510'/>
<path d='M300 575 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0'/>
</g>"""
    uk = f"""<g transform='translate(240 64)' opacity='{alpha_flags}'>
<clipPath id='uk'><rect width='90' height='54' rx='4'/></clipPath>
<g clip-path='url(#uk)'>
<rect width='90' height='54' fill='#012169'/>
<path d='M0 0 L90 54 M90 0 L0 54' stroke='#fff' stroke-width='11'/>
<path d='M0 0 L90 54 M90 0 L0 54' stroke='#C8102E' stroke-width='4'/>
<path d='M45 0 V54 M0 27 H90' stroke='#fff' stroke-width='17'/>
<path d='M45 0 V54 M0 27 H90' stroke='#C8102E' stroke-width='10'/>
</g></g>"""
    stripes = "".join(f"<rect y='{i*54/13:.2f}' width='90' height='{54/13:.2f}' fill='#B22234'/>" for i in range(0, 13, 2))
    stars = "".join(f"<circle cx='{4+c*6.5:.1f}' cy='{3.5+r*5.3:.1f}' r='1.3' fill='#fff'/>" for r in range(5) for c in range(6))
    us = f"""<g transform='translate(300 236)' opacity='{alpha_flags}'>
<clipPath id='us'><rect width='90' height='54' rx='4'/></clipPath>
<g clip-path='url(#us)'><rect width='90' height='54' fill='#fff'/>{stripes}<rect width='40' height='29' fill='#3C3B6E'/>{stars}</g></g>"""
    return f"<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'>{big_ben}{liberty}{eye}{bridge}{uk}{us}</svg>"

open("public/bg-pattern.svg", "w").write(svg("#082d97", 0.09, 0.12))
open("public/bg-pattern-dark.svg", "w").write(svg("#ffffff", 0.06, 0.1))
