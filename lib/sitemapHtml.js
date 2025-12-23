export function buildSitemapHtml({
  pages = [],
  collections = [],
  products = [],
  blogs = [],
}) {
  const section = (title, items, limit) => {
    if (!items.length) return "";

    return `
      <section class="sitemap-section">
        <h2 class="sitemap-heading">${title}</h2>

        <ul class="sitemap-list">
          ${items
            .map(
              (item, index) => `
                <li class="sitemap-item ${index >= limit ? "sitemap-hidden" : ""}">
                  <a href="${item.url}">${item.title}</a>
                </li>
              `
            )
            .join("")}
        </ul>

        ${
          items.length > limit
            ? `<span class="sitemap-toggle" data-limit="${limit}">
                See more
              </span>`
            : ""
        }
      </section>
    `;
  };

  return `
    <style>
      /* 🌿 Base – theme aware */
      .html-sitemap {
        max-width: 1400px;
        margin: 0 auto;
        padding: 32px 20px;
        font-family: inherit;
        color: inherit;
      }

      .html-sitemap p {
        margin-bottom: 40px;
        max-width: 900px;
        line-height: 1.6;
        font-size: 1rem;
      }

      /* Sections */
      .sitemap-section {
        margin-bottom: 48px;
      }

      .sitemap-heading {
        font-size: 1.4rem;
        font-weight: 700;
        margin-bottom: 18px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      /* Grid – max 4 columns */
      .sitemap-list {
        list-style: disc;
        padding-left: 18px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px 28px; /* 👈 tight vertical spacing */
      }

      /* Responsive */
      @media (max-width: 1100px) {
        .sitemap-list {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 800px) {
        .sitemap-list {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 500px) {
        .sitemap-list {
          grid-template-columns: 1fr;
        }
      }

      .sitemap-item a {
        color: inherit;
        text-decoration: none;
        font-size: 0.95rem;
        line-height: 1.45;
      }

      .sitemap-item a:hover {
        text-decoration: underline;
      }

      .sitemap-hidden {
        display: none;
      }

      /* See more – text style (not button) */
      .sitemap-toggle {
        display: inline-block;
        margin-top: 14px;
        font-size: 0.9rem;
        cursor: pointer;
        text-decoration: underline;
        opacity: 0.75;
      }

      .sitemap-toggle:hover {
        opacity: 1;
      }
    </style>

    <div class="html-sitemap">
      <p>
        This sitemap helps visitors quickly explore important pages,
        collections, products, and blog content available on this store.
      </p>

      ${section("Pages", pages, 30)}
      ${section("Collections", collections, 100)}
      ${section("Products", products, 150)}
      ${section("Blogs", blogs, 200)}
    </div>

    <script>
      document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll(".sitemap-toggle").forEach(toggle => {
          toggle.addEventListener("click", function () {
            const section = this.previousElementSibling;
            section.querySelectorAll(".sitemap-hidden").forEach(item => {
              item.style.display = "list-item";
            });
            this.remove();
          });
        });
      });
    </script>
  `;
}
