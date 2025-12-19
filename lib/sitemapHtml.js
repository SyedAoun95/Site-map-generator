export function buildSitemapHtml({ products = [], collections = [], pages = [], blogs = [] }) {
  const section = (title, items) => {
    if (!items.length) return "";

    const rows = items
      .map(
        (url) =>
          `<li><a href="${url}"  rel="noopener">${url}</a></li>`
      )
      .join("");

    return `
      <section style="margin-bottom:32px">
        <h2>${title}</h2>
        <ul>${rows}</ul>
      </section>
    `;
  };

  return `
    <div class="html-sitemap">
      <h1>HTML Sitemap</h1>
      ${section("Products", products)}
      ${section("Collections", collections)}
      ${section("Pages", pages)}
      ${section("Blogs", blogs)}
    </div>
  `;
}
