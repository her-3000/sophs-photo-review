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
