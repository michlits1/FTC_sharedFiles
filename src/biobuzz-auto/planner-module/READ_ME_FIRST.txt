SOURCE CODE REVIEW: BIOBUZZ AUTO PLANNER
========================================

The whole planner is in src/biobuzz-planner.js (JavaScript) and
src/biobuzz-planner.css (colors and layout). Reading it is a way to see how
someone turned a written rulebook into a program. Treat it like a design
review: does the code do what the rules say? Where did the author simplify?

A READING ORDER FOR src/biobuzz-planner.js  (search for these names)
  1. The comment at the top     How a website uses the planner, and its options.
  2. var PTS, ASSUME, FIELD     THE RULES AS DATA: points, guesses, where things are.
     validStarts()              Which tiles the starting rule (G304) allows.
                                Question: which numbers came from the manual,
                                and which are guesses?
  3. function simulate()        The heart of it. One pass down the route sheet,
                                tracking position, facing, POLLEN held and the clock.
                                Question: what happens when a move hits the HIVE?
                                When time runs out?
  4. function fieldSvg()        Draws the field. py() flips y so row 1 (the
                                audience side) is at the bottom of the picture.
  5. predictView(), programView(), replayView(), rulesView()   The four tabs.
  6. addEventListener(...)      Buttons, typing and playback (the "events").
  7. function mount()           At the very bottom: how a web page starts a planner.

THINGS TO TRY (in a copy, never the original)
  - Change ASSUME.firstTip from 4 to 3. Does your best route change?
  - Move a FLOWER with the `flowers` option in examples/embed-example.html.
    Which start tiles does validStarts() allow now?
  - Find the code that decides whether a launch is "aimed". Could you write a
    better rule? What would you need to know about the real launcher?

After editing src/, run:  python build.py
