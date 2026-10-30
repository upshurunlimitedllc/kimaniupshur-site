# Shelf exclusions — not-for-sale titles (owner directive 2026-10-30)

The storefront showcases books customers can actually purchase or download.
The titles below are published pages whose books are **not for sale in any
format** (no verified ebook, audiobook, or retailer listing). They are
excluded from every shopping-shelf surface while everything else about
them is preserved.

## What the exclusion applies to

- `assets/search-index.js` — the shared shelf/search dataset: the entries
  are removed (homepage shelves, the `/search/` browse grid, and the site
  search suggestions all read this file).
- `bookshelf/books-data.js` — the 3D bookshelf carousel: entries and
  collection memberships are removed, counts recomputed.
  `tools/build_catalog.py` carries the same list as
  `SHELF_EXCLUDED_SLUGS` and applies it on every regeneration, so a
  catalog rebuild never re-shelves them.
- `categories/*/index.html` — the static category grids: the titles' card
  anchors and their JSON-LD `ItemList` entries are removed
  (`numberOfItems` and positions recomputed).

## What is preserved (never deleted)

- The product pages themselves (each keeps its accurate "No purchase link
  is currently available" status), their covers and files.
- `catalog/manifest.json` title records, the `books/index.html` A–Z index,
  and `sitemap.xml` entries.

## For the website sync program

Any regeneration of the surfaces above must apply this exclusion list.
The website sync pipeline should treat these URLs the way it treats
redirect stubs: real pages, no shelf membership. When a title on this
list is published for sale, remove it from this list and from
`SHELF_EXCLUDED_SLUGS` in the same pass that wires its purchase links and
price key — its card then returns with working destinations.

**Scheduled return:** *Boundaries 2* (`/books/boundaries-2-made-simple/`)
is fully packaged and returns at its publication wiring as soon as its
cover banks and the re-embed lands.

## The list (55 URLs)

- /books/adaptive-behavior-made-simple/
- /books/adaptive-decision-making-made-simple/
- /books/adaptive-leadership-made-simple/
- /books/adaptive-thinking-made-simple/
- /books/ai-and-business-made-simple/
- /books/ai-and-cryptocurrency-made-simple/
- /books/attention-control-made-simple/
- /books/attention-systems-made-simple/
- /books/behavioral-economics-made-simple/
- /books/behavioral-intelligence-made-simple/
- /books/boundaries-2-made-simple/
- /books/cognitive-adaptation-made-simple/
- /books/cognitive-friction-made-simple/
- /books/cognitive-systems-made-simple/
- /books/competition-made-simple/
- /books/dating-made-simple/
- /books/decision-clarity-made-simple/
- /books/decision-pressure-made-simple/
- /books/decision-systems-made-simple/
- /books/hidden-errors-made-simple/
- /books/high-quality-thinking-made-simple/
- /books/human-behavior-made-simple/
- /books/human-systems-made-simple/
- /books/in-laws-made-simple/
- /books/inflammatory-made-simple/
- /books/info-ecology-made-simple/
- /books/info-filtering-made-simple/
- /books/info-war-made-simple/
- /books/information-dynamics-made-simple/
- /books/information-strategy-made-simple/
- /books/lie-detector-made-simple/
- /books/lonely-made-simple/
- /books/machine-learning-made-simple/
- /books/mental-clarity-made-simple/
- /books/mental-frameworks-made-simple/
- /books/mental-recovery-made-simple/
- /books/minimalist-made-simple/
- /books/nuclear-energy-made-simple/
- /books/podcasts-made-simple/
- /books/psychological-resilience-made-simple/
- /books/quitting-made-simple/
- /books/rejection-made-simple/
- /books/relationships-fail-made-simple/
- /books/resilient-systems-made-simple/
- /books/resilient-thinking-made-simple/
- /books/strategic-judgment-made-simple/
- /books/strategic-systems-made-simple/
- /books/strategic-thinking-under-pressure-made-simple/
- /books/tired-made-simple/
- /books/wheres-my-money-made-simple/
- /books/why-your-decisions-fail/
- /books/you-are-the-bottleneck/
- /books/your-attention-is-being-sold/
- /books/youre-not-a-smart-made-simple/
- /books/youre-overthinking-everything/
