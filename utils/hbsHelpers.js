const Handlebars = require("handlebars");
const config = require("../config/env");

// URLSearchParams already percent-encodes; only & and " matter inside href="...".
const escapeAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

module.exports = {
  inc: (value) => parseInt(value, 10) + 1,
  eq: (a, b) => a == b,
  // {{#if (oneOf status "processing" "Shipped")}}; the last argument is Handlebars' options.
  oneOf: (value, ...rest) => rest.slice(0, -1).includes(value),

  // Cloudinary URL for an uploaded image's public id. Old banners stored a
  // local file name ("1690000000000-photo.jpg") whose file no longer exists,
  // so those fall back to the template's default banner.
  img: (publicId) =>
    typeof publicId === "string" && publicId && !/^\d{13}-/.test(publicId)
      ? `https://res.cloudinary.com/${config.cloudinary.cloudName}/image/upload/${encodeURI(publicId)}`
      : "/images/img/banner-1.jpg",

  // Page links that keep the current search, category, price and sort filters.
  // `query` is the request's query object (without `page`).
  pagination(totalPages, currentPage, query) {
    const total = parseInt(totalPages, 10) || 0;
    const current = parseInt(currentPage, 10) || 1;
    const base = { ...(query && typeof query === "object" ? query : {}) };
    delete base.page;

    const href = (page) => escapeAttr(`?${new URLSearchParams({ ...base, page }).toString()}`);
    let html = "";
    if (current > 1) {
      html += `<span> <a class="me-3 text-dark fw-bold" href="${href(current - 1)}">Previous</a> </span>`;
    }
    for (let i = 1; i <= total; i++) {
      const active = i === current ? ' style="font-weight:bold"' : "";
      html += `<span class="product_pagination"><a href="${href(i)}"${active}>${i}</a> </span>`;
    }
    if (current < total) {
      html += `<span> <a class="text-dark fw-bold" href="${href(current + 1)}">Next</a> </span>`;
    }
    return new Handlebars.SafeString(html);
  },
};
