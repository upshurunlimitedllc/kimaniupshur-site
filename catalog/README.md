# Catalog manifest — how the website catalog stays accurate

**Single source of truth:** the published title pages on disk (`books/`,
`kids/`, `teens/`). `manifest.json` in this folder is generated from them by
`tools/build_catalog.py`; every other catalog surface is derived from the
same scan, so the numbers cannot drift apart.

## Surfaces generated from the manifest scan

| Surface | File | Contents |
|---|---|---|
| Bookshelf carousel | `bookshelf/books-data.js` + `bookshelf/thumbs/` | one entry per unique published title |
| Homepage search | `index.html` (`const BOOKS`) | title + page URL + category for every title |
| A–Z index | `books/index.html` letter sections | every adult (`books/`) title |
| Sitemap | `sitemap.xml` | redirect-stub URLs removed; canonicals kept |

## Rules

- Redirect stubs (noindex meta-refresh pages) are not titles. They are listed
  in the manifest's `stubs` array with their canonical target and are excluded
  from the carousel, search, A–Z, and sitemap.
- A title whose page has no cover file keeps an honest missing-cover status
  (`img: null`, `has_cover: false`). Covers are never fabricated.
- `purchasable` / `purchase_links` in the manifest are measured from each
  page's own verified direct retailer links; Coming Soon or unavailable
  books are never marked purchasable.
- Existing display texts (carousel titles, search categories, A–Z anchor
  texts) are preserved verbatim; generation only adds missing entries and
  removes stub entries.

## Adding a new book (repeatable process)

1. Publish the book's page at `books/<slug>/` (or `kids/` / `teens/`) with its
   cover at `books/<slug>/cover.jpg` and its `/categories/<id>/` link, like
   existing pages.
2. Run `python3 tools/build_catalog.py` — it adds the title to the carousel
   (generating its thumbnail), homepage search, A–Z index, and manifest, and
   validates that all surfaces agree.
3. Run `python3 tools/build_catalog.py --check` in review to prove no drift.
4. Deploy through the normal branch → PR → merge flow with the purchase-path
   safety gate inline.
