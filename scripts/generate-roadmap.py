"""Generate the vertical, mobile-first 'How to become a private chef' roadmap SVG.

The source artwork is a wide winding road, which is unreadable on a phone: at
390 CSS pixels the step text lands around 4px. This lays the same seven steps on
a road that runs top-to-bottom instead, so the natural scroll direction IS the
direction of travel. Text is hand-wrapped here because SVG has no reflow.
"""

W = 480
ROAD_X = 46           # centre line of the road
CONTENT_X = 98
CONTENT_W = 360

FOREST = "#1c4b3d"
INK = "#1a1a17"
INK_MUTED = "#5c5850"
CREAM = "#f4efe2"
SAGE_PALE = "#e8ecdd"
ROAD = "#b9bfae"
WHITE = "#ffffff"

FONT = "'Inter','Helvetica Neue',Helvetica,Arial,sans-serif"


def wrap(text, size, width, bold=False):
    """Greedy wrap using an average glyph-width estimate for the font size."""
    per_char = size * (0.545 if bold else 0.515)
    max_chars = max(8, int(width / per_char))
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if len(trial) <= max_chars:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


STEPS = [
    {
        "title": "Get 3–5 years of restaurant experience",
        "body": "Master cooking techniques, organization, time management, and running your station.",
        "grad": [
            "Are proficient in cooking techniques",
            "Can stay organized juggling multiple tasks",
            "Have good time management",
            "Can confidently run your station without supervision",
        ],
        "numbered": True,
    },
    {
        "title": "Reach out to your whole network",
        "body": "Instagram, your contacts, Facebook. Find the people who are interested in private chef services.",
        "grad": ["You've started having real conversations with potential clients."],
        "numbered": False,
    },
    {
        "title": "Book your first dinner with someone you know",
        "body": "Charge only for groceries. This service is about buying experience.",
        "grad": ["You've successfully completed your first service."],
        "numbered": False,
    },
    {
        "title": "Document everything with photos and video",
        "body": "Build a portfolio that shows what you can do.",
        "grad": ["A stranger could look at your portfolio and confidently hire you."],
        "numbered": False,
    },
    {
        "title": "Repeat at least five more times before charging",
        "body": "The goal is six successful dinners total.",
        "grad": ["You've completed six successful dinners."],
        "numbered": False,
    },
    {
        "title": "Keep booking clients and delivering",
        "body": "Deliver amazing experiences until referrals drive your business.",
        "grad": ["Referrals become your primary source of new business."],
        "numbered": False,
    },
    {
        "title": "Use private chef agencies to expand your reach",
        "body": "Grow with agencies while you keep building your own client base.",
        "grad": [
            "You've built enough momentum to grow with private chef agencies while continuing your own client base.",
        ],
        "numbered": False,
    },
]

TITLE_SIZE, TITLE_LH = 19, 25
BODY_SIZE, BODY_LH = 15.5, 21
GRAD_SIZE, GRAD_LH = 14, 19
GRAD_PAD = 14
STEP_GAP = 34

# ---------------------------------------------------------------- measure pass
for s in STEPS:
    s["title_lines"] = wrap(s["title"], TITLE_SIZE, CONTENT_W, bold=True)
    s["body_lines"] = wrap(s["body"], BODY_SIZE, CONTENT_W)
    grad_lines = []
    if s["numbered"]:
        for i, item in enumerate(s["grad"], 1):
            sub = wrap(item, GRAD_SIZE, CONTENT_W - 2 * GRAD_PAD - 18)
            grad_lines.append((f"{i}.", sub[0]))
            grad_lines.extend((None, x) for x in sub[1:])
    else:
        for item in s["grad"]:
            grad_lines.extend((None, x) for x in wrap(item, GRAD_SIZE, CONTENT_W - 2 * GRAD_PAD))
    s["grad_lines"] = grad_lines
    # label row + lines + padding top/bottom
    s["grad_h"] = GRAD_PAD + 15 + 8 + len(grad_lines) * GRAD_LH + GRAD_PAD - 4
    s["h"] = (
        len(s["title_lines"]) * TITLE_LH
        + 6
        + len(s["body_lines"]) * BODY_LH
        + 12
        + s["grad_h"]
    )

HEADER_H = 268
FOOTER_H = 176
y = HEADER_H
for s in STEPS:
    s["y"] = y
    y += s["h"] + STEP_GAP
TOTAL_H = int(y + FOOTER_H)

out = []
a = out.append

a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {TOTAL_H}" '
  f'width="100%" role="img" aria-labelledby="rm-title rm-desc" '
  f'preserveAspectRatio="xMidYMin meet" font-family="{FONT}">')
a('<title id="rm-title">How to become a private chef: a 7-step roadmap</title>')
a('<desc id="rm-desc">A seven-step roadmap from restaurant kitchens to paid private '
  'clients, with the graduation criteria for each step.</desc>')

a(f'<rect width="{W}" height="{TOTAL_H}" fill="{CREAM}"/>')

# ------------------------------------------------------------------- the road
road_top = 246
road_bottom = TOTAL_H - FOOTER_H + 26
seg = (road_bottom - road_top) / 8.0
d = [f"M {ROAD_X} {road_top:.0f}"]
for i in range(8):
    y0 = road_top + seg * i
    y1 = y0 + seg
    bend = 16 if i % 2 == 0 else -16
    d.append(f"C {ROAD_X + bend} {y0 + seg * 0.33:.0f} {ROAD_X + bend} {y1 - seg * 0.33:.0f} {ROAD_X} {y1:.0f}")
path = " ".join(d)
a(f'<path d="{path}" fill="none" stroke="{ROAD}" stroke-width="30" stroke-linecap="round"/>')
a(f'<path d="{path}" fill="none" stroke="{WHITE}" stroke-width="2.5" '
  f'stroke-dasharray="9 11" stroke-linecap="round" opacity="0.9"/>')

# ---------------------------------------------------------------------- header
a(f'<text x="{CONTENT_X - 52}" y="60" font-size="15" font-weight="600" fill="{INK}" '
  f'letter-spacing="2.4">HOW TO BECOME A</text>')
a(f'<text x="{CONTENT_X - 54}" y="112" font-size="46" font-weight="800" fill="{FOREST}" '
  f'letter-spacing="-0.8">Private Chef</text>')
for i, line in enumerate(wrap(
        "A 7-step roadmap from restaurant kitchens to paid private clients", 17, 340)):
    a(f'<text x="{CONTENT_X - 54}" y="{146 + i * 23}" font-size="17" fill="{INK_MUTED}">{esc(line)}</text>')
# Right-aligned, clear of the road that starts just below the rule.
a(f'<text x="{W - 24}" y="214" font-size="14" font-weight="700" text-anchor="end" '
  f'fill="{FOREST}" letter-spacing="0.6">@jordanchanners</text>')
a(f'<line x1="{CONTENT_X - 54}" y1="232" x2="{W - 24}" y2="232" '
  f'stroke="{FOREST}" stroke-width="1.5" opacity="0.35"/>')

# ----------------------------------------------------------------------- steps
for idx, s in enumerate(STEPS, 1):
    top = s["y"]
    a(f'<g>')
    # marker sits on the road, aligned to the first line of the title
    my = top + 4
    a(f'<circle cx="{ROAD_X}" cy="{my}" r="20" fill="{FOREST}"/>')
    a(f'<circle cx="{ROAD_X}" cy="{my}" r="20" fill="none" stroke="{CREAM}" stroke-width="3"/>')
    a(f'<text x="{ROAD_X}" y="{my + 7.5}" font-size="20" font-weight="800" fill="{CREAM}" '
      f'text-anchor="middle">{idx}</text>')

    cy = top
    for line in s["title_lines"]:
        cy += TITLE_LH
        a(f'<text x="{CONTENT_X}" y="{cy - 6}" font-size="{TITLE_SIZE}" font-weight="700" '
          f'fill="{INK}">{esc(line)}</text>')
    cy += 6
    for line in s["body_lines"]:
        cy += BODY_LH
        a(f'<text x="{CONTENT_X}" y="{cy - 6}" font-size="{BODY_SIZE}" fill="{INK_MUTED}">{esc(line)}</text>')
    cy += 12

    gh = s["grad_h"]
    a(f'<rect x="{CONTENT_X}" y="{cy}" width="{CONTENT_W}" height="{gh}" rx="12" fill="{SAGE_PALE}"/>')
    a(f'<rect x="{CONTENT_X}" y="{cy}" width="4" height="{gh}" rx="2" fill="{FOREST}" opacity="0.55"/>')
    a(f'<text x="{CONTENT_X + GRAD_PAD}" y="{cy + GRAD_PAD + 11}" font-size="11" font-weight="700" '
      f'fill="{FOREST}" letter-spacing="1.5">GRADUATE WHEN</text>')
    gy = cy + GRAD_PAD + 11 + 8
    for marker, line in s["grad_lines"]:
        gy += GRAD_LH
        if marker:
            a(f'<text x="{CONTENT_X + GRAD_PAD}" y="{gy}" font-size="{GRAD_SIZE}" font-weight="700" '
              f'fill="{FOREST}">{marker}</text>')
        x = CONTENT_X + GRAD_PAD + (18 if s["numbered"] else 0)
        a(f'<text x="{x}" y="{gy}" font-size="{GRAD_SIZE}" fill="{FOREST}">{esc(line)}</text>')
    a('</g>')

# ---------------------------------------------------------------------- footer
fy = TOTAL_H - FOOTER_H + 62
a(f'<circle cx="{ROAD_X}" cy="{road_bottom}" r="9" fill="{FOREST}"/>')
a(f'<line x1="{CONTENT_X - 54}" y1="{fy - 46}" x2="{W - 24}" y2="{fy - 46}" '
  f'stroke="{FOREST}" stroke-width="1.5" opacity="0.35"/>')
for i, line in enumerate(wrap(
        "Build experience first, then turn it into a referral-driven private chef business",
        19, 372, bold=True)):
    a(f'<text x="{CONTENT_X - 54}" y="{fy + i * 26}" font-size="19" font-weight="700" '
      f'fill="{FOREST}">{esc(line)}</text>')
a(f'<text x="{CONTENT_X - 54}" y="{TOTAL_H - 30}" font-size="13" fill="{INK_MUTED}">'
  f'Brigade. Mentorship for private chefs.</text>')

a('</svg>')

svg = "\n".join(out)
import pathlib
p = pathlib.Path("apps/web/public/roadmap/private-chef-roadmap.svg")
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(svg)
print(f"wrote {p} — {W}x{TOTAL_H}, {len(svg)} bytes")
