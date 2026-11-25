# store/

The Google Play listing: the canonical console answers, the listing art FOUNDRY
copies from this folder, and the config the fake-store generator reads. The
web-served legal pages live in `game/store/` instead.

| File | Summary |
|---|---|
| [PLAY-LISTING.md](./PLAY-LISTING.md) | Every Play Console answer: listing copy, products, Data safety, IARC, app content. |
| [fakedoor.config.json](./fakedoor.config.json) | Name, studio, contact and copy; input to team-dashboard's fake-store generator for `game/store/privacy.html` and `terms.html`. |
| [icon.png](./icon.png), [play-icon-512.png](./play-icon-512.png) | The app icon (1024) and its Play upload (512). |
| [feature-graphic.png](./feature-graphic.png) | Play feature graphic, 1024×500: key art, logo, tagline. |
| [shots/](./shots/) | The six Play phone screenshots, 1080×1920, in listing order. |
| [raw/](./raw/) | The unaltered gameplay captures the screenshots are composed from. |
| [shots.json](./shots.json) | Each screenshot's capture and headline; `{braces}` mark the gold words. |
| [supertest-cover.png](./supertest-cover.png) | superTEST card cover, 1440×2560 (9:16): dragon key art + Out of Ruin logo. |
| [supertest-hero.png](./supertest-hero.png) | superTEST detail page hero, 2560×1080 (21:9): dragon key art, no text/HUD. |
