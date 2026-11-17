# Entrances: separate roofs, observed beam faces and source validation

## Problem and behavior

The exterior converter previously recognized paired posts but could stop before
their beam and roof. The preceding entrance patch added candidates from a
front beam guide and a lateral stroke. That evidence cannot establish a hip
roof's front slopes, eave overhangs, or a flat roof without posts.

The updated converter handles two distinct source configurations:

- **Post-supported entrance:** independently calibrated front and side roof
  profiles establish the roof surface. Eaves are observed separately from the
  posts. Front and side pitches remain independent. Closed, compatible beam
  bands produce the front facing and only the observed lateral returns.
- **Flat entrance roof:** a roof note must connect by a visible leader to a
  closed footprint in the registered floor plan. A front facing above an
  observed door and compatible lateral projections establish its placement.
  The full plan footprint remains distinct from the visible side overhang.
  This path does not create columns or a structural beam.

Both paths return separate reconstructed roofs through the shared 2D/3D model.
The earlier `roofProposals` result key remains a compatibility alias. The
earlier candidate helpers remain available, but a candidate does not by itself
establish complete roof geometry.

## Unknowns and exclusions

All extracted geometry remains proposed. Beam section depth and structural
material are unknown when only facing surfaces are observed. Flat-roof drainage
slope, internal section and hidden underside remain unknown; a horizontal
display envelope does not assert a measured zero drainage slope.

Observed fascia is rendered as an explicit face, without extruding its height
through an unmeasured section. Its colour is independent of roof covering and
uses the existing preview, cancel and confirm controls. The unresolved beam
section and flat-roof drainage note are available in French and English.

Missing or incompatible views, unrelated notes, colour annotations alone and
opaque nearer volumes cannot supply hidden geometry. In particular, a central
nearer wall can suppress the beam/roof even when both posts remain visible.
Existing reviewed geometry and finishes remain protected from regeneration.

## Source and persistence contracts

The atomic conversion save validates contributing views, building/level
ownership, source frames, bounded observations, calibration and actual
front/side directions. Flat roofs additionally validate the labelled floor
footprint, registration and agreement with the rendered extents. Fascia must
use its matching front source calibration and lie on the roof boundary.

Roof, extension, element and zone identifiers share a collision check, including
objects in preserved levels. Invalid sources or duplicate identifiers abort
the complete transaction. A finish selection does not confirm geometry or
produce final purchase quantities.

## Verification

The targeted Node suites exercise production raster detectors, geometry,
provenance, unknown sections, masking, compatibility and negative cases:

- `tests/mir-studio-entry-elements.cjs`
- `tests/mir-studio-entry-assemblies.cjs`
- `tests/mir-studio-flat-entry-roofs.cjs`
- `tests/mir-studio-exterior-integration.cjs`
- `tests/mir-studio-exterior-reconstruction.cjs`

`tests/mir-studio-entry-assemblies-browser.cjs` exercises actual IndexedDB
rollback/save, independent beam/roof/fascia choices, preview/cancel/confirm,
reopening, 3D pointer selection and FR/EN layouts at 390, 834 and 1440 pixels.
The Studio workflow runs it and uploads actual synthetic screenshots and
assertion results under `artifacts/studio-entry-assemblies/`, tied to its SHA.
Check the workflow for the exact revision being reviewed before claiming a
browser pass.

## Original-PDF gate

Synthetic contracts and manual source inspection are not successful original
PDF imports. The private annotated development PDFs have not completed a fresh
browser import → geometry → finish → reopen run in this environment. Local
Chromium cannot launch because the environment rejects its process socket.
The managed browser also cannot reach the local server.

Local source diagnostics retain unresolved registration, contour and OCR
evidence instead of substituting a template or using coloured markup as a
boundary. No original PDF, extracted text or client screenshot is included in
this repository or its CI artifacts. This change therefore does not establish
universal conversion accuracy or client-release readiness. The draft PR remains
the review target; production publication and merge are separate actions.
