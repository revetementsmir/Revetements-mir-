# Seven original PDF dossiers: cold import and reconstruction evidence

## 2026-11-17 resumption: secondary roofs remain under verification

The resumed work starts from pushed revision `888b322`; it does not recover or
claim validation of the stopped session's unpushed local changes. PR 44 remains
a draft. D01 still requires source verification of its entrance roofs, patio
roof returns, lower rear roofs and the two requested exterior walls. Automatic
conversion is implemented; a complete faithful D01 reconstruction is **not**
demonstrated by this checkpoint.

The reading-priority correction at `d2290c0` preserves the main 42/64-region
budget and the fundamental level/dimension regions. On the same privately
retained D01 import, this recovers seven level-caption readings but leaves no
roof-grid regions in the saturated main queue. A separately bounded phase now
allows up to 24 missing floor/roof grid regions after that queue. It uses the
same detector, OCR acceptance rules, conflict handling and source frames; it
does not infer labels from their order. Successful, failed and contradictory
attempts are retained, and identical regions are not read twice in one refined
inventory.

The geometry changes add two source-dependent paths:

- Registered entrance assemblies are evaluated after the full level stack.
  Each contributing elevation needs its own labelled axes and observed datum
  pair. Ambiguous side-depth associations and components outside the receiving
  wall's level or extent remain unresolved.
- Roof-plan hips and ridges can locate returns outside the occupied-floor
  contour. A component also needs two orthogonal elevation profiles and a
  source-supported join to the parent roof. The plan never supplies an invented
  height. The parent profile is preserved; lower roofs and ambiguous ownership
  require their own association instead of a flat filler.

New roof-return provenance uses `roofPlanEvidence`, separate from the existing
flat-entry `planEvidence` contract. Persistence validates the proposed levels
together and keeps regional readings with their proposals while preserving
the original imported source views. Source/frame/profile mismatches and loss
of an established component's evidence are rejected; finishes remain editable.

Synthetic tests cover four roof-return directions, three asymmetric returns,
real raster/profile detection, observed joints, contradictory elevations,
registered entrances on different levels, source-label persistence, bounded
reading schedules, cancellation and the existing flat-entry geometry. The
new browser storage test exercises the real IndexedDB transaction and reopen
path in CI; local Node results are not a substitute for that browser gate.

The private Node replay of D01 imports all 17 pages and identifies 11 views.
Both frozen `888b322` and `d2290c0` produce unresolved geometry in this runtime,
with scale-reference conflicts and subsequent level-registration refusal. A
separate private-house Node baseline is also unresolved at unchanged `888b322`.
These results differ from the earlier Chromium receipt and therefore do not
establish a regression caused by this change, preservation of original visual
fidelity, or a new success count. The fallback uses actual production modules,
PDF.js, Tesseract and a Node canvas/transport adapter; browser execution, the
private originals and synthetic regression evidence remain distinct.

No private PDF, OCR transcription, raster, source fingerprint or source
coordinates are committed. The historical checkpoints below retain their
original execution boundaries and must not be presented as verification of
the current branch head.

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

## First four-level workflow — dd63c82

Fresh form imports against immutable runtime
`dd63c822323f4a4f592803a5a2eba8da19f6b917` again process all 48 pages and
46 views. **Zero certified complete models, two partial models and five empty
scenes** result. Every case retains the strict nonempty-model and complete
workflow requirements. C3 and C7 pass that workflow; the five empty cases fail.

| Case | Pages / views | Walls / openings / root roofs | Actual outcome | Seconds |
| --- | --- | --- | --- | ---: |
| C1 | 5 / 5 | 0 / 0 / 0 | Boundary source support unresolved; reserved from this tuning | 74.252 |
| C2 | 5 / 5 | 0 / 0 / 0 | Contour recovered; scale transcription remains uncertain | 88.661 |
| C3 | 5 / 5 | 15 / 15 / 3 | Partial; four angles, finish, save/reopen and six FR/EN viewports pass | 137.691 |
| C4 | 5 / 5 | 0 / 0 / 0 | Scale unknown; upper-only source retained | 79.098 |
| C5 | 5 / 5 | 0 / 0 / 0 | Boundary source support unresolved | 100.028 |
| C6 | 6 / 10 | 0 / 0 / 0 | House height unknown; buildings remain separate | 93.116 |
| C7 | 17 / 11 | 16 / 33 / 0 | First partial four-level model and complete finish/reopen workflow | 700.176 |

C7's independent floor references and named grids now establish proposed X/Y/Z
registration for levels 0–3. The complete geometry and selected finish survive
save/reopen. Four rendered angles and FR-CA/EN-CA at 390/834/1440 are exercised;
the building remains visible without the PDF raster. These are Chromium
viewport tests, not physical devices. The recorded JavaScript heap samples
are approximately 36 MB after import, 244 MB after model generation and 224 MB
after reopen; they are not peaks or total browser memory.

C7 is **not faithful or complete**. No roof or balcony is generated. Source
comparison identifies incorrectly joined lower-floor window proposals and
missing openings. Four main-contour walls exist on the highest level, but that
count does not demonstrate the two specifically requested exterior walls or
their roof junctions. Those targets remain unverified. C3 retains the earlier
exterior-detail and vertical-calibration limitations; its nested roof return
is still not counted as a fourth independent roof.

All 392 served assets match this exact commit for both runs. The new evidence
export also passes on the originals: all 46 persisted JPEG rasters are retained
privately with verified byte hashes, MIME type, dimensions, source frames,
orientation and crop metadata. This is the first checkpoint with those exact
saved image bytes, distinct from earlier PNG diagnostic rerenders. No private
source image, OCR or client geometry is included in this report or the CI.

The exact-commit Studio CI run
[44104725280](https://github.com/revetementsmir/Revetements-mir-/actions/runs/44104725280)
passes its Node, disposable SQL and synthetic browser contracts. That CI does
not certify the two original-source partial models or the missing roof walls.

## Native-reading persistence regression — 93a6d0b

The next original-source runs against
`93a6d0bf561ebbc1f00ea872e7d946b9c83408ca` were deliberately interrupted.
The native horizontal/vertical evidence producers supplied `textBox`, while
the existing atomic reconstruction store requires a finite four-coordinate
`box` for every reading. This producer/store mismatch can reject the result;
the original recipe previously kept waiting for a terminal persisted report.

C2 completed its source import before interruption. C7 was interrupted during
its run. Neither interruption is a completed geometry recipe or proof of a
particular visible product refusal. The other five cases were not executed on
this revision. The accepted seven-case matrix remains the `dd63c82` matrix
above; no model or workflow success is inferred from these interrupted runs.

The correction copies each producer's actual source text box into its evidence
record. It does not relax the store validation. A synthetic browser test checks
both real producers through IndexedDB, save/reopen, unchanged sources/settings,
and atomic refusal of missing boxes and foreign source IDs. The private recipe
now reports an explicit failure when an observed running conversion returns to
idle without a persisted terminal report; it cannot turn that state into a
successful conversion. A fresh original-source run is still required after
these corrections.

## Seven fresh imports — 202d4f1, rejected C7 regression

All seven originals were imported again through the real form using immutable
runtime `202d4f180082e86db13883a78a7f3fcfed377807`. All 48 pages and 46 views
were imported. The native-reading transaction failure is corrected, but the
result is still **zero certified complete models, two partial models and five
empty scenes**. C7 regresses from its earlier partial model to no model. This
checkpoint is not accepted as a faithful reconstruction delivery.

| Case | Pages / views | Walls / openings / root roofs | Actual outcome | Seconds |
| --- | --- | --- | --- | ---: |
| C1 | 5 / 5 | 0 / 0 / 0 | Boundary support unresolved; reserved from rule tuning | 89.635 |
| C2 | 5 / 5 | 0 / 0 / 0 | Scale recovered; false wall-top association creates a height conflict | 96.398 |
| C3 | 5 / 5 | 15 / 15 / 3 | Partial, ten source masonry regions; workflow passes | 145.475 |
| C4 | 5 / 5 | 8 / 15 / 1 | Partial; two wall-texture cells misclassified as windows; workflow passes | 137.071 |
| C5 | 5 / 5 | 0 / 0 / 0 | Boundary support unresolved | 112.714 |
| C6 | 6 / 10 | 0 / 0 / 0 | House height unknown; shed remains separate | 96.833 |
| C7 | 17 / 11 | 0 / 0 / 0 | Regression: reference conflicts on levels 0/2, vertical datum conflicts on levels 1/3 | 583.832 |

C3 and C4 pass four angles, finish selection/confirmation, unchanged geometry
and choices after reopen, and six FR/EN viewports. Those renders were opened
and compared with the original source views. C3 masonry remains fragmentary;
foundation and steps are absent, and roof junctions still require comparison.
C4 lacks its entrance roof, has an isolated column, and retains false opening
proposals. Its upper-only source never becomes a confirmed supplied ground
floor. These are incomplete models despite the successful persistence tests.

C7 imports in 461.287 seconds and converts in 122.205 seconds. Its visible
refusal capture was opened. No C7 rotation, finish or reopen success is claimed
on this head; the empty model fails the unchanged recipe requirements. The
earlier `dd63c82` C7 workflow remains a historical partial result only.

Both runs serve the 392 assets matching this exact commit. All 46 persisted
JPEG exports pass byte-hash, MIME, dimension, frame and permission checks.
Private visual review opens all four angles and six viewports of C3/C4 and the
failed cases' terminal captures. No physical-device certification is implied.
All 16 GitHub workflows succeed, including [Studio run 44113627273](https://github.com/revetementsmir/Revetements-mir-/actions/runs/44113627273).
That green CI does not override the real C7 regression or the visible geometry
errors. Subsequent diagnostic replays are recorded privately and must not be
substituted for a new form-import recipe.

## Seven fresh imports — 1fe9e57

Immutable runtime `1fe9e570fdf90ec22ff8f8d506e3e0dd183cbb4c` imports all
48 pages and 46 views through the real form. The strict nonempty-model and
finish/save/reopen assertions remain unchanged. Results: **zero certified
complete models, four partial models and three empty scenes**. No geometry,
contour, orientation, height or dimension was injected into any recipe.

| Case | Pages / views | Walls / openings / root roofs | Actual outcome | Seconds |
| --- | --- | --- | --- | ---: |
| C1 | 5 / 5 | 0 / 0 / 0 | Boundary support unresolved; reserved from this rule tuning | 87.348 |
| C2 | 5 / 5 | 10 / 8 / 1 | First partial model and full workflow; garage door and exterior details missing | 114.057 |
| C3 | 5 / 5 | 15 / 15 / 3 | Partial; ten masonry regions and earlier roof components preserved | 140.069 |
| C4 | 5 / 5 | 8 / 13 / 1 | Partial; two false texture-cell openings removed; entrance roof still missing | 126.936 |
| C5 | 5 / 5 | 0 / 0 / 0 | Eight-sided contour recovered; height remains unknown | 136.774 |
| C6 | 6 / 10 | 0 / 0 / 0 | House height unknown; house and shed remain separate | 106.005 |
| C7 | 17 / 11 | 16 / 43 / 1 | Four levels and main roof recovered; full workflow, incomplete rear envelope | 727.660 |

C2/C3/C4/C7 pass four 3D angles, wall selection, finish confirmation, identical
geometry and choices after reopening, and FR-CA/EN-CA at 390/834/1440. Their
source-independent renders were opened. Viewports are Chromium emulation,
not physical-device certification. C3/C4 retain upper-only source plans;
additional observed lower surfaces do not become confirmed supplied floors.
C1 was withheld from tuning in this follow-up, but was historically inspected;
it is not presented as an entirely unseen document.

C7 imports in 432.827 seconds and converts in 131.020 seconds. JavaScript heap
samples are 30.6 MB after import, 345.4 MB after generation and 68.1 MB after
reopen, not peaks or total browser memory. The registered four-level contour
now produces walls again, and the main roof is visible. Its rear upper levels
still lack openings; balconies, secondary roofs, masonry and the specifically
requested under-roof walls are not demonstrated. A four-wall upper contour
does not prove those target walls or their roof intersections.

The common fixes preserve actual dashed wall-top guides, reject caption
fragments as independent scale readings, retain imprecise short endpoint
measurements without treating them as exact contradictory scales, and select
the local vertical datum reference without depending on floor iteration order.
Actual incompatible observations still refuse registration. Source-backed
corner openings recover the C5 contour, while C4 texture-cell ambiguities
remain recorded instead of becoming windows.

All 392 served assets match this exact commit in both runs. All 46 persisted
JPEG source exports pass byte-hash, MIME, frame, dimensions and private-permission
checks. No client source, OCR, geometry or capture is published. The 79 Node
suites and all 16 GitHub workflows pass, including [Studio run44118529526](https://github.com/revetementsmir/Revetements-mir-/actions/runs/44118529526).
These checks do not certify source fidelity. Further local changes and source
replays must receive a new exact-revision form-import recipe.
