# Sophie's V2 · Siam 69 Lord

Version **2.0.0**, 2 October 2026. A responsive private photo-review interface with the same quiet rounded controls across phone, iPad and desktop.

Clothing style: Not sure, Casual, Swimwear, Activewear, Streetwear, Runway wear, Gowns and Other. All devices use the same choices. Existing values and review decisions remain compatible with V1.

The gallery uses proportional 3:4 photo areas that contain the entire image, adaptive columns and spacing, and a centred content width capped at 1600px. Label editors use one detail column on phones and two on larger screens, with roomier padding, consistent grey chevrons and touch-sized choices. Editors fit within 90% of the viewport height; Save stays fixed. Open menus scroll into view and have their own height-limited scrolling, including landscape phones.

## Run locally

Standard-library Python only; no added dependencies.

- `python3 server.py` → `http://127.0.0.1:4188/`
- `python3 preview.py` → `http://127.0.0.1:4191/preview`
- The read-only preview has size selectors for phones, iPads and desktop/ultrawide monitors. It waits for open editors to close before automatic refresh.
- `python3 create_model.py --help` describes separate model setup. No automatic signup integration is implemented.

Code/setup/illustrations belong in GitHub. Original photos, uploads, video assets, selections, AI suggestions and operational model records remain local. The Sophie profile requires its local archive; fallback examples support a clone without private media. V1 remains recoverable through its prior commit and original v1 branch.

## Verification

Codex browser checks covered thirteen configured layouts: phone 320×568, 390×844, 430×932 and 844×390; iPad 768×1024, 820×1180, 1024×1366 and 1180×820; computer 1280×800, 1440×1000, 1920×1080, 2560×1440 and 3440×1440. No sideways page overflow; Labels and Save fit; open Clothing style choices stay visible. Gowns verified in all three standard views. Keyboard End scrolls the options into view without changing a value. Screenshots captured of the three final menus. Browser console has no captured warnings/errors.

Six isolated profile/persistence tests and app/preview JavaScript syntax checks pass. Actual hardware, other browser engines and a new GUI save/reload were not tested during this layout-only revision. No assistant changes to saved model choices or labels, no live deployment and no new collaborators.

## Local follow-up · side scrollbars, 2 October 2026

Page, Labels editor and option-menu scrollbars are hidden in all three layouts; scrolling itself remains enabled. The preview outer page also hides its scrollbar. Browser verified scrollbar-width none in each frame and keyboard End advanced each option menu's scroll position without changing a label. This follow-up is local and is not included in the already-verified V2 GitHub commit. No tests added for this CSS-only change.

Local copy follow-up, 2 October: removed No lock-in from the introduction and both language dictionaries. LINE application/date/travel updates now lead directly into payment within 24 hours. Main page adjacency verified and JavaScript syntax passed. Existing agreements/eligibility are not changed by this copy edit. This change awaits the next requested GitHub push.

Local mobile viewer follow-up, 2 October: photo-first layout with 16px corners on the actual image, no outer grey border, hidden filename caption and a rounded Close control below the photo. Applies to all photos only at phone widths (≤600px). The entire original image remains visible. Photo 4 at 390×844 verified loaded, image top 170.7px (previously lower), border 0, caption hidden and Close below the image; dialog fits. Desktop/iPad caption and border styles unchanged. Screenshot capture unavailable for this follow-up. No source photos or saved choices edited; awaits next requested GitHub push.

Mobile Close refinement, 2 October: centred white-background/black-text control, one-third of the former full width. Verified 111.3px versus previous 334.2px at 390px phone width; 44px tap height retained. No change to iPad/desktop or photo choices. Local follow-up, pending next requested push.

Shared viewer follow-up, 2 October: the approved mobile photo viewer now applies to desktop and iPad too. Rounded actual photo, white shell without grey border, hidden filename and a one-third-width white/black Close button below. Larger screens use content-fitted width and 24px padding; mobile retains its approved dimensions. Photo 4 loaded and fitted in all three standard previews; border 0, 16px photo corners, caption hidden and Close below verified. No photo data changed; screenshot unavailable. Local changes await next requested GitHub push.

Approved default, 2 October: Callum confirms the shared rounded-photo viewer as the standard appearance for all existing and newly uploaded photos across phone/iPad/desktop. Verified new uploads enter the same render() path and shared viewer; no per-photo styling or manual setup is needed. This confirms the current local photo-review design, not a new public-site deployment.

Mobile filter follow-up, 2 October: added a Photos heading above the view choices and centred it with Year, Categories and Find a detail. Mobile years form a balanced three-column/two-row grid; desktop/iPad keep their previous layout. Removed Date unknown from all Year menus at Callum's request; All years continues to include undated photos. Verified six Year choices in all three previews, matching mobile centres/no sideways overflow, 2026 filtering and All years reset. New Photos heading is hidden on desktop. Screenshot unavailable; local follow-ups await next requested push.


## Local upload dialog follow-up · 2 October 2026

Centred, rounded upload dialog shared by phone, iPad and desktop: quiet upload area, pill Choose photos/Save link controls, centred inputs, short copy and optional name. Cloud-link label explicitly names Dropbox and Google Drive; http(s) photo, album and clip references save without importing or changing cloud access.

Original limit raised from 25 to 100 MiB per photo in client/server. JPG, PNG, WebP, HEIC/HEIF and TIFF are accepted. On macOS, built-in sips creates a separate JPEG preview (up to 2560px, quality 90) for HEIC/TIFF; originals remain byte-identical and separately retrievable through photo.original. No dependency installed. Other runtimes give an actionable error for HEIC/TIFF without sips. This handles the still image, not Live Photo motion or camera RAW formats; larger collections can use saved album links.

Verified live SOPHS intake file controls include HEIC/HEIF. Public intake currently optimises/converts uploads; it is a separate flow and was not changed here. Eight isolated checks passed including genuine sips-generated HEIC/TIFF uploads, byte-identical originals, JPEG preview MIME, duplicates, invalid HEIC rejection, a 26+ MiB upload, oversized request rejection and Dropbox/Drive/Google Photos links. Main Sophie choices were not edited. At desktop 1440, iPad 820 and phone 390, dialog and Save link centres match, with no horizontal overflow. Screenshot: /tmp/sophs-upload-dialogs.png. Local runtime restarted; follow-up is newer than the V2 GitHub checkpoint and awaits the next requested push.


Local photo dismissal follow-up, 2 October: tapping/clicking the dimmed area outside the photo viewer closes it in every layout; the existing Close button and Escape remain. Pointer start and finish must both be outside, so a gesture beginning on the photo does not dismiss it. Browser verified outside dismissal on phone, iPad and desktop, an inside-photo tap stays open, and the Close button still works. JavaScript syntax passed, browser error log empty; no photo decisions changed. Screenshot /tmp/sophs-photo-dismissal.png. Awaiting next requested GitHub push.


Local stamp heading follow-up, 2 October: Your photos. Your choice. now shares the AI headline’s Courier bold uppercase lettering, spacing, worn-ink SVG filter, subtle text shadow and rotation; purple #78519c retained. Shared style applies to mobile, iPad and desktop with existing responsive heading sizes. Browser verified identical stamp typography/filter, purple and no overflow across all three; preview brought to the heading. Screenshot /tmp/sophs-purple-stamp.png. Choices unchanged; awaiting next requested GitHub push.


## Git checkpoint 2.1.0

Authorised by Callum after the purple stamp refinement. Includes all approved local follow-ups since 2.0.0: hidden scrollbars, concise intro, shared rounded photo viewer with small Close and outside-tap dismissal, centred mobile photo/year headings, no Date unknown toggle, original-preserving 100 MB/HEIC/TIFF uploads, centred cloud-link dialog, and purple stamp finish heading. Eight isolated Python checks plus app/preview JavaScript syntax pass. Browser behaviour/layout evidence is recorded above. Code only; private originals, selections, suggestions and model operational data remain local. GitHub backup does not deploy the public website or activate model login.

## Combined website and Sophie views — 3 October

Open http://127.0.0.1:4191/website-preview#sophie. The same page contains homepage, login and Sophie photo-review rows, each computer/iPad/iPhone with size selectors. Sophie uses the existing local read-only preview document, not a fabricated authenticated session. All preview POST requests remain forbidden; actual editing stays on 4188. Public frames load from the existing 4176 server; private photo data stays under this owner. Nine frames and Sophie’s loaded photo controls verified in the Codex browser; three-device screenshot saved. This local addition is not yet pushed.
