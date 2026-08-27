/* ============================================================================
   Canonical homes for blog articles that also exist as their own static page.
   ----------------------------------------------------------------------------
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
   ========================================================================== */
(function (root) {
  'use strict';

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

  /* Returns the static page for a blog id, or null if the article only exists
     in the database. `redirect_url` on the row always wins over this map. */
  function staticPageFor(id) {
    if (id === null || id === undefined) return null;
    return CANONICAL_ARTICLE_PAGE[String(id)] || null;
  }

  root.HTIBlogRoutes = {
    map: CANONICAL_ARTICLE_PAGE,
    staticPageFor: staticPageFor
  };
})(window);
