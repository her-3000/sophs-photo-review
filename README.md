# Sophie's V1 · mobile photo review

Current checkpoint: **1.0.5**, 2 October 2026. This section supersedes the historical UI descriptions below.

Models use Keep, Favourite, Reject and Labels below each photo. Labels starts with multi-choice categories; More categories and More details are optional. Category filters accept multiple choices and remember them across preview refreshes. Automatic preview refresh waits while an editor is open.

Detail menus have clear grey chevrons, readable choices and a fixed Save footer. **Clothing style:** Not sure, Casual, Swimwear, Activewear, Streetwear, Runway wear, Gowns and Other. Old garment values are retained internally for compatibility and are not offered in the menu. Gowns uses the existing stored style identifier, so no saved record needs a migration.

Local review: `http://127.0.0.1:4188/`. Read-only responsive preview: `http://127.0.0.1:4191/preview` (iPhone, iPad, desktop). Review records, original photos, uploads and videos stay local; GitHub holds code/setup/illustrations only.

Verified: mobile menu shows Gowns; category/style selection works; six isolated persistence/profile checks and JavaScript syntax pass. Physical devices remain untested. Existing private photo choices were not changed by this checkpoint.

## Earlier checkpoints and verification history

# SOPHS Photo Review · v1.0.2

Private, local photo selection and job-focused labels. Same interface for Sophie, an example collection and each new model. Python standard library plus HTML/CSS/JavaScript; no package installation or build step.

## Versions

- **Sophie:** `python3 server.py` → http://127.0.0.1:4188/ . Uses the existing OS archive and choices. In a clean checkout without that archive it opens an empty Sophie collection.
- **Generic:** `python3 server.py --profile profiles/example.json --port 4189` → http://127.0.0.1:4189/ . Heading is **Example photos**. In OS it references five existing Sophie sample photos without copying originals. A clean checkout uses five explicitly labelled illustrative SVG placeholders instead.
- **New model:** `python3 create_model.py mina "Mina"`, then `python3 server.py --profile profiles/mina.json --port 4190`. Starts with **Mina’s photos**, an empty collection and independent uploads, links and choices. The helper refuses to overwrite an existing model. This is a setup action after joining, not an automatic website signup integration.

Keep one server process/port per model collection. To reuse a collection later, run the same profile again. Do not point multiple profiles at the same data folder.

- **Live responsive preview:** `python3 preview.py` → http://127.0.0.1:4191/preview . Read-only computer/iPad/iPhone views refresh together after source edits. Each scrolls independently. Edit real photos on the main 4188 page.

## What is saved in GitHub

The code, design, responsive preview, example illustrations, starter profiles and setup/verification instructions. Original photos, selections, label suggestions, uploaded files, videos and live model records stay local in OS and are excluded. GitHub is the code backup; it is not a backup of private photo originals. Keep the existing local original and selection backups.

In OS the source lives in `Work/Meridian Group/SOPHS Models/comp-cards/sophie-photo-review`. Sophie’s archive is its sibling `sophie-images/facebook-archive`, with `INDEX.csv` referencing the original files. It remains read-only. New collections save under `model-data/<slug>/` in this source folder. Profiles can change `archive`, `data_dir`, `name`, `title` and `initial_view` (`all`, `keep`, `favourite`, `unreviewed`, `reject`). Paths are relative to the app folder unless absolute. Copy a profile and assign a unique data directory; never copy Sophie’s choices into another model.

For a checkout elsewhere, point the Sophie profile to the existing OS archive/data folders. Set `SOPHS_REVIEW_ASSETS` to the existing SOPHS `assets` directory to reuse the approved SM-26 PNG and lightweight application video. Assets normally resolve two levels above this app in OS. Without them, the page uses a clearly documented SVG brand approximation and hides the absent video; no broken media requests. The supplied original MOV is never served. There are no remote media fetches.

## Included interface

Centred brand/upload folder and English/Thai introduction; purple stamp lettering, yellow marker highlights, compact silent application demo when local assets exist, reduced-motion and pause control; sliding photo views, all matching photos on one page with lazy loading; category/detail filters, keep/favourite/reversible rejection, batch/individual shot labels, full-size viewing, and automatic choice saves. The download link is removed; `/api/export` remains available for an explicit backup. Clear save feedback appears only after the local save succeeds.

The introduction and custom-comp-card photo instructions support English/Thai. Mobile filters share a row; photo actions have 44px touch targets. The label editor scrolls within its own body while keeping Save labels visible. The local demo stays 240px on desktop/iPad and 214px on mobile.

Private original uploads accept JPG/PNG/WebP up to 25 MB each, preserve bytes and skip SHA256 duplicates. Links are stored as references; the server does not download them. Choices are atomic JSON saves and separate from originals. New uploads begin unreviewed. A keep or label is not approval to publish or use campaign rights.

## Access and operation

Loopback only; exact Host and mutation Origin checks, file allowlists and CSP. This is a private review tool, not a multi-user hosted platform. Do not expose it on a public interface. No authentication, cloud storage, casting submission, payment implementation or signup synchronization has been added. The 20-minute application caption is an operational target, not measured performance. Commercial copy records Callum’s intended offer: 30% on SOPHS-arranged work, model share within 24 hours after job completion; self-found/self-arranged work keeps 100%; existing agency agreements must permit participation; no lock-in.

## Verify

`python3 -m unittest discover -s tests` and `node --check app.js`.

v1 checked in the Codex browser for Sophie’s unchanged 527-photo/296-kept collection, the generic example heading/photos, separate storage and upload dialog. Python checks exercise isolated profiles, own-name rendering/escaping, original-byte upload, deduplication, save/export isolation and local access boundaries. Private records and originals are not committed.

## v1.0.1 checkpoint · 2 October 2026

Smaller mobile spacing and supporting copy, an explicit custom-comp-card photo workflow, responsive filters/actions, persistent save feedback, and a fixed label-editor footer. Original stamp/folder/logo colours retained. Live Codex checks covered 1440×1000, 820×1180 and 390×844 previews, category filtering, English/Thai help and the phone label editor. Keep and label changes survived reload in an isolated example collection; no console errors observed. Four isolated Python tests and JavaScript syntax passed. Sophie’s saved choices/suggestions remain byte-identical to the v1 baseline. Physical devices and a real signup-to-comp-card flow are not yet verified.

## v1.0.2 checkpoint · 2 October 2026

Upload folder now lives with the custom-comp-card photo instructions. A following yellow Apply changes link jumps to the gallery footer without leaving the page, including srcdoc device previews. The footer button stays disabled until every photo is kept/favourited/rejected and all saves finish. It applies existing saved label suggestions to kept photos, preserves confirmed labels, notes and decisions, and reports missing suggestions. Candidates remain unconfirmed; this does not run fresh AI inference for new uploads. Repeated applications are idempotent. No new dependency or external photo transmission.

Five isolated Python checks passed, including incomplete-review rejection, confirmed/rejected-photo preservation, successful suggestion persistence and repeat application. Live Sophie button returned zero changes and 296 confirmed photos preserved; original choice/suggestion hashes match v1. Three viewport folder-dialog and anchor interactions passed. Latest new screenshot capture failed after successful DOM checks; earlier captures show the layout. Physical devices are untested.

## 1.0.3 · Review polish

English/Thai guidance asks models to correct AI categories and choose personal favourites. Apply changes uses the main site’s dark glass pill with a yellow arrow. Photos display with rounded edges, no surrounding mat or rotation, while retaining the whole image. Saves and label application behavior remain unchanged.

Photo-logo cleanup is separate local work: a rejected AI trial is not part of the pack. Originals remain intact; no model images are stored in this repository.

## 1.0.4 · Filter sliders

Year and Category filters now use the main site’s sliding pills, with Year above Category. Categories occupy two rows with horizontal scrolling; phone years use two rows. Touch targets remain at least 46 pixels and keyboard arrow/Home/End navigation is supported. Apply changes is a quieter black glass pill, appearing only once the gallery is in view. Filtering behavior and saved records are unchanged.

Verified in the live 1440×1000, 820×1180 and 390×844 Codex previews: 2026 + Beauty returns ten photos, keyboard selection and reset work, no horizontal page overflow or console errors. Phone full-photo viewer and footer jump passed. Five isolated Python tests and JavaScript syntax passed. Physical devices remain untested; private photo records remain local.


## Sophie’s mobile feedback · 2 October 2026

Shortened English/Thai introduction and upload guidance. The offer now uses separate short lines: 20-minute application goal, job-matched comp cards, LINE application/date/travel updates, no lock-in, payment within 24 hours, then model 70% / SOPHS 30%. Self-found and self-arranged work keeps 100%, in smaller supporting text. The other-agency paragraph is removed from this draft copy; underlying agreements still govern eligibility.

Category filter pills independently toggle black/white. Multiple selections show photos matching any selected category; All categories resets. Year remains single-select. A thin position indicator sits above the category scroller, and the native bottom scrollbar is hidden. Filtering does not save/relabel photos. Arrow keys move focus without toggling category choices; Space/Enter toggles.

Verified in the existing Codex responsive preview at phone 390×844, iPad 820×1180 and desktop 1440×1000: updated copy renders, no sideways page overflow, 46px category targets, indicator above buttons. Phone Digitals + Beauty remain selected together and return 68 matches, compared with 2 for Digitals alone. No captured console warnings/errors. Five isolated Python tests and JS syntax pass. Screenshot capture returned blank images, so visual screenshot proof and physical-device testing remain unavailable. Sophie’s photo decisions and labels were not edited.


## Simple per-photo Labels · Sophie’s follow-up, 2 October 2026

Removed Select checkboxes from photo cards and hid the bulk-label panel. Models use Keep, Favourite, Reject and Labels beneath each photo. Labels opens with short multi-choice category pills: black means selected; tap again to deselect. More categories and More details are collapsed on each opening. Shot, framing, angle, makeup, clothing, footwear, use, smile, notes and AI suggestions remain available under More details, with stored values preserved. Shot presets use plain names instead of CU/ML/PF/FL/JN codes in this editor. Save remains in the fixed dialog footer. No photo labels or choices were changed by this UI revision.

Fresh Codex preview verified Select count zero, bulk panel hidden and no sideways overflow at desktop/iPad/iPhone sizes. Phone Labels opened; existing three categories loaded; Beauty toggled on and back off without saving. Dialog and Save fit within the 390×844 viewport. Screenshot captured successfully after the earlier preview tab stopped responding; fresh preview is open for Sophie. No console warnings/errors; five isolated Python tests and JS syntax passed. Physical devices and a new GUI save/reload were not tested in this pass.


## Category selections staying selected · 2 October 2026

There is no three/five-category limit: phone preview verified ten categories selected simultaneously in the per-photo Labels editor (unsaved, toggled only for testing), and ten selected in the top Category filter. Filter choices now survive a document refresh using browser-session storage scoped separately to each screen/main page. Live preview automatic refresh waits while any photo/upload editor is open, so updates cannot silently discard in-progress labels. Main 4188 page still had the old Select/single-category code loaded; verified no open editor or save in progress, then refreshed it to the current version. Existing photo decisions and labels were untouched. Category names remain unchanged for Sophie's later revision. Ten filter choices survived Refresh all; no captured console warnings/errors, JavaScript syntax passed. Screenshot capture failed for this follow-up.


## Readable detail choices · 2 October 2026

Labels → More details now uses quieter rounded controls with small grey CSS chevrons and readable 17px medium-weight choices, with 48px minimum option tap areas. Shot, framing, angle, makeup, footwear and clothing retain their existing stored select values and save handler. One menu opens at a time; keyboard navigation and selected states are supported. CSS draws the chevron directly because the page's existing content policy blocks embedded arrow images.

Phone preview verified Angle → Side updates the original field, then restored Front without saving; option sizing and fixed Save footer checked. Automatic refresh waited until the editor closed, then loaded the update. Main page refreshed safely. JavaScript syntax and five isolated Python checks passed. A screenshot captured the enlarged fields before the final chevron correction; final screenshot capture failed, but the CSS chevron's rendered styles and expanded Angle choices were checked. No saved photo decisions or labels edited. Physical devices remain untested.


### Visible dropdown chevrons · Sophie's follow-up, 2 October 2026

Replaced the small CSS-border arrow with a clear 18×12px inline SVG grey chevron on the right of every detail choice. It rotates upward when expanded; the entire field including its arrow opens the choices. Existing text sizes, values and tap areas remain unchanged. Phone preview visibly confirmed chevrons and Angle opening; screenshot captured successfully. JavaScript syntax passed; no saved labels/choices edited.


## Clothing becomes outfit style · 2 October 2026

Clothing style now offers Not sure, Casual, Swimwear, Activewear, Streetwear, Runway wear, Formal / evening wear and Other. Jeans/trousers/shorts/skirt-dress are retained only as hidden legacy values, not selectable choices. Existing garment labels display Choose a style until the model replaces them; saving another detail still preserves the previous garment value. Style names appear in detail summaries/search. Backend validation accepts new styles and legacy values. Existing shot presets are unchanged.

Phone preview verified only the eight intended options, Streetwear updates the underlying value, then closed without saving. Six isolated tests pass, including persistence of all new style and legacy values; JavaScript syntax passes. Local main/preview servers restarted for backend validation. No saved Sophie choices/labels altered. Screenshot capture was unavailable in this pass.
