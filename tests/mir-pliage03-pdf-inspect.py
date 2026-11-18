"""Inspect the PDF actually downloaded by the local Chromium fixture test."""
from pathlib import Path
import json
import math
import os
import re
import fitz

root = Path(__file__).resolve().parents[1]
folder = Path(os.environ.get("MIR_PLIAGE03_OUT", root / "docs/verification/pliage03-20261118")) / "pdf"
document = fitz.open(folder / "MIR-QA-local-deux-faces.pdf")
assert len(document) == 2, "The two fixture pieces must produce two PDF pages"
expected = [
    {"face": 1, "quantity": 2, "colour": "Blanc Pur 30", "code": "431", "angles": ["150°", "90°"]},
    {"face": 2, "quantity": 3, "colour": "Amande", "code": "432", "angles": ["134.5°", "112.75°"]},
]


def same_colour(actual, expected):
    return actual and all(abs(actual[i] - expected[i] / 255) < 0.025 for i in range(3))


def endpoints(item):
    if item[0] == "l":
        return item[1], item[2]
    if item[0] == "c":
        return item[1], item[4]
    raise AssertionError(f"Unexpected blue path primitive: {item[0]}")


pages = []
for index, page in enumerate(document):
    text = page.get_text()
    normalized = re.sub(r"\s+", " ", text).strip()
    current = expected[index]
    phrases = [
        "Gentek Canada", current["colour"], "Code " + current["code"],
        "Produit : Gentek — Feuille peinte aluminium 3037, 24 po × 98,5 pi",
        "Référence produit : gentek-coil-3037",
        f'{current["quantity"]} pièce(s)', "120 po", "A = 5 po", "B = 3 po", "C = 2 po",
        "Pli A–B = " + current["angles"][0], "Pli B–C = " + current["angles"][1],
        f'Face colorée : Face {current["face"]} — côté indiqué par le liseré bleu',
        "Fixture fictive. Aucun dossier utilisateur, aucune commande, aucun envoi.",
        "Aucun stock ou prix MIR confirmé.", f'M00{index + 1} · QA fictif — oblique face {index + 1}',
    ]
    for phrase in phrases:
        assert phrase in normalized, f"Missing PDF text on page {index + 1}: {phrase}"
    drawings = page.get_drawings()
    blue = [row for row in drawings if same_colour(row.get("color"), [23, 91, 148])]
    base = [row for row in drawings if same_colour(row.get("color"), [48, 75, 61]) and row["width"] > 4]
    assert len(blue) == 1, "Exactly one continuous blue face path must be present"
    assert len(base) == 1, "Exactly one native section path must be present"
    parts = blue[0]["items"]
    assert len(parts) >= 3 and not blue[0]["closePath"]
    for previous, following in zip(parts, parts[1:]):
        a, b = endpoints(previous)[1], endpoints(following)[0]
        assert math.hypot(a.x - b.x, a.y - b.y) < 0.001, "Blue path must have no gap"
    start = endpoints(parts[0])[0]
    base_start = endpoints(base[0]["items"][0])[0]
    offset = start.y - base_start.y
    assert offset < 0 if index == 0 else offset > 0, "Chosen faces must be on opposite physical sides"
    image = f"page-{index + 1}.png"
    page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).save(folder / image)
    (folder / f"page-{index + 1}.txt").write_text(text)
    pages.append({"page": index + 1, "size": list(page.rect), "text": text, "checkedText": phrases,
                  "bluePaths": 1, "continuousBluePath": True, "bluePathSegments": len(parts),
                  "firstSegmentSideOffsetPt": offset, "image": image,
                  "productIdPrinted": "gentek-coil-3037" in text or "3037" in text})

assert abs(abs(pages[0]["firstSegmentSideOffsetPt"]) - abs(pages[1]["firstSegmentSideOffsetPt"])) < 0.001
result = {"passed": True, "fixture": True, "customerData": False, "tool": "PyMuPDF", "version": fitz.VersionBind,
          "pageCount": len(document), "pages": pages,
          "productReferences": "Original product name and internal product reference are printed in paginated details; the product ID is not presented as a manufacturer code."}
(folder / "pdf-inspection.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print("PASS downloaded PDF: two pages, exact text, quantities, interior angles, continuous blue paths on opposite physical sides.")
