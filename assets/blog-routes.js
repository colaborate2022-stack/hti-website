/* ============================================================================
   Where a blog article really lives, and which file its cover really is.
   ----------------------------------------------------------------------------
   Both maps below exist for the same reason: the `blogs` table holds a value
   this repo cannot change, and the value is wrong for the reader.

   blog.html reads this at runtime and tools/build-blog-index.js reads it at
   build time, so the cards baked into the page and the cards the page paints
   after it refreshes itself can never disagree.

   blog-post.html, magazine-blog.html and immersive-blog.html render an article,
   not a listing, and use the covers at full width. coverFor() is not for them:
   the `-card.webp` files it points at are 900 px and cropped to the shape of a
   card, which is the wrong picture for a hero. magazine-blog.html does carry a
   strip of related-article cards that would benefit, and is worth wiring up
   separately. staticPageFor() has no such caveat - blog-post.html and
   magazine-blog.html already call it.
   ========================================================================== */
(function (root) {
  'use strict';

  /* --------------------------------------------------------------------------
     1. CANONICAL ARTICLE PAGES

     Fourteen articles in the `blogs` table are duplicates of a hand-built static
     page that is already in the sitemap, already properly titled, and already
     faster than the database-rendered version. Before this map existed, the blog
     listing linked at the database copy, so the static pages had zero inbound
     links and the two copies competed with each other in search.

     Every pair below was confirmed by comparing the article text in the database
     against the text on the page - the twelve straightforward ones share 65-84%
     of their four-word phrases. Two needed a manual check because the static page
     was rewritten after it was first published, so the wording drifted:

       id 52 -> yazu.html          13% overlap, but both are the Ranbir Nagpal /
                                   Yazu Fine Dining interview.
       id 57 -> what-is-kpis.html  32% overlap, but both carry the identical
                                   description and the same 12-KPI list; the
                                   static page was restructured as a timeline.

     The permanent fix is to set `redirect_url` on these rows in the database, at
     which point this map can be deleted - blog.html and blog-post.html both
     honour `redirect_url` on their own. Until then this keeps the routing right
     without a schema change.
     ------------------------------------------------------------------------ */
  var CANONICAL_ARTICLE_PAGE = {
    38: 'customer-service-heart.html',
    40: 'skills-hospitality.html',
    48: 'vishal-gupta.html',
    49: 'housekeeping-training.html',
    51: 'pankaj-gupta.html',
    52: 'yazu.html',
    53: 'food-production-jargon.html',
    54: 'housekeeping-jargon.html',
    55: 'fb-jargon.html',
    56: 'front-office-jargon.html',
    57: 'what-is-kpis.html',
    58: 'hospitality-guests-feel.html',
    59: 'customer-service-hospitality.html',
    60: 'front-office-skills.html'
  };

  /* --------------------------------------------------------------------------
     2. CARD-SIZED COVERS

     blog.html was 1.9 MB and took about 5.2s to paint its largest element on a
     throttled phone. Ten of those megabytes were cover images, because the
     `thumbnail_url` column points at whatever file the article was designed
     with rather than something a 373 px card needs:

       pankaj-gupta-blog-thumbnail.svg   1,051 KB   a 1049x1398 JPEG, base64'd
                                                    inside an SVG wrapper and
                                                    clipped to a 315x150 artboard
       blog-20-thumbnail.svg               992 KB   the same photo embedded twice
       02-hti-training-session...jpg       290 KB   a 1920x933 article hero
       hero-section.png                    226 KB   a 455x320 photo saved as PNG

     tools/build-blog-thumbnails.js re-encodes each one to a 900 px WebP sibling
     named `<basename>-card.webp` - 9,971 KB of covers down to 839 KB, with the
     originals left alone so the article pages that share three of these heroes
     still get the full-size photograph.

     This map is what points the listing at them. It is keyed on path, not on
     blog id, so it holds whichever row or hand-written page happens to name the
     file. Delete an entry only when the matching `thumbnail_url` has been
     repointed in the blog admin; delete the whole map once they all have.
     ------------------------------------------------------------------------ */
  var ASSET_REWRITE = {
    // Photographs wrapped in an SVG.
    'images/blog/thumbnails/pankaj-gupta-blog-thumbnail.svg':
      'images/blog/thumbnails/pankaj-gupta-blog-thumbnail-card.webp',
    'images/blog/thumbnails/blog-20-thumbnail.svg':
      'images/blog/thumbnails/blog-20-thumbnail-card.webp',
    'images/blog/food-production-jargon/4-food-production-department.svg':
      'images/blog/food-production-jargon/4-food-production-department-card.webp',
    'images/blog/thumbnails/ranvir-nagpal-blog-thumbnail.svg':
      'images/blog/thumbnails/ranvir-nagpal-blog-thumbnail-card.webp',
    'images/blog/fb-jargon/2-f-b-department.svg':
      'images/blog/fb-jargon/2-f-b-department-card.webp',
    'images/blog/agnibh-mudi/corporate-chef-agnibh-mudi.svg':
      'images/blog/agnibh-mudi/corporate-chef-agnibh-mudi-card.webp',
    'images/blog/housekeeping-jargon/1-housekeeping-department.svg':
      'images/blog/housekeeping-jargon/1-housekeeping-department-card.webp',
    'images/blog/front-office-jargon/3-front-office-department.svg':
      'images/blog/front-office-jargon/3-front-office-department-card.webp',
    'images/blog/thumbnails/blog-16-thumbnail.svg':
      'images/blog/thumbnails/blog-16-thumbnail-card.webp',
    'images/blog/thumbnails/blog-21-thumbnail.svg':
      'images/blog/thumbnails/blog-21-thumbnail-card.webp',
    'images/blog/thumbnails/abhijeet-bagwe-blog-thumbnail.svg':
      'images/blog/thumbnails/abhijeet-bagwe-blog-thumbnail-card.webp',

    // Logo sheets wrapped in an SVG - blog-4.svg holds eight PNGs, four of them
    // a second copy feeding a mask.
    'images/blog/fostac/blog-4.svg':
      'images/blog/fostac/blog-4-card.webp',
    'images/blog/what-is-kpis/blog-5-what-is-kpis.svg':
      'images/blog/what-is-kpis/blog-5-what-is-kpis-card.webp',

    // Article heroes doubling as covers. The source keeps its full size.
    'images/blog/hti-training-programs/02-hti-training-session-hospitality-team.jpg':
      'images/blog/hti-training-programs/02-hti-training-session-hospitality-team-card.webp',
    'images/blog/food-cost-percentage/01-butter-chicken-plate-food-cost.jpg':
      'images/blog/food-cost-percentage/01-butter-chicken-plate-food-cost-card.webp',
    'images/blog/food-cost-percentage/04-ladle-portion-control-kitchen.jpg':
      'images/blog/food-cost-percentage/04-ladle-portion-control-kitchen-card.webp',

    // Photographs saved as PNG.
    'images/blog/thumbnails/2602-hti-blogs-22-for-open-graph-image.png':
      'images/blog/thumbnails/2602-hti-blogs-22-for-open-graph-image-card.webp',
    'images/blog/thumbnails/hero-section.png':
      'images/blog/thumbnails/hero-section-card.webp',
    'images/blog/what-is-hospitality/blogs-2-for-thumbnails.png':
      'images/blog/what-is-hospitality/blogs-2-for-thumbnails-card.webp',
    'images/blog/sanjay-vazirani/1.png':
      'images/blog/sanjay-vazirani/1-card.webp',
    'images/team/vishal-gupta-blog-thumbnail.png':
      'images/team/vishal-gupta-blog-thumbnail-card.webp'
  };

  // ---------------------------------------------------------------------------

  /* Returns the static page for a blog id, or null if the article only exists
     in the database. `redirect_url` on the row always wins over this map. */
  function staticPageFor(id) {
    if (id === null || id === undefined) return null;
    return CANONICAL_ARTICLE_PAGE[String(id)] || null;
  }

  /* Turns a raw thumbnail_url / cover_image into the URL a card should load.

     Two things happen here, and both used to be copy-pasted into four pages:

     1. The domain comes off. These are our own files, but the database stores
        them as absolute https://www.hti-india.com/... URLs. Served that way the
        browser treats them as a separate origin and spends a DNS lookup and a
        TLS handshake before the largest image on the page can start.
     2. The heavy original is swapped for its card-sized sibling, per the map
        above.

     Anything unrecognised passes through untouched, so an article published
     tomorrow with a sensible cover needs no change here. */
  function coverFor(url) {
    var p = String(url == null ? '' : url)
      .replace(/^https?:\/\/(www\.)?hti-india\.com\//i, '')
      .replace(/^\.?\//, '');
    if (!p) return '';
    var q = '';
    var cut = p.search(/[?#]/);
    if (cut !== -1) {
      q = p.slice(cut);
      p = p.slice(0, cut);
    }
    return (ASSET_REWRITE[p] || p) + q;
  }

  root.HTIBlogRoutes = {
    map: CANONICAL_ARTICLE_PAGE,
    assets: ASSET_REWRITE,
    staticPageFor: staticPageFor,
    coverFor: coverFor
  };
})(window);
