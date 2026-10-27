# Mobile launch — human console session for Out of Ruin

Prefilled from the mobile-launch skill's checklist for this game. The canonical
long-form answers are in [store/PLAY-LISTING.md](../store/PLAY-LISTING.md); the
Data safety and IARC tables there **replace** the generic ones below, because
this game sells gold through Play Billing (Purchase history is declared, and
Gambling themes and Digital purchases are Yes).

## 0. Out of Ruin specifics — do these first

- [ ] **Vercel Production env: `VITE_APPSFLYER_DEV_KEY`** (the same account-level
      value as the org Actions secret). Set it with `vercel env add
      VITE_APPSFLYER_DEV_KEY production` from `game/`. **Every production
      deploy of the web game fails until it is set**: the build refuses to
      publish an OTA bundle without attribution. `VITE_POSTHOG_KEY` and
      `VITE_POSTHOG_HOST` are already set.
- [ ] **DNS at GoDaddy** (where outofruin.com's DNS lives). All three domains
      are attached and verified on Vercel; they go live with these records.
      `app` carries the app's updates, purchases and legal pages, so do it
      before the first Play upload.

      | Type | Name | Value | Replaces |
      |---|---|---|---|
      | A | `@` | `76.76.21.21` | GoDaddy's forwarding (turn domain forwarding off) |
      | CNAME | `www` | `cname.vercel-dns.com` | `kalvinlyle.github.io` (the old GitHub Pages site) |
      | CNAME | `app` | `cname.vercel-dns.com` | (new) |
- [ ] **Deploy the web game** (`vercel deploy --prod` from `game/`) and check
      that these return 200: `https://app.outofruin.com/store/privacy.html`,
      `/store/delete.html`, `/ota/index.json`, and `POST /api/updates` answers
      JSON.
- [ ] **Play in-app products**: create the six managed products in
      PLAY-LISTING §In-app products (ids `buygold_1` … `buygold_6`), active.
- [ ] **Purchase verification service account**: in Google Cloud, a service
      account with the Google Play Android Developer API enabled; in Play
      Console → Users and permissions, invite it with **View financial data**
      and **Manage orders** on Out of Ruin; set its JSON key as
      `GOOGLE_PLAY_SERVICE_ACCOUNT` in Vercel Production. This is separate from
      the org publisher account, which only uploads builds. Until it is set the
      shop shows gold packs as unavailable.
- [ ] **Snowplow**: ask #new-games-support for client-side tracking consent,
      and #ai-analytics for an `app_id` (suggest `out-of-ruin-prod`). Then set
      `VITE_SNOWPLOW_APP_ID` (and `VITE_SNOWPLOW_COLLECTOR` once
      @Dmitry Smirnov confirms the production collector) as a repo secret and
      in Vercel Production. Until then Snowplow sends nothing.
- [ ] **AppsFlyer app registration**: the agent needs an AppsFlyer admin V2
      token (HQ → Security centre → API tokens) as `APPSFLYER_API_TOKEN` to run
      `appsflyer-create-app.sh games.misaligned.outofruin "Out of Ruin"`. None
      is in 1Password.
- [ ] **Retention period**: confirm how long PostHog and AppsFlyer keep data,
      and put the number on `game/store/delete.html` ("What is kept"). Play's
      deletion requirements ask for it.
- [ ] **FOUNDRY store mapping**: once Play shows the listing live, add it to
      `game-foundry/store-mapping.json` in ai-asylum/foundry (`package`,
      `store_name: "Out of Ruin: Idle Dungeon RPG"`, `repo`,
      `shipped_by: "kalvin.lyle"`, `first_published`). The `projects` row and
      the github / play / posthog `project_links` already exist.
- [ ] **Device frame rate on a real phone** (skill step 6a): a mid-range Android
      at a fresh and a late-game save, before any campaign.


One sitting, ~15 min, except the Play↔Ads link in §2 which waits on the Play
Console owner's approval. Everything the agent could pre-fill is pre-filled —
you click, check, and paste the Google Ads link ID back. Canonical long-form
answers live in the game repo's `store/PLAY-LISTING.md`.

> **Agents: this checklist is a LIVE document, not a printout.** When the human
> works through it with you conversationally, update the GitHub issue after
> every confirmed item: flip its `- [ ]` to `- [x]` in the issue body
> (`gh issue edit <n> --repo ai-asylum/out-of-ruin --body-file <updated.md>`) and
> add a short comment when a step needs a note (e.g. "IARC rated 7+"). The
> issue is the team's progress view — nobody should have to ask "where are
> we?". NEVER paste secret values (keys, keystores) into the issue; secrets go
> through `gh secret set` only, the issue just records "done".

**Identity**
- App name: `Out of Ruin: Idle Dungeon RPG` — must START with the PostHog project name, with any
  store subtitle after a colon or a dash (`Drill Down: Idle Mining`). The
  dashboards join Play to PostHog on that name and nothing else, so a listing
  that opens with different words splits the game into two half-reported rows.
- Package id: `games.misaligned.outofruin`
- Privacy policy URL: `https://app.outofruin.com/store/privacy.html`
- Store listing copy/assets: `store/fakedoor.config.json` + `store/shots/` (already merged)

## 1. [Google Play Console](https://play.google.com/console) (no API for any of this)
- [ ] [Create app](https://play.google.com/console/developers/app/create):

      | Field | Value |
      |---|---|
      | Package name | `games.misaligned.outofruin` |
      | App name | `Out of Ruin: Idle Dungeon RPG` |
      | Default language | English (United Kingdom) |
      | App or game | Game |
      | Free or paid | Free (permanent — a free app can never become paid) |
      | Contact email | `support@misaligned.games` |
      | Declarations | Tick both (developer program policies, US export laws) |

      **Every row is required, the package name and contact email included.**
      The package name is the one value the human cannot guess and can never
      change. Agents kept dropping it, or demoting it to "if it asks", and kept
      dropping the email; both left the human stuck mid-form. When walking the
      human through this step, paste this table as it is: all seven rows, the
      package name as a normal row, no "if asked" wording, no shorter list.
- [ ] **Data safety form** — this is the whole answer set for a game wired the
      standard way (PostHog + AppsFlyer, per SKILL.md steps 3–4). Copy it row by
      row; long-form prose lives in `store/PLAY-LISTING.md` §Data safety.

      **Agents: paste every page below into the chat UP FRONT, filled in for
      this game, before the human opens the form.** Never hand it out one
      question at a time and never answer from memory.

      **Audit the game first; the tables assume PostHog + AppsFlyer only.**
      - A backend sign-in of ANY kind, Supabase **anonymous** auth included
        (grep `signInAnonymously`, `auth.`, `.from(`, `functions/v1`), means
        **Personal info → User IDs is ticked** (Collected, not shared,
        Required, purpose App functionality), and server-saved game data adds
        **App functionality** to App interactions. Anonymous auth with no
        login screen is still "My app does not allow users to create an
        account".
      - Typed text that leaves the device adds **Other user-generated
        content**; a crash SDK adds **Crash logs** and **Diagnostics**.
      - The privacy policy must then name the backend too.

      Relay it page by page in the Console's order. **Page — Data collection
      and security** comes first:

      | Question | Answer |
      |---|---|
      | Does your app collect or share any of the required user data types? | **Yes** |
      | Is all of the user data collected by your app encrypted in transit? | **Yes** — PostHog and AppsFlyer are HTTPS-only |
      | Which methods of account creation does your app support? | Tick only **My app does not allow users to create an account** — unless the game has sign-in (OAuth, Supabase auth); then tick **OAuth** and a deletion URL becomes mandatory |
      | ↳ Can users log in to your app with accounts created outside of the app? | **No** for a game with no sign-in |
      | Do you provide a way for users to request that their data is deleted? (Optional) | **Yes** |
      | ↳ Delete data URL | `https://app.outofruin.com/store/delete.html` — the deletion form (copy Orc Horde's or Match Merge's `store/delete.html`), linked from in-game Settings next to the Player ID with the id prefilled in the `#id=` fragment. It names the game, gives the steps and lists what is deleted, which are Play's three requirements. Fall back to `store/privacy.html` only if the game has no delete page yet. **Deploy it and confirm it returns 200 before pasting** — Play flags a 404 on the spot |

      Then the data-types page and the per-type usage pages, answered from
      the table below.

      **Page — Data types.** Every section and every checkbox on it, in the
      Console's order. Tick exactly three boxes; relay the whole table so the
      human can see each box they leave empty is meant to be empty:

      | Section | Checkbox | Tick? |
      |---|---|---|
      | Location | Approximate location | ✅ **Tick** — IP-derived country (PostHog GeoIP, AppsFlyer) |
      | Location | Precise location | No |
      | Personal info | Name · Email address · User IDs · Address · Phone number · Race and ethnicity · Political or religious beliefs · Sexual orientation · Other info | No to all — no account, no sign-in. ANDROID_ID goes under Device or other IDs, not User IDs |
      | Financial info | User payment info · Purchase history · Credit score · Other financial info | No to all — no in-app purchases |
      | Health and fitness | Health info · Fitness info | No to both |
      | Messages | Emails · SMS or MMS · Other in-app messages | No to all |
      | Photos and videos | Photos · Videos | No to both |
      | Audio files | Voice or sound recordings · Music files · Other audio files | No to all |
      | Files and docs | Files and docs | No |
      | Calendar | Calendar events | No |
      | Contacts | Contacts | No |
      | App activity | App interactions | ✅ **Tick** — PostHog events and session replay |
      | App activity | In-app search history · Installed apps · Other user-generated content · Other actions | No to all |
      | Web browsing | Web browsing history | No |
      | App info and performance | Crash logs · Diagnostics · Other app performance data | No to all — no crash SDK ships |
      | Device or other IDs | Device or other IDs | ✅ **Tick** — advertising ID (AppsFlyer) and ANDROID_ID (PostHog `identify()`) |

      **Pages — one per ticked data type.** The questions are identical on each
      page but the answers are not: Device or other IDs is the only one that is
      also Shared. Relay all three columns together, and say so, because the
      human will assume the pages are copies:

      | Question | Approximate location | App interactions | Device or other IDs |
      |---|---|---|---|
      | Is this data collected, shared or both? | ☑ Collected only | ☑ Collected only | ☑ Collected **and** ☑ Shared |
      | Is this data processed ephemerally? | No | No | No |
      | Is this data required for your app, or can users choose whether it's collected? | Data collection is required | Data collection is required | Data collection is required |
      | Why is this user data collected? | Analytics · Advertising or marketing | Analytics | Analytics · Advertising or marketing |
      | Why is this user data shared? | — | — | Advertising or marketing only |

      The ephemeral / required / purpose questions appear only after Collected
      is ticked; the shared-purpose question only after Shared is ticked.

      **Declare exactly these three data types. Everything else on the form is No.**

      | Data type | Collected | Shared | Ephemeral | Required | Purposes |
      |---|---|---|---|---|---|
      | **Approximate location** | Yes | **No** | No | Required | Analytics **+** Advertising or marketing |
      | **Device or other IDs** | Yes | **YES** | No | Required | Analytics **+** Advertising or marketing |
      | **App interactions** | Yes | **No** | No | Required | Analytics |

      Where each comes from, so the answers can be defended:
      - **Approximate location** — nobody asks for GPS; it is derived from the
        IP address by AppsFlyer *and* by PostHog's GeoIP. IP-derived coarse
        location is still collection as Play defines it.
      - **Device or other IDs** — GAID (the advertising ID) via AppsFlyer, plus
        ANDROID_ID via PostHog's `identify()` (SKILL.md step 3). Two SDKs, one
        row: declare it once and let the policy name both.
      - **App interactions** — PostHog events, plus session replay wherever the
        device tier enables it.

      **"Shared" is Yes on the Device IDs row, and it is the answer people get
      wrong.** The AppsFlyer↔network integrations send attribution postbacks
      containing the device identifier to the ad networks — so the data leaves
      us, which is Play's definition of sharing regardless of us selling
      nothing. It holds for **any** game with a live network integration, and
      the mobile-launch script copies Google Ads **and AppLovin** onto every new
      app, so it holds for every game this skill wires — including one that has
      never run a campaign. When the form asks the purpose of the **shared**
      data specifically, answer **Advertising or marketing only** (the postback
      exists to attribute installs, not to analyse them). Answering "not shared"
      here is a false declaration, not a simplification.

      **Set `Required` on all three rows**, not "Users can choose": there is no
      in-game opt-out toggle. If a game ever ships one, that game's row changes.

      **Separate page — App content → Advertising ID** (it is not part of the
      Data safety form, and it defaults to **No**, so it surfaces late, from
      Publishing overview, when the production release is blocked):

      | Question | Answer |
      |---|---|
      | Does your app use an advertising ID? | **Yes** — the `com.google.android.gms.permission.AD_ID` permission ships with AppsFlyer (SKILL.md step 4), and Play shows a notice saying so. No against that manifest blocks every Android 13+ release |
      | Why does your app need to use an advertising ID? → App functionality | No |
      | ↳ Analytics | ✅ **Tick** — AppsFlyer install and retention reporting |
      | ↳ Developer communications | No |
      | ↳ Advertising or marketing | ✅ **Tick** — attribution postbacks to the ad networks |
      | ↳ Fraud prevention, security and compliance | No |
      | ↳ Personalisation | No |
      | ↳ Account management | No |

      Then **Save**. Relay this page right after Data safety so it is never
      discovered at release time.

      Explicitly **No**: precise location, personal info (name/email/address —
      the fake-door email capture is a separate web funnel, not the app), crash
      logs and diagnostics (no crash SDK ships in the shell), photos, audio,
      contacts, calendar, files, messages, health, financial info, purchases.

      **Deletion path — answer honestly for this game.** Play asks whether users
      can request data deletion and wants a URL or route. Say what the game's
      privacy page actually offers rather than ticking the flattering box; if
      it offers nothing yet, the minimum worth having is a **contact address on
      the privacy page** that a deletion request can be sent to (the generated
      page carries `support@misaligned.games`), and then the answer is that
      requests are handled on request via that address.

      Two traps that have bitten listings:
      - PostHog only began collecting a device identifier when the analytics
        module started identifying per device (SKILL.md step 3). A form filled
        in before that — or **copied from an older game** — under-declares.
      - The **privacy policy URL above must name both SDKs and both
        identifiers.** Play cross-checks the form against the policy, and "form
        says Device IDs, policy mentions only the ad ID" is a rejection, not a
        warning.
- [ ] **Content rating (IARC)** — relay it page by page, in the order the
      Console shows it. The first page comes BEFORE any questionnaire answer:

      **Page 1 — Category**

      | Field | Value |
      |---|---|
      | Email address | `support@misaligned.games` |
      | Category | **Game** |
      | Terms and conditions | Tick "I agree to the Terms of Use" (IARC) |

      **Page 2 — Questionnaire.** Answers per game live in
      `store/PLAY-LISTING.md` §IARC; fill them from the rendered game, not a
      guess. The violence question is the one with sub-options that need
      explaining:

      *"Violence, blood or gory images"* → **Yes** for any game where units
      fight and die, then tick what the game shows:

      | Checkbox | Tick when |
      |---|---|
      | Violence or implied violence against humans | Any human-looking character is attacked — including stylised knights, soldiers, villagers, blocky/voxel people |
      | Violence against anything other than humans | Orcs, goblins, monsters, animals, robots or vehicles are attacked |
      | Disturbing or gory images without a violent act shown | Gore/remains appear with no kill causing them (e.g. a corpse-strewn backdrop). Death splats or bones left by a kill do NOT count |
      | Blood that isn't directly related to a violent act | Blood on clothing, in the background, from surgery. Blood from a hit does NOT count |

      Most of our battle games tick the first two and leave the last two.

      Ticking **Violence or implied violence against humans** opens a
      follow-up block, *"Violence Against Humans"*. Every question, and how
      to answer it:

      | Question | Options | How to answer |
      |---|---|---|
      | In what kind of setting does the violence occur? | Fantastical / Realistic | **Fantastical** for orcs, knights, magic, invented worlds |
      | Does the game have a pixelated or childlike style? | Child-like style / Pixelated style / No | **Pixelated** for voxel or pixel-art characters (voxels are 3D pixels); **Child-like** for soft toddler-cartoon art aimed at young kids; **No** for painted or realistic 3D |
      | How would you describe the reactions to violence? | Unrealistic / Realistic | **Unrealistic** when units pop, splat or fall over with no pain, wounds or ragdoll suffering |
      | How is this violence presented? (tick all) | Referred to / Implied but not seen / Rarely or Often depicted from a distant perspective / Rarely or Often depicted close-up | Combat is the core loop, so it is **Often**. A top-down or high raid camera with no zoom to individual kills is **distant** — tick only **Often depicted from a distant perspective**. Tick a close-up option only if the game zooms in on kills |
      | Level of blood and/or gore? | None / Mild-Limited / Moderate / High | **None** if deaths leave nothing; **Mild/Limited** for small splats or bones, especially non-red; Moderate/High only for red blood pools, dismemberment, lingering bodies up close |
      | Realistic or historical war setting? | Yes / No | **No** unless it is a real war or period (WW2, Napoleonic, modern military) |
      | Can innocent or defenceless characters be seriously injured or killed? | No / Yes with penalties / Yes without penalties | **No** when every human who can die is an armed combatant (soldiers, guards, gunners). Check the defender roster in `config.ts`, not the art — villagers or farmers who can be killed make it Yes |
      | Fierce sounds, sinister or intimidating characters, or dark overtones with the violence? | Yes / No | Read the game's audio manifest. War drums, "dark" music, flesh-impact or death-grunt SFX make it **Yes**; a light comic soundtrack with cartoon bonks is No |

      Ticking **Violence against anything other than humans** opens a second
      block, *"Violence Against Non-Humans"*. Same rules as above where the
      question repeats; the new ones are the last-but-two and last-but-one:

      | Question | Options | How to answer |
      |---|---|---|
      | In what kind of setting does the violence occur? | Fantastical / Realistic | **Fantastical** for monsters, orcs, goblins, robots in an invented world |
      | Does the game have a pixelated or childlike style? | Yes / No | **Yes** for voxel, pixel-art or toddler-cartoon art (this block has one Yes, not two) |
      | How would you describe the reactions to violence? | Unrealistic / Realistic | **Unrealistic** when units pop, splat or fall with no suffering |
      | How is this violence presented? (tick all) | Referred to / Rarely or Often depicted from a distant perspective / Rarely or Often depicted close-up | Same as the humans block: core-loop combat seen from a high camera is **Often depicted from a distant perspective** only |
      | Level of blood and/or gore? | None / Mild-Limited / Moderate / High | Same scale as above: small or non-red splats and bones are **Mild/Limited** |
      | Do any of these creatures behave or respond like humans? | Yes / No | **Yes** for humanoid creatures that walk upright, carry weapons, shout and fight like people (orcs, goblins, ogres, skeletons). **No** only for beasts, slimes, robots or vehicles |
      | Is any of this violence against real-world animals? | Yes / No | **No** unless real animals (wolves, horses, birds) can be hurt. Fantasy beasts are not real-world animals |
      | Fierce sounds, sinister or intimidating characters, or dark overtones? | Yes / No | Same audio-manifest check as the humans block, and answer both blocks the same way |

      After the violence blocks, the questionnaire runs through standalone
      Yes/No questions. None of them count user-generated content:

      | Question | How to answer |
      |---|---|
      | **Fear** — pictures or sounds likely to be scary, horrifying or disturbing? | **No** for cartoon combat, even with dark music (that is already declared under violence). **Yes** for horror imagery, jump scares, zombies or undead shown as frightening |
      | **Sexuality, suggestiveness or dating games** — sexuality, sexual violence, suggestiveness, dating, revealing attire or nudity? | **No** unless there is romance/dating, innuendo or revealing outfits |
      | **Gambling themes, simulated or real gambling** — gambling, casino/bingo simulations or gambling themes? | **No** when random rewards (chests, rolls) are earned by play and cannot be bought or wagered. **Yes** for slots, cards-for-chips, roulette, or paid loot boxes |
      | **Language** — potentially offensive language? | **No** unless swearing, slurs or crude insults appear in text or voice |
      | **Controlled substance** — reference to or use of drugs, alcohol or tobacco? | **No** unless any appear, even as decoration (a tavern with ale, a pipe-smoking NPC) — check the art and building names |
      | **Crude humour** — belching, flatulence or vomiting played for laughs? | **No** unless such gags exist in animations, SFX or text |
      | **Digital purchases, cash-convertible rewards or NFTs** — purchase or sale of digital goods, cash rewards, gift cards, play-to-earn, crypto or NFTs? | **No** when the build ships no billing SDK and no purchase UI. **Yes** the moment IAP, rewarded cash or tradeable assets exist |

      Last comes a **Miscellaneous** page of six Yes/No questions:

      | Question | How to answer |
      |---|---|
      | Natively lets users interact or exchange content with other users (voice, text, images, audio)? | **No** unless the build has chat, messaging, clans with chat, or shareable UGC. A disabled "Clans" button or AI/generated opponents is still No — grep `src/` for chat/websocket/clan to confirm |
      | Shares the user's current, precise physical location with other users? | **No**. IP-derived country location sent to analytics is not shared with users (it is declared on Data safety instead) |
      | Contains swastikas, other Nazi symbols or propaganda unconstitutional in Germany? | **No** unless the art has them — check banners and flags in the key art too |
      | Content that erodes the national identity of the Republic of Korea (anti-national acts, distorting history)? | **No** for any fantasy setting |
      | Advocates committing acts of terrorism? | **No** |
      | Realistic descriptions of crimes (robbery, kidnapping) or techniques usable in criminal offences? | **No** for fantasy raiding and looting of invented villages; Yes only for realistic real-world crime depiction |

      Write the game's own answers into its `PLAY-LISTING.md` §IARC so the
      human never has to ask.
- [ ] Target audience / child-directed declarations → `store/PLAY-LISTING.md` §App content
- [ ] **Select an app category and provide contact details** (Grow users →
      Store presence → Store settings). Values from `store/PLAY-LISTING.md`
      §Categorization & contact; relay every row:

      | Field | Value |
      |---|---|
      | App or game | **Game** |
      | Category | The game's genre from PLAY-LISTING (e.g. **Strategy**) |
      | Tags → Manage tags | Up to 5, written into PLAY-LISTING beforehand and chosen **only** from [play-game-tags.md](play-game-tags.md) — Play offers a fixed list, so an invented tag cannot be selected |
      | Email address | `support@misaligned.games` |
      | Phone number | Leave blank |
      | Website | `https://misaligned.games` |
      | External marketing | Leave ticked (default) |

- [ ] **Set up your Store Listing** (Grow users → Store presence → Main store
      listing). Paste copy from `store/PLAY-LISTING.md` §Main store listing and
      upload from `store/shots/`; relay every row:

      | Field | Value |
      |---|---|
      | App name (≤30) | The locked store name |
      | Short description (≤80) | PLAY-LISTING, as-is |
      | Full description (≤4000) | PLAY-LISTING, as-is |
      | App icon (512×512 PNG, ≤1 MB) | `store/play-icon-512.png` |
      | Feature graphic (1024×500) | `store/feature-graphic.png` |
      | Video (YouTube URL) | Leave blank |
      | Phone screenshots (2–8) | Every `store/shots/NN-*.png`, in number order |
      | 7-inch and 10-inch tablet screenshots | Leave blank for a portrait phone game |
      | Chromebook / Android XR / TV / Wear | Leave blank |

      Then **Save**.
- [ ] Confirm digital-goods checkout uses Google Play Billing; any Stripe
      purchase UI must be absent from the Play build until native billing is ready
- [ ] **First AAB upload is manual** (Google rule): grab `app-release.aab` from the
      latest `Android Build` workflow artifacts → internal testing track.
      **After the first manual upload**, CI auto-uploads every build via the Play
      service account — do NOT manually upload subsequent AABs or you'll hit
      "version code already used" errors (CI already uploaded it). If you need
      to create a new internal release from an existing build, use **Add from
      library** in the Play Console instead of re-uploading the file.
- [ ] **Ask the human for the internal testing opt-in link** — Internal
      testing → Testers → **Copy link**. It has the form
      `https://play.google.com/apps/internaltest/<numeric id>`, and the id
      cannot be derived or fetched by the agent; do **not** hand over
      `play.google.com/apps/testing/games.misaligned.outofruin` instead (that is the closed /
      open track's link). Write it into the game's `PLAY-CONSOLE-CHECKLIST.md`
      so on-device testing never has to ask again.
- [ ] **Device exclusion rule — set it BEFORE the first campaign spends.**
      Play Console → the app → **Monitor and improve → Device catalog →
      Manage exclusion rules** → add a rule → **RAM**. No API; two minutes.

      | Field | Value |
      |---|---|
      | Property | RAM |
      | Operator | **is less than or equal to** (the only operator Play offers) |
      | Value | **3072 MB** (default for a three.js game; the values on offer are 256 / 512 / 768 / 1024 / 1536 / 2048 / 3072 / 4096 / 6144) |

      **Why 3072 and not 4096.** Play compares against the device's
      `TotalMem`, which reads ~10% under the marketed size — a "4 GB" phone
      reports 3.6–3.9 GB, a "3 GB" phone ~2.8 GB. `≤ 3072` therefore means
      "3 GB and under are out, 4 GB stays"; `≤ 4096` would throw the 4 GB
      phones out with them, which is most of the Philippine install base.
      If the game genuinely needs 6 GB, pick `≤ 4096` on purpose and say so
      in the issue.

      **Why at all.** One True Hero, Sept 2026: on ≤ 4 GB phones 14% of
      installs finished a match vs 47% on 6 GB+, boot took 15–19 s vs 6 s,
      and D1 fell from 23% to 6% as the low-end share of the cohort grew.
      Google App campaigns cannot target by device, RAM or model, and
      AppLovin's targeting is fully automated — the Device catalog is the
      **only** lever, and it works for every network at once because an
      excluded phone cannot install from the listing regardless of who sent
      it. It is not retroactive: phones that already installed keep the app.

      Before saving, read the **preview** the rule page shows: the excluded
      count and a few named devices. Sanity check — Realme C11, vivo Y02,
      Galaxy A10s and the 3 GB Tecno Spark Go variants should be listed;
      Realme C61, Galaxy A05/A07 and Redmi 13C should **not** (or only as
      "partially excluded", their 3 GB variants). If a 4 GB phone you know
      appears as fully excluded, the value is one step too high.

      Record the rule in the issue ("RAM ≤ 3072 MB, N devices excluded") so
      the campaign session knows the floor it is buying above.
- [ ] **Also create a CLOSED testing release before going for production** —
      promote the same build to a closed track and select the org's EXISTING
      "founding team" tester group (~7 people — it's already set up in Play
      Console, do NOT create a new one). Empirical team finding
      (Tristan, July 2026): apps that submitted an internal AND a closed
      testing release before the prod submission get reviewed noticeably
      faster than prod-only submissions. Two clicks now, days saved later.

      Relay it with the real click path — the Console has no "Manage track"
      button on a fresh app:

      | Step | Where / value |
      |---|---|
      | 1 | **Test and release** → **Closed testing** card → **Get started** (opens the Alpha track: tabs Releases · Countries / regions · Testers) |
      | 2 | **Testers** tab → tick the existing **founding team** list → **Save** |
      | 3 | **Countries / regions** tab → **Add countries / regions** → select all → **Save** |
      | 4 | **Create new release** (top right of the track page) |
      | 5 | App bundles → **Add from library** → the build already on internal testing. Never re-upload the AAB |
      | 6 | Release name: leave the default |
      | 7 | Release notes: the `<en-US>…</en-US>` block from PLAY-LISTING, and nothing else |
      | 8 | **Next** → **Save** → **Send for review** (Publishing overview) |
- [ ] CI uploads: NOTHING to do — the SHARED org service account
      `play-publisher@entropedia-499116.iam.gserviceaccount.com` has
      ACCOUNT-LEVEL Play Console access (covers every new app automatically;
      verified by Tristan, July 2026) and its key is the org Actions secret
      `PLAY_SERVICE_ACCOUNT_JSON`. **NEVER create a service account, grant
      per-app access, or paste anything per repo.** If the org secret is ever
      missing, an admin re-mints a key: [GCP IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
      → play-publisher → Keys → Add key (JSON), then
      `gh secret set PLAY_SERVICE_ACCOUNT_JSON --org ai-asylum --visibility all < key.json`

## 2. Google Ads + AppsFlyer
The app and its partner integrations are done by the agent
(`scripts/appsflyer-create-app.sh`): registration via the App Management API,
Google Ads + AppLovin copied from the template app, and the click/impression
attribution links generated from the package id instead of copied out of the GUI.
What is left is Google's side — two jobs, and they are not interchangeable.

### Play download conversion (required before the campaign can run)

An App campaign for installs bids on a **Google Play download**, not on
AppsFlyer `first_open`. The foundry launcher creates the campaign without
attaching one, so it will sit Eligible (Misconfigured) — "Install conversion
missing" — until this is done.

No Play↔Ads account link is needed for this — Google tracks Play downloads
without one (the Data manager → Google Play link is only for in-app-purchase
conversions and remarketing). A pending link request there is not a blocker;
don't chase it.

- [ ] **Create the Download conversion from Google Play, not AppsFlyer.**
      Once the listing is live: Goals → Create conversion action → Conversions
      on an app → **Download** → pick **`Out of Ruin: Idle Dungeon RPG (Android)`** *without*
      "via AppsFlyer". There is no event to choose — Play is the event. If
      the game is missing from the picker, the listing is not live yet.
      Download + via
      AppsFlyer shows an empty event table; that is expected, do not invent
      an event.
- [ ] On the campaign, Bidding → "How do you want to track install volume?"
      is that Play download action. Leave any `first_open` conversion
      **Secondary**.

### AppsFlyer Link ID (required for the cockpit, not for bidding)

Worth knowing while you fill this in: **both sides are keyed per device now** —
AppsFlyer on the advertising ID, PostHog on ANDROID_ID — so a storage-cleaner
app wiping the game's data no longer turns one returning phone into a
brand-new player, and retention survives the wipe. (Block Hero was counting
306 players on 213 devices before this.)

- [ ] **Create the Google Ads Link ID** — needs Google *admin* access, and there
      is no API for it: [Google Ads](https://ads.google.com) → **Data manager** →
      Connect product → **Third-party app analytics** → Create link ID →
      provider **AppsFlyer**, platform **Android**, this app → Create. Paste the
      id back to the agent (it is not a secret) and it re-runs the script with
      it. One per app — Android and iOS of the same game need different ones.
      Skip this and AppsFlyer files Google-driven installs as Organic, so the
      cockpit looks dead even when Play download tracking on the campaign is
      healthy. Not retroactive: do it before the first campaign spends anything.

      The "Create a new link to your provider" dialog, every field:

      | Field | Value |
      |---|---|
      | App analytics provider | **AppsFlyer** |
      | Select your mobile app's platform | **Android** |
      | Look up your app | Paste the Play URL, `https://play.google.com/store/apps/details?id=games.misaligned.outofruin` — **not** the app name. A name search finds nothing until the listing is live, and the dialog only says "enter the Google Play Store URL directly" |

      Then **Create link ID** and relay the id.

      **Only once production review has passed.** Before the listing is public
      neither the name nor the URL resolves, and **Create link ID** stays greyed
      out with no error. Check first:
      `curl -s -o /dev/null -w "%{http_code}" "https://play.google.com/store/apps/details?id=games.misaligned.outofruin"`
      must print 200 — on 404, park this step until Google's approval email and
      don't send the human into the dialog.
- [ ] Confirm it landed: [HQ](https://hq1.appsflyer.com/partner-marketplace) →
      the app → Partner Marketplace → Google Ads → Integration shows the link ID
      and **install postbacks ON**. If the field is empty, tell the agent — the
      API parameter name it used needs overriding, the step isn't done.
- [ ] Only if the agent reported `FAILED to copy <partner>`: that network has
      never been switched on for the template app. Enable it once
      ([Partner Marketplace](https://hq1.appsflyer.com/partner-marketplace)) and
      tell the agent to re-run — every future game inherits it after that.
- [ ] Only if the agent reported HTTP 401/403 from AppsFlyer: its token is a
      reporting token, and app management is admin-scoped. An admin mints a V2
      token (HQ → Security centre → API tokens) and hands it over as
      `APPSFLYER_API_TOKEN`; tokens minted before 2026-03-10 are all revoked.
- [ ] Dev key: NOTHING to paste — it's account-level and already the org
      Actions secret `VITE_APPSFLYER_DEV_KEY` (same key for every app). If it
      ever goes missing, an admin runs:
      `gh secret set VITE_APPSFLYER_DEV_KEY --org ai-asylum --visibility all`

## 3. Keystore — nothing to do (shared org upload key)
Signing uses the ORG-wide upload keystore (org secrets
`ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD`) — Play App Signing
makes the upload key resettable, so one shared key is fine. **Do NOT generate
a per-repo keystore.** Only if the org secret is missing entirely, an admin
creates it once:
- `keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
- `base64 -i upload.jks | gh secret set ANDROID_KEYSTORE_BASE64 --org ai-asylum --visibility all`
- `gh secret set ANDROID_KEYSTORE_PASSWORD --org ai-asylum --visibility all`

## 4. Live updates (OTA) — nothing to click, one rule to hold
This game wired OTA (`port/src/systems/live-updates.ts`, docs/ota-updates.md). Play permits it: the ban on
downloading executable code exempts JavaScript interpreted in a WebView. The
condition is that **the app stays the product that was reviewed** — fixes,
content and tuning travel OTA; a change to what the app *is*, or anything meant
to get around a review decision, does not. One bundle is never worth the org's
Play account.

- [ ] Know that this first release is what *enables* OTA: the updater plugin has
      to ship inside the shell, so players on older builds keep the old bundle
      until they update from the store.
- [ ] Native changes still come here. A new plugin or permission needs a Play
      release, and the PR that adds it must raise `minNative` in
      `game/ota-version.json` — otherwise older shells take a bundle that calls a plugin
      they don't have and crash on launch.

## 5. Native authentication — only if the game has sign-in
- [ ] Add `games.misaligned.outofruin://auth/callback` to Supabase Auth → URL Configuration →
      Redirect URLs (exact string; the agent already put it in the manifest)
- [ ] Verify Google sign-in on a physical Android device: fresh install,
      cancellation, warm resume, cold-start callback, sign-out, sign-in again

## Hand back to the agent
Re-run the `Android Build` workflow (Actions → Run workflow). With the secrets
in place it builds a signed AAB and uploads to the internal track automatically
from now on. Comment "done" on the task/issue so the run gets verified.
