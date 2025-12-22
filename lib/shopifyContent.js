export async function fetchShopifyContent({ shop, accessToken }) {
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };

  const fetchAll = async (endpoint, key) => {
    const res = await fetch(
      `https://${shop}/admin/api/2025-01/${endpoint}.json`,
      { headers }
    );
    const data = await res.json();
    return data[key] || [];
  };

  const [products, collections, pages, blogs] = await Promise.all([
    fetchAll("products", "products"),
    fetchAll("collections", "collections"),
    fetchAll("pages", "pages"),
    fetchAll("blogs", "blogs"),
  ]);

  return {
    products: products.map(p => ({
      title: p.title,
      url: `/products/${p.handle}`,
    })),
    collections: collections.map(c => ({
      title: c.title,
      url: `/collections/${c.handle}`,
    })),
    pages: pages.map(p => ({
      title: p.title,
      url: `/pages/${p.handle}`,
    })),
    blogs: blogs.map(b => ({
      title: b.title,
      url: `/blogs/${b.handle}`,
    })),
  };
}
