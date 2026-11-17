# Seven original PDF dossiers: cold import and reconstruction evidence

## Scope

The client goal is an automatic PDF-to-building proposal that includes entrance
roofs and visible exterior components, followed by the existing finish-selection
and saved-project flow. This report separates actual original-source processing
from synthetic browser tests. An import count is not a fidelity score, and a
nonempty proposal is not a complete or confirmed building.

The seven private dossiers are identified here only as D01–D07. No original PDF,
OCR text, source image, client screenshot, filename, or source fingerprint is
included in the repository or CI artifacts. D05 was held out until its first
cold run finished; its source geometry was not used to tune the corrections.

## Cold baseline

The frozen source revision is
`54954347e19e323a91918035a33fb9d492dfbc0e`. All seven PDFs were passed through the
production import implementation, including its page/view detector and OCR.
All 48 pages finished processing and 46 views were identified. No calibration,
view title, footprint, height, or entrance geometry was injected into an input.
The baseline then called `P.build` directly. The UI's conversion also performs
`MIRReconstructionReadings.refine` before that call; this additional targeted
OCR pass was not part of the baseline. The table therefore describes initial
import plus direct geometry, not the complete client conversion sequence.

| Private case | Pages | Views | Buildings | Walls / openings / roofs | Baseline reconstruction |
| --- | ---: | ---: | ---: | --- | --- |
| D01 | 17 | 11 | 1 | 0 / 0 / 0 | Wall support, boundary complexity and level alignment unresolved |
| D02 | 5 | 5 | 1 | 15 / 13 / 2 | Partial main building; flat entrance not reconstructed |
| D03 | 5 | 5 | 1 | 0 / 0 / 0 | Dimension cycle and height unresolved |
| D04 | 6 | 10 | 2 | 0 / 0 / 0 | House wall support unresolved; secondary building has no associated floor level |
| D05 | 5 | 5 | 1 | 0 / 0 / 0 | Wall support unresolved; held-out first run |
| D06 | 5 | 5 | 1 | 0 / 0 / 0 | Scale unresolved |
| D07 | 5 | 5 | 1 | 8 / 12 / 1 | Partial main building; entrance not reconstructed |

All seven imports completed without a runtime failure. Only two dossiers had
nonempty geometry at baseline. None produced confirmed purchase quantities.
D04 retained its two separate building candidates and no active selection;
diagnostic per-building runs do not constitute a client building selection.

### Execution boundary

The private adapter executes the exact frozen production importer and the
vendored PDF.js 6.5.438 and Tesseract browser bundle/worker/core/language assets.
The Node worker transport permits only local vendor resources and denies
external requests. A minimal export/progress adapter exposes the importer;
it does not replace its detection or reconstruction algorithms.

The raster surface is `@napi-rs/canvas` 0.1.100, not Chromium Canvas. Standard
runtime compatibility shims and a requestAnimationFrame scheduling adapter
are recorded with hashes. The source revision, module hashes, vendor hashes,
input bytes, extracted inventories, OCR results and per-building reports are
retained privately. Early adapter-startup failures are distinct from the seven
completed source runs.

This is **not** proof of a browser upload, IndexedDB transaction, finish choice,
or reopen workflow on the originals. Chromium cannot launch in the local
environment and the managed browser cannot reach its local server. Synthetic
browser CI remains a separate, exact-commit gate.

## Corrections supported by the original-source investigation

### Flat entrance footprint and fascia

The flat-roof path can use a fully closed observed footprint, or observed rear
attachment/eave boundaries with collinear partial sides. A written-depth path
retains the actual inscription and its source anchors, including a contiguous
two-dimension chain. A separate pixel-estimate path requires compatible front,
left and right observations. It never labels the estimated depth as a written
dimension and never supplies an unreadable numeric inscription.

Front fascia detection checks its real vertical ends even when the horizontal
strokes continue into neighboring drawing marks. Source/world facade direction
and the dominant facade span now remain consistent for stepped walls. The
full footprint and the overhang visible beyond a facing wall remain distinct.

Persistence validation checks the source frames, raw label evidence, anchored
depth or estimated-boundary method, completed collinear segments, scale,
registration and independent side-view directions. Missing or tampered evidence
is rejected before the atomic save. Drainage slope, concealed roof section and
underside remain unknown where the drawings do not establish them.

### Entrance with a partially hidden post

Source silhouettes establish the entrance roof's front slopes, ridge corners,
eaves and independent lateral profiles. Post tracking stops at its visible
foot rather than following a neighboring dimension line. A post can start on
an observed raised landing without being snapped to the foundation base.

If an annotation hides one front foot, the other visible front foot can support
the lateral comparison. The fully observed roof may then survive with an
explicit `partial-unresolved` support status. No hidden post is mirrored or
completed, and an unobserved beam section is not invented. An annotation over
the roof itself and a nearer occluding volume still reject the roof.

### Source dimensions

Short detail dimension lines use their requested span threshold while retaining
the endpoint and inscription checks. A two-sided diagonal drafting tick takes
priority over a nearby long appliance or wall line; an ordinary thick crossing
does not acquire a fabricated tick.

Two distinct reliable partial inscriptions can calibrate their own floor view.
They do not become the whole building width. Duplicate OCR of one caption,
unrelated details/views, uncertain readings and reliable scale conflicts are
handled separately. Unrelated page-wide calibration is not silently mixed into
the associated pair. Decimal-looking annotations do not acquire feet/inches
units. Low-confidence OCR remains in the contour evidence and review message
but cannot impose an exact dimension cycle. Reliable contradictory dimensions
continue to block the adjustment.

### Thin source walls and pale elevations

Axis consolidation now retains one copy of a repeated corner before removing
collinear points. Each final floor edge is compared to the source strokes;
an unsupported closing diagonal is rejected. Thin rectangular enclosures can
be recovered from four observed outer/inner wall corners, four supported sides
and an internal wall network in both directions. Crossing dimension rails,
labelled notes/tables and competing disjoint enclosures do not establish a
building. Open or more complex thin contours remain unresolved.

The historical elevation detector is retained when successful. A fallback for
pale facades requires locally contrasting neutral strokes, paired side spines,
top/bottom support, material immediately inside both side boundaries, and an
observed interior opening frame outside known masks. Uniform colour fills,
partial title blocks and separated dimension rails cannot provide this proof.
An envelope remains separate from a source-supported level height.

## Review limits

The seven-case baseline uncovered additional contour and elevation-registration
failures that synthetic entrance fixtures did not expose. In particular, thin
walls can disappear during erosion, an open door can let a filled region follow
interior furniture, and a simplified outline can contain an unsupported
diagonal. Raising a point limit or accepting a bounding rectangle is not a
valid correction for those failures.

Multi-level dossiers still require source-supported level identity, scale,
vertical datums and relative placement. A level-alignment guard must not be
removed merely to produce a nonempty scene. Remaining failures and unknown
parts must stay visible in the proposal and in the acceptance report.

The PR remains a draft review target. These results do not establish universal
PDF conversion, complete exterior quantities, or release readiness for all
clients. The existing client finish/reopen contracts must be rerun in synthetic
browser CI on the exact integrated revision; an original browser acceptance
run remains a separate missing proof.
