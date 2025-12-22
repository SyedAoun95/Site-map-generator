export function buildSitemapHtml(data) {
  const sections = [
    { key: "products", title: "Products" },
    { key: "collections", title: "Collections" },
    { key: "pages", title: "Pages" },
    { key: "blogs", title: "Blogs" },
  ];

  let html = `
    <div class="html-sitemap">
      <h1>HTML Sitemap</h1>
      <p>This page provides an organized list of important pages on this website.</p>
  `;

  for (const section of sections) {
    const items = data[section.key] || [];
    if (!items.length) continue;

    html += `<h2>${section.title}</h2>`;
    html += `<ul>`;

    for (const item of items) {
      html += `
        <li>
          <a href="${item.url}">
            ${item.title}
          </a>
        </li>
      `;
    }

    html += `</ul>`;
  }

  html += `</div>`;
  return html;
}
