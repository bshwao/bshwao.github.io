# Rounded hovering companions

Both Level 01 robots use the same authored rounded model: pearl-white shell, dark visor, cyan eyes, small hands and three hover rings. The moving robot glides and sways its arms; the desk robot reaches toward the keyboard. No leg geometry or other-floor residents were added.

- `check.txt`: 184 source/server tests and 77 module/reference checks pass.
- `geometry.txt`: 22 model/resident checks pass, including swept clearance and authored-color restoration.
- The five-mode `npm test` integration command completed with exit code 0 (desktop, mobile, reduced motion, deep link and no WebGL).
- `webgl-desktop.json`, `webgl-phone.json`, `webgl-landscape.json`: all 31 views pass, stable resources and disposal, zero idle frames when paused.
- `gallery.jpg`, `robots-detail.jpg`, `study.jpg`: native production screenshots.
- `diff-check.txt`: clean whitespace check.

The About interior uses 39,014 triangles and 29 draws in the source model; the full scene retains its prior draw budgets. The desk model's authored colors remain in its chair's existing batch and survive feedback/reset.
