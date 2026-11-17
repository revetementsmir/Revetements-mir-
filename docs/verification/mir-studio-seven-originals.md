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

### Full production conversion checkpoint

Revision `f766cecf70edacc01a1e2ca7af4b04374e109381` reran all seven original
PDF imports and then the production targeted-reading pass followed by `P.build`.
All seven runs completed: 48 pages, 46 views, eight building candidates,
151 targeted regions and 148 returned OCR lines. **Zero of seven dossiers
produced a nonempty model on this stricter full conversion pass.** The older
direct-build baseline above must not be reused as a current success count.

| Private case | Full conversion at this checkpoint |
| --- | --- |
| D01 | Wall support, contour complexity and unsupported contour edges |
| D02 | Scale transcription uncertain; one draft without geometry |
| D03 | Unsupported contour edges |
| D04 | House scale unknown; secondary building has no associated floor source |
| D05 | Wall support unresolved; source excluded from calibration |
| D06 | Unsupported contour edges |
| D07 | Contradictory scale readings; one draft without geometry |

All scenes and confirmed quantities were empty. Empty exterior validation gates
do not prove geometric persistence. No final-model render was produced for this
checkpoint. Its exact-commit synthetic CI passed 32 Node suites, disposable SQL
contracts and the existing client browser contracts, including entrance finish
selection and reopen. Those synthetic successes do not validate the originals.

The next source pass reuses only these initial imported inventories and their
unchanged source JPEGs. It reruns targeted readings and reconstruction on a new
frozen revision. Its provenance must distinguish the import revision from the
conversion revision; it is not a fresh PDF re-import. Previous refined readings,
reconstruction results and scenes are not conversion inputs.

### First conversion-only result

Revision `a5f5f408abe92ea48705e9047478a8bf6b078eb6` completed all seven new
conversion calls from the initial `f766cec` imports. All source inventories
were unchanged before/after; 176 targeted regions returned 173 OCR lines.
One dossier, D02, produced a partial scene: 15 walls, 13 openings, two main
roofs and one flat entrance roof over three proposed levels. Both exterior
source checks passed against the original and refined inventories. No column,
beam or confirmed quantity was produced. This is not a browser save proof.

D04 reached `HEIGHT_UNKNOWN` after its scale was recovered; the secondary
building still lacks an associated floor source. The other five dossiers
retained their previous contour or reference conflicts. Inspection of D02's
production renders found a missing garage opening, simplified entrance door,
and absent entrance steps, visible foundation and basement openings. The
scene therefore does not establish complete source fidelity.

That revision's browser CI passed import/persistence and S2 contour checks,
then failed the unchanged contradictory-reference review test because the
new extent tolerance excluded the centreline of a thick wall stroke. Its
Node and SQL results do not substitute for a passing browser run. The
source-supported stroke-band correction described below requires a new
exact-revision browser and original-conversion pass.

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

Reconstruction can also match a dimension line interrupted by its own caption.
This opt-in path requires both observed collinear arms, bounded caption spacing,
two diagonal endpoint marks and perpendicular witnesses. Competing interrupted
or continuous associations remain unresolved. No source pixels are painted
across the text gap, and the historical importer keeps its default matcher.

A better reading of the same caption replaces the complete lower-quality
observation only when the value, caption position, source frame and endpoints
agree. Contradictory values remain separate. Rotated dimensions retain their
original-frame text boxes, line segments and endpoint witnesses.

Essential scale and level captions across contributing views receive the bounded
targeted-OCR budget before opening details. A split caption can be reread as a
whole only from its observed constituent words. Reliable readings are not
reread merely to manufacture consensus. The retry keeps its crop, source frame,
original text and confidence.

Marginal floor dimensions may establish scale when their actual source witness
strokes connect both endpoints to the observed floor contour. Full-span checks
require both endpoints to match the contour extremes within raster precision;
partial spans retain the independent-inscription requirement. Missing, coloured,
interrupted or foreign-source witnesses do not create that association.

The first exact-commit browser run of this stricter endpoint check found a
regression: dimension marks at a thick wall's centreline were discarded even
though they described the same wall. The corrected check can retain a bounded
offset only when the complete band between that mark and the contour edge is
observed wall ink. A nearby thin line or white gap is insufficient. Contradictory
captions both remain available for explicit reference review. The synthetic
browser test remains unchanged and must pass on the corrected revision.

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

When that historical thin-wall path finds no contour, a second bounded pass
can separate observed axial strokes within connected parallel wall skins.
Short transverse blocks can join the two skins into a component wider than
the historical filter; that does not justify replacing them with the white
centre of their bounding box. Retained axes use occupied source coordinates,
at least 94 percent exact stroke support and gaps no greater than two pixels.
The existing paired-corner, interior-network, source-edge and ambiguity checks
remain in force. Previously accepted thin and solid outlines stay unchanged.

A private replay recovered one main floor outline in D01; the other three
floor-outline failures remained. This is a contour proposal, not a four-level
building. Door openings, external structures and relative level registration
are separate unresolved questions; no level-alignment guard was removed.

The historical elevation detector is retained when successful. A fallback for
pale facades requires locally contrasting neutral strokes, paired side spines,
top/bottom support, material immediately inside both side boundaries, and an
observed interior opening frame outside known masks. Uniform colour fills,
partial title blocks and separated dimension rails cannot provide this proof.
An envelope remains separate from a source-supported level height.

### Door panels interrupted by an annotation

A narrow annotation can split a neutral door panel into separate raster
components, leaving the historical single-component frame check incomplete.
An additional proposed opening may join a large panel with a nearby aligned
strip only when four dark neutral frame edges and their corners support the
union. The annotation establishes the interruption only; it supplies no frame
edge. Missing or ambiguous boundaries and evidence of separate frames remain
reasons to refuse the union. Historical accepted openings remain available.

The proposal retains the original component boxes, observed gap and frame
support, attached to the source view and frame. Its position is still an
estimated calibrated opening. A raised entrance must not be moved to ground
level merely because its landing or steps have not been reconstructed.

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

## Fresh browser baseline at `683563c`

On 2026-11-17, the seven originals were imported through the real PDF form in
fresh Chromium contexts against frozen application revision
`683563c874bd60a00e4389ec7318eb3994ede92a`. All 392 served application asset
hashes matched that exact commit in each completed run. The C1–C7 aliases below
belong to this new private manifest; historical D01–D07 observations above are
retained as separate checkpoints.

This pass exercised the import-triggered conversion, including targeted local
OCR, without injecting a contour, calibration, height, orientation, opening or
model. All seven imports finished: **48 pages and 46 views**. The outcome was
**zero certified complete buildings, one partial model and six empty scenes**.
The strict recipe still required a model and the finish/reopen workflow for
every case; the six unresolved cases failed those requirements.

| Private case | Pages / views | Associated source levels | Walls / openings / roofs | Outcome / blocking observations | Total seconds |
| --- | --- | --- | --- | --- | ---: |
| C1 | 5 / 5 | Ground | 0 / 0 / 0 | `BOUNDARY_SOURCE_SUPPORT` | 69.795 |
| C2 | 5 / 5 | Ground | 0 / 0 / 0 | `BOUNDARY_SOURCE_SUPPORT` | 79.812 |
| C3 | 5 / 5 | Upper; lower facade/volume observations remain separate proposals | 15 / 14 / 2 | Partial proposal; main roof height conflict, masonry/foundation/occluded details unresolved | 116.875 |
| C4 | 5 / 5 | Upper only | 0 / 0 / 0 | `SCALE_TRANSCRIPTION_UNCERTAIN`; no ground floor implicitly confirmed | 80.295 |
| C5 | 5 / 5 | Ground only | 0 / 0 / 0 | `BOUNDARY_SOURCE_SUPPORT`; no upper floor invented | 84.894 |
| C6 | 6 / 10 | House ground; secondary floor view remains unassigned | 0 / 0 / 0 | Explicit house selection: `HEIGHT_UNKNOWN` | 91.034 |
| C7 | 17 / 11 | Numbered levels 0, 1, 2, 3 | 0 / 0 / 0 | Wall support, boundary complexity/support, reference conflict and level alignment unresolved | 475.887 |

C3 completed four actual rendered 3D angles, selection of a reconstructed wall,
a different material, confirmation and reload. Geometry, stable IDs, source
inventory, conversion report, original stored PDF bytes and finish assignment
were unchanged after reload. Its clean elevation contained no source raster.
The four captures were opened and inspected: the main roof is absent and the
upper envelope is open. The two produced roofs do not establish a complete
roof system, and this successful partial-model workflow is not a fidelity pass.

C6 also received a separate fresh import with an explicit secondary-building
selection (95.831 seconds). All ten views remained available; its five views on
the first page retained their 270-degree orientation and distinct building.
One is classified as a floor view but has no assigned level. The pipeline
returned `FLOOR_SOURCE_REQUIRED` with an empty scene; this is an association
failure, not evidence that the source document contains no floor drawing.

C7 did not generate any walls, including the two requested exterior walls under
the roof. No presence, polygonization, roof-intersection or material-persistence
success is claimed for those walls. Level-alignment and source checks remained
enabled throughout this baseline.

The completed runs recorded no page exception, failed application request or
external request. OCR warnings are retained privately. Sampled JavaScript heaps
were approximately 13–31 MB after import and 30–66 MB after conversion; C3 was
113 MB after reload. These are samples, not peak or total process-memory claims.
Times include local processing and may be affected by concurrent test work.

### Recipe corrections and evidence limits

The initial recipe could accept an asynchronous false terminal observation as
truthy with the installed Playwright polling implementation. A minimal browser
reproducer confirmed this before repair. Explicit bounded Node-side polling
now awaits the actual observation, including after reload. Tests cover false
observations, a deadline, rejected reads and never-resolving reads. Strict deep
comparisons now report concise hashes on failure instead of constructing huge
source-raster assertion diffs; their equality semantics are unchanged.

Premature initial failures, a later exit-137 memory interruption during C3's
reload, and one deliberately interrupted import remain in private evidence.
They are not classified as completed engine refusals. C3's successful result
above comes from a new original import with the repaired recipe.

Original screenshots and reports remain private. This baseline used Chromium
at 1440×1000 in FR-CA; it is not a physical phone, tablet or Samsung test, and
does not establish original-source FR/EN responsive acceptance. Synthetic
browser checks and later exact-head CI must be reported separately. Subsequent
recipe runs additionally require FR-CA/EN-CA at 390×844, 834×1112 and 1440×1000
with unchanged geometry/finishes and no horizontal overflow; those new checks
must not be retroactively attributed to this baseline.

A subsequent fresh C3 import against the same frozen `683563c` application
exercised those six language/viewport combinations after finish confirmation
and reload. It passed the stricter recipe in 112.343 seconds with the same
15-wall, 14-opening, two-roof partial model. All six combinations preserved the
model and inventory, rendered nonempty geometry and had no horizontal overflow.
Private screenshots from each combination were opened and inspected; the main
roof remains absent in every view. This establishes responsive handling of
that partial proposal in Chromium, not source fidelity or physical-device
acceptance. The other six original dossiers have no equivalent model workflow
because their baseline scenes are empty.


## Rejected registration candidate — 7d528bf

The fresh-form harness was rerun on all seven originals against frozen runtime
`7d528bfafed5a2e540e57885b8bc6d60faf9c64e`. All 48 pages imported, retaining
46 views. **Zero complete models, zero partial models and seven empty scenes**
were produced. This candidate is not accepted as preserving the original-source
workflow, regardless of its synthetic test results.

C3 regressed from the baseline 15 walls / 14 openings / 2 roofs to
`SCALE_TRANSCRIPTION_UNCERTAIN`. The imported views were identical; the new
calibration mark check rejected valid short ticks whose observed centres lay
slightly beside their sampled anchors. This failure is retained and requires a
new original-source run after correction, not a relaxed confidence threshold.

C7 imported 17 pages and 11 views in a complete 503.488-second run. All three
moving floor grids now match the reference grid with observed named axes. The
ambiguous first numeric marker remains excluded and its conflicting OCR reads
are saved. The reference-level contour is recovered, but its scale is unknown;
two other contours still fail source support/complexity and the highest floor's
scale transcription is uncertain. No wall, opening or roof is produced. The two
requested exterior walls under the roof therefore remain unproved.

The five other primary dossiers retain their baseline refusal categories. A
separate C6 secondary-building run preserves its five rotated views and now
correctly reports `FLOOR_LEVEL_REQUIRED` / “Ce plan de niveau reste à nommer.”;
it does not invent a floor assignment. No finish, reopen or responsive-model
workflow is credited to an empty scene. Terminal screenshots were inspected;
all original-source evidence remains private.

## Calibration-mark repair — b575832

A new C3 import against frozen runtime
`b575832cd36ad0fcdb5746d3afbf09214ab3e65a` restores the baseline **15 walls,
14 openings and two roofs**. The correction searches immediately beside a
sampled dimension anchor for its observed tick; it does not change the written
value, calibration anchors or confidence threshold. Orthogonal object corners
still fail the dimension-mark check.

The strict original-source recipe passes in 116.672 seconds: four 3D angles,
finish confirmation, save/reopen with identical model and inventory, and
FR-CA/EN-CA at 390×844, 834×1112 and 1440×1000. All 392 served resources match
this exact commit. Private captures were opened and inspected. Physical wall,
opening and roof geometry matches the baseline; calibration provenance now
also records the observed marks.

This remains **one partial model**: the main roof is still absent. This repair
was rerun on C3 only; the other six dossiers have no new result at this SHA.
The rejected seven-dossier candidate above remains part of the record.

## Source-reading and registration follow-up

The next candidate adds bounded re-reading from the retained PDF Blob with
local PDF.js and Tesseract. Its source hash, page, crop, rotation, scale and
pixel transforms are retained. A native OCR tile cannot replace a view from
another source file. Fragmented datum captions and neighbouring numerical
tokens are read together; the software never supplies a missing word or
separator. Ambiguous multi-value captions cannot calibrate a wall edge.

Independent source observations now support sliding-door interruptions,
faded dimension lines with real terminal ticks and witnesses, shared axes
between plans and elevations, and roof-slope/eave junctions. Coloured masks
cannot extend a roof slope. A ceiling height remains distinct from the
floor-to-floor interval. These changes preserve the earlier rejection of
unsupported geometry, calibration conflicts and existing-project changes.

Targeted source diagnostics and synthetic regressions support these rules.
They do not constitute a new seven-original recipe or certification of the
two requested exterior walls. New fresh-form results must be recorded against
the frozen candidate separately from the historical baselines above.

## Fresh original-source recipe — 4361019

All seven originals were imported again through the real form in fresh
Chromium contexts against the immutable application archive of
`4361019fadac8950f0abb7794d2c7a70cc81256a`. The 392 served application assets
matched that exact commit in both the six-case run and the separate C7 run.
These are new import-triggered conversions, without injected geometry,
dimensions, calibration, orientation, openings or a previously corrected model.
The historical results above remain separate checkpoints.

All **48 pages and 46 views** imported. The result is **zero certified complete
models, one partial model and six empty scenes**. The recipe retained
`requireModel: true` and `requireWorkflow: true` for every original: C3 passed
that partial-model workflow contract; the other six cases failed it. An empty
scene is not credited with a finish, reopen or responsive-model workflow.

| Private case | Pages / views | Associated source levels | Walls / openings / root roofs | Result / remaining blocker | Total seconds |
| --- | --- | --- | --- | --- | ---: |
| C1 | 5 / 5 | Ground | 0 / 0 / 0 | `BOUNDARY_SOURCE_SUPPORT` | 72.497 |
| C2 | 5 / 5 | Ground | 0 / 0 / 0 | `BOUNDARY_SOURCE_SUPPORT` | 93.714 |
| C3 | 5 / 5 | Upper; lower facade and secondary-volume geometry remain proposals | 15 / 15 / 3 | Partial model; roof registration and exterior details still require verification | 137.184 |
| C4 | 5 / 5 | Upper only | 0 / 0 / 0 | `SCALE_TRANSCRIPTION_UNCERTAIN`; no ground floor implicitly confirmed | 82.888 |
| C5 | 5 / 5 | Ground only | 0 / 0 / 0 | `BOUNDARY_SOURCE_SUPPORT`; no upper floor invented | 91.980 |
| C6 | 6 / 10 | House ground; secondary floor view remains unassigned | 0 / 0 / 0 | Explicit house selection: `HEIGHT_UNKNOWN` | 105.940 |
| C7 | 17 / 11 | Numbered levels 0, 1, 2, 3 | 0 / 0 / 0 | Four draft contours; `SCALE_UNKNOWN` on levels 0–2 and `LEVEL_ALIGNMENT_REQUIRED` | 557.452 |

C3 now produces the main roof, alongside the secondary-volume and flat-entry
roofs. Its three root roof records also contain one nested roof return; that
return is not counted as a fourth independent roof. Four actual rendered
angles were opened and inspected, followed by wall selection, a material
change, confirmation, save and reopen. The complete model, source inventory,
stored PDF bytes and finish assignment were preserved. Its reconstructed
elevation contains no source raster, and the building remains visible in 3D
without the PDF image.

FR-CA and EN-CA both passed at 390×844, 834×1112 and 1440×1000 with unchanged
geometry and finishes, nonempty rendered walls and no horizontal overflow.
The six private viewport captures were opened and inspected. These are
Chromium viewport emulations, not physical phone, tablet or Samsung tests.

This is still not a geometrically certified C3 conversion. A residual in the
main roof's vertical registration remains unconfirmed against the source.
Source-front/back comparison also leaves the rear secondary-volume door,
visible foundation and lower opening, steps and automatic masonry/material
extents unresolved. The proposal explicitly retains uncertain transcription,
occlusion and flat-entry construction details. A roof's presence and a passing
finish/reopen workflow do not establish its dimensional fidelity or confirmed
quantities.

C6 keeps the two buildings separate and retains all ten views. The five views
on its first page keep their 270-degree orientation, including a floor view
whose level is still unresolved. The house was selected explicitly through the
existing chooser. No secondary-building conversion or new secondary-building
workflow is claimed for this run.

C7 retains four draft contours but generates no wall, opening or roof. Levels
0, 1 and 2 lack an accepted calibration; the highest level retains an X/Y grid
alignment proposal, while common level alignment remains unresolved. The
alignment guard was not bypassed. Neither requested exterior wall under the
roof is demonstrated: presence, polygonization, roof intersections, independent
finishes and persistence of those walls remain unverified.

C1 was kept outside the tuning of this follow-up. It is an original already
tested in earlier checkpoints, not evidence from a previously unseen dossier.
None of these seven results establishes universal automatic conversion.
Application/network errors and sampled JavaScript heaps are recorded in the
private reports; memory samples are not peak or total process-memory claims.
CI and synthetic regression results must be reported separately from this
original-source recipe.

### Exact imported raster evidence

Intermediate source diagnostics used PNG rerenders from PDF.js at the recorded
view frames. Those PNGs are **not the JPEG rasters persisted by the real import**.
They must not substitute for those imported pixels when reproducing dimension
rails, contrast thresholds, contour decisions or model-generation success.
Diagnostic results are not promoted to fresh-form acceptance evidence.

The recipe now exports the exact persisted JPEG/PNG bytes one view at a time
before closing the browser context, without rendering or recompressing them.
A private manifest records each encoded raster's hash, MIME type, view/page,
frame and crop transform; generated artifact names do not contain client names.
Partial exports remain visible and an export error fails the recipe. Synthetic
helper tests cover byte preservation, MIME/base64 validation, output names,
non-overwrite and preservation of earlier evidence after a later failure.

The seven results at `4361019` predate this export addition. **The new exact-raster
export has not yet been exercised by a fresh original-PDF recipe.** Existing
private reports and rendered captures remain valid for the outcomes recorded
above, but they do not retroactively contain the discarded imported raster
bytes. No original, OCR text, client capture or source coordinates are included
in this public document or its fixtures.
