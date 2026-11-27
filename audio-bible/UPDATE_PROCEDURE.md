# Audio Bible — Update Procedure (Batch 505, 2026-11-26)

The /audio-bible/ section is data-driven. **Publishing a book is a data update plus a
media seating — never a page rebuild.** All availability flows from one file:
`assets/audio-bible-data.js` (which mirrors Cinematic's tracker,
`youtube-operation/nt-audio-bible/TRACKER.csv`). Statuses use the tracker's vocabulary:
— · RIGHTS · SAMPLE · APPROVED · PRODUCTION · QC · PUBLISHED.

## The model

- 31 languages in tracker order. Each language carries one or more **translation tracks**:
  English has three — `kjv` (King James Version, primary/default), `bsb` (Berean Standard
  Bible), `web` (World English Bible). Spanish has one — `rvr1909`. Other languages carry a
  single `main` track until a qualified translation is added (add a track object; do not
  restructure the language).
- 66 books in canonical order with chapter counts, under `books`.
- `media` — chapter units keyed `<lang>/<track>/<book-slug>/<chapter>`. An entry exists
  ONLY for a PUBLISHED unit. Fields: `mp3` (site MP3 path), `duration` ("mm:ss"),
  `pubDate` (RFC-822), `desc`, `dl` (set `false` only where the translation's rights bar
  downloads; absence means downloads allowed).
- `bookMedia` — complete-book units keyed `<lang>/<track>/<book-slug>`, same fields.

## Availability law (site + feeds, one rule)

A chapter or book presents as playable/downloadable **only** when its unit is PUBLISHED
and seated in `media`/`bookMedia` with an MP3 URL. The page templates render links,
players, and download buttons from those entries alone; the RSS feeds (below) include an
item only for the same entries. Nothing else — no status value, no hand edit — can make a
unit appear available. When in doubt, the unit is not available.

## To publish a book (or chapter)

1. Confirm the unit is PUBLISHED in Cinematic's tracker (QC passed + owner's gate).
2. Seat the **site MP3 copy** at `/audio-bible/media/<lang>/<track>/<book-slug>/<chapter>.mp3`
   (complete-book file: `.../<book-slug>-complete.mp3`). MP3/streaming copies only —
   **lossless masters never seat on the website.**
3. Add the unit's entry to `media` (and `bookMedia` when a complete-book file seats) in
   `assets/audio-bible-data.js`, with duration, publication date, and description; set the
   book's status to `PUBLISHED` in that track's `status` map.
4. Regenerate that language x translation RSS feed (rule below) in the same batch.
5. Ship as one website batch; verify the live chapter page plays and downloads, the book
   page links the chapters, and the feed validates — settled reads in two windows.

## RSS feeds — generation rule

- One feed per language x translation: `/audio-bible/feeds/<lang>-<translation>.xml`
  (lowercase; e.g. `en-kjv.xml`, `en-bsb.xml`, `en-web.xml`, `es-rvr1909.xml`).
- Template: `/audio-bible/feeds/TEMPLATE.xml` (a template, NOT a live feed — never seat a
  copy of it as one). Channel metadata always carries the official website
  `https://upshurunlimitedllc.com` and the flagship section's titles/descriptions family.
- **A live feed file is created only with its feed's first PUBLISHED unit** — never seat a
  zero-item feed. Items follow canonical book order, then chapter order; a complete-book
  item may follow its book's chapters. Item fields come from the unit's `media`/`bookMedia`
  entry; `enclosure length` is the seated MP3's byte size, read at generation time.
- **Enclosures are the site's MP3 copies on upshurunlimitedllc.com — always.** Never a
  lossless master; never an Internet Archive URL.
- The Internet Archive's role is separate: public hosting + download mirror (the same
  MP3s), preservation of the lossless masters per item, and complete-book downloads.
  It is **not** the feed-enclosure source. Keep that division in every population pass.
- Feed registrations and platform submissions are Cinematic's desk, never this procedure's.

## Content rules

- **Promotional content belongs on pages only — nothing is ever embedded in narration
  files.** Narration/media files carry Scripture audio and nothing else.
- Scripture access is free: no registration, membership, payment, or gate language is ever
  added to this section.
- The section landing carries the owner's words verbatim: "God's Word. Every Chapter.
  Every Book. Always Free." and "No registration. No membership. No payment required."
  Do not paraphrase them.

## Navigation

"Audio Bible" sits in the main navigation after "Audiobooks". New framed pages carry it
natively; `assets/uu-menu.js` seats it (idempotently) on every other framed page, the same
mechanism as the Homeschool Resources item, until the repo-wide native markup pass. The
footer link is seated the same way (natively in this section's pages).
