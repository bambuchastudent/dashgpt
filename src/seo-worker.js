import appWorker from "./worker.js";
import {
  decorateSeoResponse,
  permanentDemoRedirect,
  robotsResponse,
  sitemapResponse
} from "./seo.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/demo") {
      return permanentDemoRedirect(request);
    }
    if (url.pathname === "/robots.txt") return robotsResponse(request);
    if (url.pathname === "/sitemap.xml") return sitemapResponse(request);

    const response = await appWorker.fetch(request, env, ctx);
    return decorateSeoResponse(request, response);
  }
};
