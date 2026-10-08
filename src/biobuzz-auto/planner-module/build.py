"""Build the shareable files from src/.  Run:  python build.py"""
import os, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
SRC, DIST = os.path.join(HERE, "src"), os.path.join(HERE, "dist")
os.makedirs(DIST, exist_ok=True)
js = open(os.path.join(SRC, "biobuzz-planner.js"), encoding="utf-8").read()
css = open(os.path.join(SRC, "biobuzz-planner.css"), encoding="utf-8").read()
shutil.copy(os.path.join(SRC, "biobuzz-planner.js"), DIST)
shutil.copy(os.path.join(SRC, "biobuzz-planner.css"), DIST)
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">'
PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BIOBUZZ Auto Planner</title>
{fonts}
{css}
<style>html, body {{ margin: 0; }} #planner {{ min-height: 100vh; }}</style>
</head>
<body>
<div id="planner"></div>
{js}
<script>BiobuzzPlanner.mount('#planner');</script>
</body>
</html>
"""
# index.html: uses the two separate files (upload all three together)
open(os.path.join(DIST, "index.html"), "w", encoding="utf-8").write(PAGE.format(
    fonts=FONTS, css='<link rel="stylesheet" href="biobuzz-planner.css">', js='<script src="biobuzz-planner.js"></script>'))
# standalone: one file, everything inline
open(os.path.join(DIST, "biobuzz-planner-standalone.html"), "w", encoding="utf-8").write(PAGE.format(
    fonts=FONTS, css="<style>\n" + css + "</style>", js="<script>\n" + js.replace("</script", "<\\/script") + "</script>"))
print("built", sorted(os.listdir(DIST)))
