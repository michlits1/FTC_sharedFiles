import sys
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.colors import Color, black, white

OUT = sys.argv[1]
RED = Color(0.70, 0.21, 0.17); RED_BG = Color(0.96, 0.87, 0.85)
BLUE = Color(0.14, 0.35, 0.65); BLUE_BG = Color(0.86, 0.90, 0.95)
POLLEN = Color(0.91, 0.76, 0.11); FLOWER = Color(0.24, 0.56, 0.29)

PW, PH = letter
GRID = Color(0.72, 0.86, 0.76)      # engineering-paper green
GRID_MAJOR = Color(0.55, 0.76, 0.62)
INK = Color(0.09, 0.13, 0.17)
LIGHT = Color(0.93, 0.95, 0.93)

c = canvas.Canvas(OUT, pagesize=letter)
c.setTitle("BIOBUZZ Auto: engineering paper set")

def paper(c):
    step = 0.25 * inch
    x = 0.5 * inch
    n = 0
    while x <= PW - 0.5 * inch + 0.01:
        c.setStrokeColor(GRID_MAJOR if n % 4 == 0 else GRID)
        c.setLineWidth(0.6 if n % 4 == 0 else 0.3)
        c.line(x, 0.5 * inch, x, PH - 0.5 * inch)
        x += step; n += 1
    y = 0.5 * inch
    n = 0
    while y <= PH - 0.5 * inch + 0.01:
        c.setStrokeColor(GRID_MAJOR if n % 4 == 0 else GRID)
        c.setLineWidth(0.6 if n % 4 == 0 else 0.3)
        c.line(0.5 * inch, y, PW - 0.5 * inch, y)
        y += step; n += 1

def titleblock(c, sheet, name):
    bx, by, bw, bh = PW - 0.5 * inch - 3.6 * inch, 0.5 * inch, 3.6 * inch, 0.75 * inch
    c.setFillColor(white); c.setStrokeColor(INK); c.setLineWidth(1.2)
    c.rect(bx, by, bw, bh, fill=1, stroke=1)
    c.line(bx, by + bh / 2, bx + bw, by + bh / 2)
    c.line(bx + 1.8 * inch, by, bx + 1.8 * inch, by + bh / 2)
    c.setFillColor(INK)
    c.setFont("Helvetica", 6.5)
    c.drawString(bx + 4, by + bh - 9, "TEAM")
    c.drawString(bx + 4, by + bh / 2 - 9, "DATE")
    c.drawString(bx + 1.8 * inch + 4, by + bh / 2 - 9, "SHEET")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(bx + 1.8 * inch + 4, by + 5, "%s of 4" % sheet)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(bx + 4, by + 5, name)

def heading(c, text, sub=None):
    c.setFillColor(white); c.setStrokeColor(white)
    c.rect(0.5 * inch, PH - 1.35 * inch, PW - 1.0 * inch, 0.85 * inch, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(0.65 * inch, PH - 0.95 * inch, text)
    if sub:
        c.setFont("Helvetica", 9.5)
        c.drawString(0.65 * inch, PH - 1.2 * inch, sub)
    c.setStrokeColor(INK); c.setLineWidth(1.5)
    c.line(0.5 * inch, PH - 1.35 * inch, PW - 0.5 * inch, PH - 1.35 * inch)

# ---------------- page 1: BIOBUZZ field ----------------
paper(c)
heading(c, "FIELD SHEET: BIOBUZZ AUTO", "Tiles are 24 in. Columns A-F left to right from the audience, rows 1-6 from the audience back. Small squares are 6 in.")
T = 1.05 * inch
fx = (PW - 6 * T) / 2
fy = PH - 1.85 * inch - 6 * T          # bottom edge (audience wall)
def tx(x): return fx + x * T
def ty(y): return fy + y * T            # y = 0 is row 1
c.setFillColor(white); c.rect(fx - 0.35 * inch, fy - 0.42 * inch, 6 * T + 0.7 * inch, 6 * T + 0.62 * inch, fill=1, stroke=0)
for x in range(6):
    for y in range(6):
        c.setFillColor(white if x <= 2 else Color(0.94, 0.95, 0.94))
        c.rect(tx(x), ty(y), T, T, fill=1, stroke=0)
        c.setStrokeColor(GRID); c.setLineWidth(0.3)
        for i in range(1, 4):
            c.line(tx(x) + i * T / 4, ty(y), tx(x) + i * T / 4, ty(y) + T)
            c.line(tx(x), ty(y) + i * T / 4, tx(x) + T, ty(y) + i * T / 4)
c.setStrokeColor(Color(0.6, 0.65, 0.63)); c.setLineWidth(0.9)
for i in range(7):
    c.line(tx(i), ty(0), tx(i), ty(6)); c.line(tx(0), ty(i), tx(6), ty(i))
c.setStrokeColor(INK); c.setLineWidth(1); c.setDash(5, 3); c.line(tx(3), ty(0), tx(3), ty(6)); c.setDash()
# loading zones (11 in deep against the side wall)
dz = T * 11 / 24
c.setFillColor(RED_BG); c.setStrokeColor(RED); c.setLineWidth(1.5); c.rect(tx(0), ty(4), dz, T, fill=1, stroke=1)
c.setFillColor(BLUE_BG); c.setStrokeColor(BLUE); c.rect(tx(6) - dz, ty(1), dz, T, fill=1, stroke=1)
c.setFillColor(RED); c.setFont("Helvetica-Bold", 6.5)
c.drawString(tx(0) + dz + 3, ty(4) + T / 2 + 2, "LOADING"); c.drawString(tx(0) + dz + 3, ty(4) + T / 2 - 6, "ZONE  PARK +5")
# gardens
c.setFillColor(RED); c.rect(tx(0), ty(0), T, 3, fill=1, stroke=0)
c.setFillColor(BLUE); c.rect(tx(5), ty(6) - 3, T, 3, fill=1, stroke=0)
for i in range(4):
    c.setFillColor(POLLEN); c.setStrokeColor(INK); c.setLineWidth(0.6)
    c.circle(tx(0) + 9 + i * 15, ty(0) + 11, 5.5, fill=1, stroke=1)
    c.circle(tx(5) + 9 + i * 15, ty(6) - 11, 5.5, fill=1, stroke=1)
c.setFillColor(RED); c.setFont("Helvetica-Bold", 6.5); c.drawString(tx(0) + 4, ty(0) + 22, "GARDEN")
# hive
c.setFillColor(RED); c.setStrokeColor(INK); c.setLineWidth(1.2); c.rect(tx(2), ty(2), T, 2 * T, fill=1, stroke=1)
c.setFillColor(BLUE); c.rect(tx(3), ty(2), T, 2 * T, fill=1, stroke=1)
c.setFillColor(white); c.setFont("Helvetica-Bold", 9)
c.drawCentredString(tx(2) + T / 2, ty(3) + 10, "RED"); c.drawCentredString(tx(2) + T / 2, ty(3) - 2, "HIVE")
c.drawCentredString(tx(3) + T / 2, ty(3) + 10, "BLUE"); c.drawCentredString(tx(3) + T / 2, ty(3) - 2, "HIVE")
# flowers (approximate positions)
def flower(cx, cy, dim=False):
    c.setFillColor(FLOWER if not dim else Color(0.62, 0.78, 0.64)); c.setStrokeColor(INK); c.setLineWidth(0.8)
    c.circle(cx, cy, 8, fill=1, stroke=1)
    c.setFillColor(white); c.setFont("Helvetica-Bold", 7); c.drawCentredString(cx, cy - 2.5, "4")
flower(tx(0) + 7, ty(2)); flower(tx(2), ty(6) - 7); flower(tx(6) - 7, ty(4), True); flower(tx(4), ty(0) + 7, True)
# perimeter and labels
c.setStrokeColor(INK); c.setLineWidth(2.5); c.rect(tx(0), ty(0), 6 * T, 6 * T, fill=0, stroke=1)
c.setFillColor(INK); c.setFont("Courier-Bold", 10)
for x in range(6): c.drawCentredString(tx(x) + T / 2, ty(0) - 13, "ABCDEF"[x])
for y in range(6): c.drawRightString(tx(0) - 6, ty(y) + T / 2 - 3, str(y + 1))
c.setFont("Helvetica-Bold", 8); c.drawCentredString(tx(3), ty(0) - 26, "AUDIENCE")
c.setFillColor(RED); c.drawCentredString(tx(1.5), ty(6) + 5, "RED SIDE (A-C)"); c.setFillColor(BLUE); c.drawCentredString(tx(4.5), ty(6) + 5, "BLUE SIDE (D-F)")
ytxt = ty(0) - 0.62 * inch
c.setFillColor(white); c.rect(0.5 * inch, ytxt - 1.05 * inch, PW - 1.0 * inch, 1.2 * inch, fill=1, stroke=0)
c.setFillColor(INK); c.setFont("Helvetica", 9)
lines = [
    "AUTO is 30 s. Start with 4 POLLEN, touching a red-side wall, not in the LOADING ZONE, not touching a FLOWER.",
    "Start tiles that qualify in the planner: A4, A6, B1, C1. Pick a facing too: N (away from the audience), E, S or W.",
    "Points: HIVE TIP +20 each (first tip about 4 POLLEN, later tips about 8). PARK in the LOADING ZONE +5. LEAVE your start tile +3.",
    "POLLEN pickups: red GARDEN (A1, 4) and the FLOWERS (4 each). A launch only goes in when the robot faces straight at the red HIVE.",
    "FLOWER positions are approximate. Check them against the real field and move them on this sheet if they differ.",
    "Commands: Move forward / backward (tiles), Rotate left / right (degrees in 90s), Intake POLLEN (count), Launch POLLEN (count).",
]
for i, t in enumerate(lines): c.drawString(0.65 * inch, ytxt - i * 13, t)
titleblock(c, 1, "FIELD")
c.showPage()

# ---------------- page 2: plan ----------------
paper(c)
heading(c, "PLAN SHEET", "Think first. Pencil only. Nothing here needs code.")
def box(x, y, w, h, fill=white):
    c.setFillColor(fill); c.setStrokeColor(INK); c.setLineWidth(1)
    c.rect(x, y, w, h, fill=1, stroke=1)
def lbl(x, y, text, size=8.5, bold=True):
    font = "Helvetica-Bold" if bold else "Helvetica"
    w = c.stringWidth(text, font, size)
    c.setFillColor(white)
    c.rect(x - 2, y - 2.5, w + 4, size + 3, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont(font, size)
    c.drawString(x, y, text)
L, Wd = 0.6 * inch, PW - 1.2 * inch
y = PH - 1.65 * inch
lbl(L, y, "1. GOAL: what is the most you can realistically score, and why?")
box(L, y - 0.75 * inch, Wd, 0.65 * inch)
y -= 1.0 * inch
lbl(L, y, "2. OBJECTIVES: list everything on the field worth doing.")
colw = [3.0 * inch, 1.0 * inch, 1.5 * inch, Wd - 5.5 * inch]
heads = ["Objective", "Points", "Est. seconds", "Order"]
rh = 0.32 * inch
tx = L; ty = y - 0.1 * inch
box(L, ty - rh, Wd, rh, LIGHT)
xx = L
for w_, h_ in zip(colw, heads):
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 8)
    c.drawString(xx + 4, ty - rh + 10, h_)
    xx += w_
for i in range(7):
    box(L, ty - rh * (i + 2), Wd, rh)
xx = L
for w_ in colw[:-1]:
    xx += w_
    c.setStrokeColor(INK); c.setLineWidth(0.8)
    c.line(xx, ty, xx, ty - rh * 8)
y = ty - rh * 8 - 0.3 * inch
lbl(L, y, "3. RISKS: what could waste time, miss the HIVE, or get the robot stuck?")
box(L, y - 0.7 * inch, Wd, 0.6 * inch)
y -= 0.95 * inch
lbl(L, y, "4. APPROACH: say your plan in one or two sentences.")
box(L, y - 0.65 * inch, Wd, 0.55 * inch)
y -= 0.95 * inch
lbl(L, y, "5. PREDICTION: write these down BEFORE you run anything.")
bw_ = 2.4 * inch
box(L, y - 0.6 * inch, bw_, 0.5 * inch)
lbl(L + 5, y - 0.2 * inch, "Predicted points", 7.5, False)
box(L + bw_ + 0.2 * inch, y - 0.6 * inch, bw_, 0.5 * inch)
lbl(L + bw_ + 0.2 * inch + 5, y - 0.2 * inch, "Predicted seconds used (of 30)", 7.5, False)
box(L + 2 * (bw_ + 0.2 * inch), y - 0.6 * inch, bw_ - 0.3 * inch, 0.5 * inch)
lbl(L + 2 * (bw_ + 0.2 * inch) + 5, y - 0.2 * inch, "Actual (fill in after)", 7.5, False)
titleblock(c, 2, "PLAN")
c.showPage()

# ---------------- page 3: route log ----------------
paper(c)
heading(c, "ROUTE SHEET", "One command per row, same as the planner. Track the tile, facing, POLLEN held and the clock after each row.")
cols = ["#", "Command", "Value", "Tile", "Facing", "Held", "Clock"]
cw = [0.3 * inch, 1.05 * inch, 0.45 * inch, 0.4 * inch, 0.45 * inch, 0.4 * inch, 0.45 * inch]
tblw = sum(cw)
rh = 0.29 * inch
top = PH - 1.65 * inch
for block in range(2):
    bx = 0.55 * inch + block * (tblw + 0.2 * inch)
    box(bx, top - rh, tblw, rh, LIGHT)
    xx = bx
    for w_, h_ in zip(cw, cols):
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 7.5)
        c.drawString(xx + 3, top - rh + 7, h_)
        xx += w_
    for i in range(20):
        box(bx, top - rh * (i + 2), tblw, rh)
        c.setFillColor(INK); c.setFont("Courier", 7.5)
        c.drawString(bx + 3, top - rh * (i + 2) + 7, str(block * 20 + i + 1))
    xx = bx
    for w_ in cw[:-1]:
        xx += w_
        c.setStrokeColor(INK); c.setLineWidth(0.6)
        c.line(xx, top, xx, top - rh * 21)
sx = 0.6 * inch + 2 * (tblw + 0.35 * inch) - 0.1 * inch
c.setFillColor(INK); c.setFont("Helvetica", 8)
titleblock(c, 3, "ROUTE")
c.showPage()

# ---------------- page 4: blank ----------------
paper(c)
heading(c, "BLANK ENGINEERING PAPER", "Draw the field yourself, sketch routes, work out distances, or try a different idea.")
titleblock(c, 4, "SKETCH")
c.showPage()
c.save()
print("wrote", OUT)
