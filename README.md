# SOPHS Photo Review · v1.0.0

Private, local photo selection and job-focused labels. Same interface for Sophie, an example collection and each new model. Python standard library plus HTML/CSS/JavaScript; no package installation or build step.

## Versions

- **Sophie:** `python3 server.py` → http://127.0.0.1:4188/ . Uses the existing OS archive and choices. In a clean checkout without that archive it opens an empty Sophie collection.
- **Generic:** `python3 server.py --profile profiles/example.json --port 4189` → http://127.0.0.1:4189/ . Heading is **Example photos**. In OS it references five existing Sophie sample photos without copying originals. A clean checkout uses five explicitly labelled illustrative SVG placeholders instead.
- **New model:** `python3 create_model.py mina "Mina"`, then `python3 server.py --profile profiles/mina.json --port 4190`. Starts with **Mina’s photos**, an empty collection and independent uploads, links and choices. The helper refuses to overwrite an existing model. This is a setup action after joining, not an automatic website signup integration.

Keep one server process/port per model collection. To reuse a collection later, run the same profile again. Do not point multiple profiles at the same data folder.

## What is saved in GitHub

The v1 code, design, example illustrations, starter profiles and setup/verification instructions. Original photos, selections, label suggestions, uploaded files, videos and live model records stay local in OS and are excluded. GitHub is the code backup; it is not a backup of private photo originals. Keep the existing local original and selection backups.

In OS the source lives in `Work/Meridian Group/SOPHS Models/comp-cards/sophie-photo-review`. Sophie’s archive is its sibling `sophie-images/facebook-archive`, with `INDEX.csv` referencing the original files. It remains read-only. New collections save under `model-data/<slug>/` in this source folder. Profiles can change `archive`, `data_dir`, `name`, `title` and `initial_view` (`all`, `keep`, `favourite`, `unreviewed`, `reject`). Paths are relative to the app folder unless absolute. Copy a profile and assign a unique data directory; never copy Sophie’s choices into another model.

For a checkout elsewhere, point the Sophie profile to the existing OS archive/data folders. Set `SOPHS_REVIEW_ASSETS` to the existing SOPHS `assets` directory to reuse the approved SM-26 PNG and lightweight application video. Assets normally resolve two levels above this app in OS. Without them, the page uses a clearly documented SVG brand approximation and hides the absent video; no broken media requests. The supplied original MOV is never served. There are no remote media fetches.

## Included interface

Centred brand/upload folder and English/Thai introduction; purple stamp lettering, yellow marker highlights, compact silent application demo when local assets exist, reduced-motion and pause control; sliding photo views, all matching photos on one page with lazy loading; category/detail filters, keep/favourite/reversible rejection, batch/individual shot labels, full-size viewing, and export of choices.

Private original uploads accept JPG/PNG/WebP up to 25 MB each, preserve bytes and skip SHA256 duplicates. Links are stored as references; the server does not download them. Choices are atomic JSON saves and separate from originals. New uploads begin unreviewed. A keep or label is not approval to publish or use campaign rights.

## Access and operation

Loopback only; exact Host and mutation Origin checks, file allowlists and CSP. This is a private review tool, not a multi-user hosted platform. Do not expose it on a public interface. No authentication, cloud storage, casting submission, payment implementation or signup synchronization has been added. The two-minute application caption is an operational target, not measured performance. Commercial copy records Callum’s intended offer: 30% on SOPHS-arranged work, model share within 24 hours after job completion; self-found/self-arranged work keeps 100%; existing agency agreements must permit participation; no lock-in.

## Verify

`python3 -m unittest discover -s tests` and `node --check app.js`.

v1 checked in the Codex browser for Sophie’s unchanged 527-photo/296-kept collection, the generic example heading/photos, separate storage and upload dialog. Python checks exercise isolated profiles, own-name rendering/escaping, original-byte upload, deduplication, save/export isolation and local access boundaries. Private records and originals are not committed.
