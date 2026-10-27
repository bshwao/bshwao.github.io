"""Assemble actual browser captures for the local interior surface review."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
views = json.loads((root / "views.json").read_text(encoding="utf-8"))
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 17)
title_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 27)
for section in dict.fromkeys(row["section"] for row in views):
    rows = [row for row in views if row["section"] == section]
    room_count = len({row["room"] for row in rows if row["room"] is not None})
    sheet = Image.new("RGB", (1800, 84 + (room_count + 1) * 390), "#f2eee5")
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 15), f"{section.upper()} — actual WebGL surface review", font=title_font, fill="#273b35")
    draw.text((20, 53), "Whole floor and four orbital angles per room · daylight · overhead navigation", font=font, fill="#273b35")
    for row in rows:
        if row["room"] is None:
            x, y = 0, 84
        else:
            x, y = (row["angle"] - 1) * 450, 84 + (row["room"] + 1) * 390
        with Image.open(root / "raw" / f"view-{row['index']:02d}.png") as image:
            crop = image.crop((0, 48, 920, 768)).convert("RGB")
            crop.thumbnail((440, 350), Image.Resampling.LANCZOS)
            sheet.paste(crop, (x + 5, y + 30))
        label = row["label"].split(" · ", 1)[-1]
        draw.text((x + 8, y + 6), label, font=font, fill="#273b35")
    sheet.save(root / f"{section}-review.jpg", quality=92)
