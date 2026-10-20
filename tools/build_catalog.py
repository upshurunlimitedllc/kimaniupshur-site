#!/usr/bin/env python3
"""build_catalog.py — ONE catalog manifest + generation/validation for upshurunlimitedllc.com.

Authoritative source = the published title pages on disk (books/, kids/, teens/).
Everything else is DERIVED from them:

  catalog/manifest.json     the single catalog manifest (this script writes it)
  bookshelf/books-data.js   the 3D bookshelf carousel data (regenerated)
  bookshelf/thumbs/*.jpg    cover thumbnails for carousel entries (generated)
  index.html                homepage search index (const BOOKS) synced
  books/index.html          A-Z index sections regenerated (adult books)
  sitemap.xml               redirect-stub URLs removed

Rules (owner directive 2026-10-15):
  * Redirect stubs (noindex meta-refresh pages) are NOT titles; they are
    recorded in the manifest's "stubs" list with their canonical target.
  * A book with no cover file keeps an honest missing-cover status
    (img = null). Covers are never fabricated.
  * Purchase status in the manifest is measured from each page's own
    verified direct retailer links; Coming Soon / unavailable books are
    never marked purchasable.
  * Existing carousel/search/A-Z display texts are preserved verbatim;
    only missing entries are added and stub entries removed.

Usage:
  python3 tools/build_catalog.py           # regenerate everything + report
  python3 tools/build_catalog.py --check   # validate only; exit 1 on drift
"""
import json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECTIONS = ["books", "kids", "teens"]
PURCHASE_PATTERNS = [
    r"play\.google\.com/store/(?:books|audiobooks)/details",
    r"books\.apple\.com/[^\s\"']*id\d{6,}",
    r"payhip\.com/b/[\w\-]+",
    r"gumroad\.com/l/[\w\-]+",
    r"amazon\.com/(?:dp|gp/product)/[A-Z0-9]{10}",
]
COLLECTION_LABELS = {  # homepage-search display names per collection id
    "christian-living": "Christian Living", "bible-study": "Bible Study",
    "faith-doctrine": "Faith & Doctrine", "prayer-worship": "Prayer & Worship",
    "church-ministry": "Church & Ministry", "bible-people": "Bible People & Stories",
    "family-relationships": "Family & Relationships",
    "personal-growth": "Personal Growth", "business-leadership": "Business & Leadership",
    "money-finance": "Money & Finance", "health-wellness": "Health & Wellness",
    "tech-ai": "Tech & AI", "fiction": "Fiction", "box-sets": "Box Sets & Collections",
    "kids": "Kids (Ages 6-12)", "teens": "Teens (13-18)", "all": "Books",
}


def clean_title(h1):
    t = re.sub(r"<[^>]+>", "", h1 or "")
    return re.sub(r"\s+", " ", t).strip()


def scan_pages():
    titles, stubs = {}, {}
    for section in SECTIONS:
        base = os.path.join(ROOT, section)
        for name in sorted(os.listdir(base)):
            f = os.path.join(base, name, "index.html")
            if not os.path.isfile(f):
                continue
            html = open(f, encoding="utf-8", errors="replace").read()
            url = f"/{section}/{name}/"
            m = re.search(r'http-equiv="refresh"\s+content="0;url=([^"]+)"', html)
            if m and 'name="robots" content="noindex' in html:
                stubs[url] = {"url": url, "canonical": m.group(1),
                              "file": f"{section}/{name}/index.html"}
                continue
            h1 = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
            og = re.search(r'property="og:image" content="([^"]+)"', html)
            cover = None
            if og:
                cover = re.sub(r"https://(?:kimaniupshur\.com|upshurunlimitedllc\.com)", "", og.group(1))
                if not os.path.isfile(os.path.join(ROOT, cover.lstrip("/"))):
                    cover = None
            nlinks = sum(len(re.findall(p, html)) for p in PURCHASE_PATTERNS)
            cats = [c for c in re.findall(r'href="/categories/([a-z0-9\-]+)/"', html)]
            titles[url] = {
                "slug": name, "title": clean_title(h1.group(1) if h1 else name),
                "url": url, "section": section,
                "cover": cover, "has_cover": cover is not None,
                "purchase_links": nlinks, "purchasable": nlinks > 0,
                "coming_soon": ("Coming Soon" in html and nlinks == 0),
                "category_links": cats,
            }
    return titles, stubs


def load_bookshelf():
    raw = open(os.path.join(ROOT, "bookshelf/books-data.js"), encoding="utf-8").read()
    return json.loads(raw.replace("window.BOOKSHELF_DATA=", "", 1).rstrip().rstrip(";"))


def main():
    check_only = "--check" in sys.argv
    titles, stubs = scan_pages()
    bd = load_bookshelf()
    coll_ids = [c["id"] for c in bd["collections"]]
    books, order = bd["books"], bd["order"]

    # --- drop stub entries (e.g. agi-made-simple duplicates its canonical) ---
    removed = []
    by_url = {b["u"]: s for s, b in books.items()}
    for surl in stubs:
        if surl in by_url:
            s = by_url[surl]
            removed.append(s)
            del books[s]
            for cid in order:
                if s in order[cid]:
                    order[cid].remove(s)

    # --- add missing titles ---
    have = {b["u"] for b in books.values()}
    added, unmapped = [], []
    for url in sorted(titles):
        t = titles[url]
        if url in have:
            continue
        slug = t["slug"]
        assert slug not in books, f"slug key collision: {slug}"
        img = f"/bookshelf/thumbs/{slug}.jpg" if t["has_cover"] else None
        books[slug] = {"t": t["title"], "u": url, "img": img}
        if t["section"] == "books":
            order["all"].append(slug)
            cat = next((c for c in t["category_links"]
                        if c in coll_ids and c not in ("all", "kids", "teens")), None)
            if cat:
                order[cat].append(slug)
            else:
                unmapped.append(url)
        else:
            order[t["section"]].append(slug)
        added.append(url)

    # --- page-link primacy ---
    # A title whose page declares exactly ONE category belongs to that
    # category, even if a stale carousel membership says otherwise.
    # (Fixes the tranche template defect that filed 12 titles under
    # Faith & Doctrine, + 1 legacy case: Overcoming Addiction.)
    for url, t in titles.items():
        distinct = sorted(set(t["category_links"]))
        if t["section"] != "books" or len(distinct) != 1:
            continue
        cat = distinct[0]
        if cat not in coll_ids or cat in ("all", "kids", "teens"):
            continue
        for cid in order:
            if cid not in ("all", "kids", "teens") and t["slug"] in order[cid]:
                order[cid].remove(t["slug"])
        if t["slug"] not in order[cat]:
            order[cat].append(t["slug"])

    for cid in order:  # deterministic: slug-sorted lists
        order[cid] = sorted(set(order[cid]))
    books = {k: books[k] for k in sorted(books)}
    for c in bd["collections"]:
        ss = order[c["id"]]
        c["count"] = len(ss)
        c["withCovers"] = sum(1 for s in ss if books[s].get("img"))

    # Collection per title, from the FINAL orders: topical collections win;
    # the 'all'/'kids'/'teens' shelves are fallbacks only. (Two passes —
    # a single first-match pass lets the 'all' shelf shadow real topics.)
    slug_coll = {}
    for c in bd["collections"]:
        if c["id"] in ("all", "kids", "teens"):
            continue
        for s in order[c["id"]]:
            slug_coll.setdefault(s, c["id"])
    for t in titles.values():
        if t["slug"] not in slug_coll:
            slug_coll[t["slug"]] = t["section"] if t["section"] in ("kids", "teens") else "all"
        t["collection"] = slug_coll[t["slug"]]

    manifest = {
        "generated_from": "published title pages on disk (books/, kids/, teens/)",
        "counts": {
            "unique_published_titles": len(titles),
            "redirect_stubs_excluded": len(stubs),
            "carousel_entries": len(books),
            "carousel_with_covers": sum(1 for b in books.values() if b.get("img")),
            "missing_covers": [t["url"] for t in titles.values() if not t["has_cover"]],
        },
        "titles": [titles[u] for u in sorted(titles)],
        "stubs": [stubs[u] for u in sorted(stubs)],
    }

    if check_only:
        errs = validate(bd, titles, stubs)
        print("\n".join(errs) if errs else "CHECK PASS: all catalog surfaces agree")
        return 1 if errs else 0

    # --- thumbs for new entries ---
    for url in added:
        t = titles[url]
        if t["has_cover"]:
            src = os.path.join(ROOT, t["cover"].lstrip("/"))
            dst = os.path.join(ROOT, "bookshelf/thumbs", t["slug"] + ".jpg")
            im = Image.open(src).convert("RGB")
            im.resize((440, 704), Image.LANCZOS).save(dst, quality=85, optimize=True)

    # --- books-data.js ---
    out = "window.BOOKSHELF_DATA=" + json.dumps(
        {"pageBase": bd["pageBase"], "collections": bd["collections"],
         "books": books, "order": order},
        separators=(",", ":"), ensure_ascii=False) + ";\n"
    open(os.path.join(ROOT, "bookshelf/books-data.js"), "w", encoding="utf-8").write(out)

    sync_homepage_search(titles)
    sync_az_index(titles, stubs)
    sync_sitemap(stubs)

    os.makedirs(os.path.join(ROOT, "catalog"), exist_ok=True)
    json.dump(manifest, open(os.path.join(ROOT, "catalog/manifest.json"), "w"),
              indent=1, ensure_ascii=False)

    print(f"titles={len(titles)} stubs={len(stubs)} carousel={len(books)} "
          f"covers={manifest['counts']['carousel_with_covers']}")
    print(f"added={len(added)} removed_stub_entries={removed} unmapped={unmapped}")
    errs = validate(load_bookshelf(), titles, stubs)
    print("\n".join(errs) if errs else "VALIDATION PASS")
    return 0 if not errs else 1


def sync_homepage_search(titles):
    p = os.path.join(ROOT, "index.html")
    html = open(p, encoding="utf-8").read()
    m = re.search(r"const BOOKS=(\[.*?\]);", html, re.S)
    old = {e[1]: e for e in json.loads(m.group(1))}
    entries = []
    for url in sorted(titles):
        t = titles[url]
        if t["slug"] in old and t["section"] == "books":
            o = old[t["slug"]]
            entries.append([o[0], url, o[2]])
        else:
            entries.append([t["title"], url,
                            COLLECTION_LABELS.get(t["collection"], "Books")])
    entries.sort(key=lambda e: e[0].lower())
    new = "const BOOKS=" + json.dumps(entries, ensure_ascii=False) + ";"
    html = html[:m.start()] + new + html[m.end():]
    html = html.replace("'<a href=\"/books/'+b[1]+'/\">'", "'<a href=\"'+b[1]+'\">'")
    open(p, "w", encoding="utf-8").write(html)


def sync_az_index(titles, stubs):
    p = os.path.join(ROOT, "books/index.html")
    html = open(p, encoding="utf-8").read()
    old = {u: txt for u, txt in
           re.findall(r'<a href="(/books/[^"]+/)">([^<]+)</a>', html)}
    adults = [t for t in titles.values() if t["section"] == "books"]
    by_letter = {}
    for t in adults:
        letter = next((ch.upper() for ch in t["title"] if ch.isalpha()), "#")
        by_letter.setdefault(letter, []).append(t)
    parts = []
    for letter in sorted(by_letter):
        rows = sorted(by_letter[letter], key=lambda t: t["title"].lower())
        anchors = "".join(
            f'<a href="{t["url"]}">{old.get(t["url"], t["title"])}</a>' for t in rows)
        parts.append(f'<h2 class="alpha" id="{letter}">{letter}</h2>'
                     f'<div class="booklist">{anchors}</div>')
    start = html.index('<h2 class="alpha"')
    endmark = html.index("\n</div></main>", start)
    last_close = html.rindex("</div>", start, endmark) + len("</div>")
    html = html[:start] + "".join(parts) + html[last_close:]
    open(p, "w", encoding="utf-8").write(html)


def sync_sitemap(stubs):
    p = os.path.join(ROOT, "sitemap.xml")
    xml = open(p, encoding="utf-8").read()
    for surl in stubs:
        loc = f"<loc>https://upshurunlimitedllc.com{surl}</loc>"
        xml = re.sub(r"<url>[^<]*?" + re.escape(loc) + r".*?</url>\s*", "", xml, flags=re.S)
    open(p, "w", encoding="utf-8").write(xml)


def validate(bd, titles, stubs):
    errs = []
    urls = {b["u"] for b in bd["books"].values()}
    if urls != set(titles):
        errs.append(f"carousel URL set != title set (diff {urls ^ set(titles)})")
    for c in bd["collections"]:
        if c["count"] != len(bd["order"][c["id"]]):
            errs.append(f"collection {c['id']} count mismatch")
    for s, b in bd["books"].items():
        if b.get("img") and not os.path.isfile(os.path.join(ROOT, b["img"].lstrip("/"))):
            errs.append(f"thumb missing for {s}")
    idx = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    n = len(json.loads(re.search(r"const BOOKS=(\[.*?\]);", idx, re.S).group(1)))
    if n != len(titles):
        errs.append(f"homepage search has {n} entries, expected {len(titles)}")
    az = open(os.path.join(ROOT, "books/index.html"), encoding="utf-8").read()
    az_urls = set(re.findall(r'<a href="(/books/[^"]+/)">', az))
    want = {t["url"] for t in titles.values() if t["section"] == "books"}
    if not want <= az_urls:
        errs.append(f"A-Z missing {sorted(want - az_urls)}")
    if set(stubs) & az_urls:
        errs.append(f"A-Z still links stubs {sorted(set(stubs) & az_urls)}")
    sm = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
    for surl in stubs:
        if f"upshurunlimitedllc.com{surl}<" in sm:
            errs.append(f"sitemap still lists stub {surl}")
        can = stubs[surl]["canonical"]
        if can not in sm:
            errs.append(f"sitemap lost canonical {can}")
    return errs


if __name__ == "__main__":
    sys.exit(main())
