'use client';

import { AppProvider, Banner, BlockStack, InlineStack, Text, Badge } from '@shopify/polaris';
import createApp from '@shopify/app-bridge';
import { Redirect } from '@shopify/app-bridge/actions';
import enTranslations from '@shopify/polaris/locales/en.json';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Package,
  Layers,
  FileText,
  BookOpen,
  Loader2,
  Search,
  ExternalLink,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

const App = () => {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop");

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
const [sitemapResult, setSitemapResult] = useState(null);



  const [activeType, setActiveType] = useState(null); 
  const tableRef = useRef(null);

  const [urlRows, setUrlRows] = useState([]);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const [urlMeta, setUrlMeta] = useState({ total: 0, limited: false });


  const [urlCache, setUrlCache] = useState({
    products: null,
    collections: null,
    pages: null,
    blogs: null,
  });
// ✅ STEP 1: store fetched sitemap URLs for HTML sitemap
const [storedSitemapUrls, setStoredSitemapUrls] = useState({
  products: [],
  collections: [],
  pages: [],
  blogs: [],
});


  const prefetchedRef = useRef(false);
  const prefetchPromiseRef = useRef(null);

  useEffect(() => {
    if (shop) {
      setUrl(`https://${shop}`);
    }
  }, [shop]);


  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shopParam = params.get('shop');
      const host = params.get('host');

      if (!shopParam || !host) return;

      const app = createApp({
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
        host,
        forceRedirect: true,
      });

      fetch(`/api/check-auth?shop=${encodeURIComponent(shopParam)}`)
        .then(res => res.json())
        .then(data => {
          if (!data?.authenticated) {
            const redirect = Redirect.create(app);
            redirect.dispatch(
              Redirect.Action.REMOTE,
              `/api/auth?shop=${encodeURIComponent(shopParam)}`
            );
          }
        })
        .catch(() => {
          const redirect = Redirect.create(app);
          redirect.dispatch(
            Redirect.Action.REMOTE,
            `/api/auth?shop=${encodeURIComponent(shopParam)}`
          );
        });
    } catch (e) {

    }
  }, []);

  useEffect(() => {
    if (results) {
      prefetchAllTypes();
    }

  }, [results]);


  useEffect(() => {
    if (!activeType) return;

    const cached = urlCache?.[activeType];
    if (cached) {
      setUrlRows(cached.urls || []);
      setUrlMeta({ total: cached.total || 0, limited: !!cached.limited });
      setUrlError(null);
      setUrlLoading(false);
    }
  }, [activeType, urlCache]);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Please enter a website URL');
      return;
    }


    setLoading(true);
    setError(null);
    setResults(null);

    setActiveType(null);
    setUrlRows([]);
    setUrlMeta({ total: 0, limited: false });
    setUrlError(null);
    setUrlLoading(false);

    prefetchedRef.current = false;
    prefetchPromiseRef.current = null;
    setUrlCache({ products: null, collections: null, pages: null, blogs: null });

    try {
      let inputUrl = url.trim();
      try {
        inputUrl = new URL(inputUrl).origin;
      } catch (e) {}

      const response = await fetch('/api/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to analyze sitemap');
        return;
      }

      setResults(data); 
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const exportToJSON = () => {
    if (!results) return;
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'sitemap-report.json';
    link.click();
  };


  const stripLocaleFromPath = (pathname) =>
    pathname.replace(/^\/[a-z]{2}(-[a-z]{2})?\//i, "/");

  const isLocalizedPath = (pathname) =>
    /^\/[a-z]{2}(-[a-z]{2})?\//i.test(pathname);

  const normalizeSitemapKey = (urlStr) => {
    try {
      const u = new URL(urlStr);
      const normalizedPath = stripLocaleFromPath(u.pathname);
      return `${u.origin}${normalizedPath}${u.search}`;
    } catch (e) {
      return urlStr;
    }
  };

  const dedupeSitemapsPreferNonLocale = (list = []) => {
    const map = new Map();

    for (const item of list) {
      const key = normalizeSitemapKey(item.url);

      if (!map.has(key)) {
        map.set(key, item);
        continue;
      }

      try {
        const existing = map.get(key);
        const existingPath = new URL(existing.url).pathname;
        const currentPath = new URL(item.url).pathname;

        const existingIsLoc = isLocalizedPath(existingPath);
        const currentIsLoc = isLocalizedPath(currentPath);

        if (existingIsLoc && !currentIsLoc) {
          map.set(key, item);
        }
      } catch (e) {

      }
    }

    return Array.from(map.values());
  };


  const dedupedSitemaps = dedupeSitemapsPreferNonLocale(results?.sitemaps || []);

  const uiCounts = dedupedSitemaps.reduce(
    (acc, s) => {
      const t = String(s.type || "").toLowerCase();
      const c = Number(s.count || 0);

      if (t === "products") acc.products += c;
      else if (t === "collections") acc.collections += c;
      else if (t === "blogs") acc.blogs += c;
      else if (t === "pages") acc.pages += c;
      else acc.other += c;

      return acc;
    },
    { products: 0, collections: 0, blogs: 0, pages: 0, other: 0 }
  );

  const stats = [
    { title: 'Products', count: uiCounts.products, icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Collections', count: uiCounts.collections, icon: Layers, color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: 'Blogs', count: uiCounts.blogs, icon: BookOpen, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { title: 'Pages', count: uiCounts.pages, icon: FileText, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  ];

  const filteredSitemaps =
    dedupedSitemaps.filter((s) => {
      if (!activeType) return true;
      return String(s.type || "").toLowerCase() === activeType;
    }) || [];

  const getSitemapUrlsByType = (typeKey) => {
    const t = String(typeKey || "").toLowerCase();
    return dedupedSitemaps
      .filter((s) => String(s.type || "").toLowerCase() === t)
      .map((s) => s.url);
  };


  const fetchAndCacheType = async (typeKey) => {
    const t = String(typeKey || "").toLowerCase();

    if (urlCache?.[t]) return; 

    const sitemapUrls = getSitemapUrlsByType(t);
    if (!sitemapUrls.length) return;

    const res = await fetch("/api/sitemap-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sitemapUrls,
        maxTotal: 2000,
      }),
    });

    const data = await res.json();
    // ✅ STEP 1: store raw URLs for later HTML sitemap creation
setStoredSitemapUrls((prev) => ({
  ...prev,
  [t]: data.urls || [],
}));

    if (!res.ok) throw new Error(data?.error || "Failed to load sitemap URLs");

    setUrlCache((prev) => ({
      ...prev,
      [t]: {
        urls: data.urls || [],
        total: data.total || 0,
        limited: !!data.limited,
        fetchedAt: Date.now(),
      },
    }));
  };


  const prefetchAllTypes = async () => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    const presentTypes = new Set(
      (results?.sitemaps || []).map((s) => String(s?.type || "").toLowerCase())
    );

    const typesToPrefetch = ["products", "collections", "pages", "blogs"].filter((t) =>
      presentTypes.has(t)
    );

    prefetchPromiseRef.current = Promise.all(typesToPrefetch.map((t) => fetchAndCacheType(t)));

    try {
      await prefetchPromiseRef.current;
    } finally {
      prefetchPromiseRef.current = null;
    }
  };

  // ✅ DEBUG: verify sitemap URLs are being stored
useEffect(() => {
  console.log("✅ Stored Sitemap URLs (DEBUG):", storedSitemapUrls);
}, [storedSitemapUrls]);

  const exportToCSV = () => {
    if (!results) return;

    let csv = 'Type,Count\n';
    csv += `Products,${uiCounts.products}\n`;
    csv += `Collections,${uiCounts.collections}\n`;
    csv += `Blogs,${uiCounts.blogs}\n`;
    csv += `Pages,${uiCounts.pages}\n`;
    csv += `Other,${uiCounts.other}\n`;

    csv += '\nSitemap URL,Type,URL Count\n';
    dedupedSitemaps.forEach((sitemap) => {
      csv += `"${sitemap.url}",${sitemap.type},${sitemap.count}\n`;
    });

    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const blobUrl = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'sitemap-report.csv';
    link.click();
  };

  return (
    <AppProvider i18n={enTranslations}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-12 max-w-6xl">

          {/* Header */}
          <Card className="bg-transparent shadow-none border-0 rounded-none mb-12">
            <CardContent className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 p-0">
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-tr from-primary to-indigo-600">
                <Search className="w-5 h-5 text-white" />
              </div>

              <div className="text-center md:text-left">
                <h1 className="Polaris-Heading text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                  Sitemap Explorer
                </h1>
                <p className="Polaris-TextStyle text-sm md:text-base text-slate-700 mt-1 max-w-md mx-auto md:mx-0">
                  Explore your Shopify store’s sitemap{' '}
                  <span className="Polaris-TextStyle--variationStrong text-indigo-600 font-semibold">
                    quickly & easily
                  </span>{' '}
                  and generate actionable reports.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Input Section */}
          <Card className="mb-8 shadow-lg">
            <CardHeader className="p-6">
              <div className="flex items-center gap-4">
                <div className="min-w-0 space-y-1">
                  {!results && (
  <>
    <h3 className="text-lg font-semibold text-slate-900">
      Analyze Your Sitemap
    </h3>

    <Text
      as="p"
      variant="bodyMd"
      tone="subdued"
      className="mt-1 max-w-md text-slate-600"
    >
      This app automatically detects your store URL and analyzes sitemap.xml to
      generate a clear, actionable report.
    </Text>

    <div className="mt-3 flex flex-wrap items-center gap-2">
      {shop ? (
        <>
          <Badge status="success">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium">Detected:</span>
              <span className="font-semibold">{shop}</span>
            </span>
          </Badge>

          {!loading && (
            <div className="flex items-center gap-2 text-green-700 animate-pulse">
              <Badge status="success">✅</Badge>
              <Text as="span" className="text-sm" tone="success">
                Click Generate Report to start
              </Text>
            </div>
          )}
        </>
      ) : (
        <>
          <Badge status="info">Auto-detect ready</Badge>
          <span className="text-xs text-slate-400 italic">
            Click Generate Report to start
          </span>
        </>
      )}
    </div>
  </>
)}


                </div>
              </div>
            </CardHeader>


            <CardContent>
  {results && (
  <Card className="border border-green-200 bg-green-50 mb-6">
    <CardContent className="pt-5">
      <div className="space-y-3">
        <Text as="h2" variant="headingMd" fontWeight="bold">
  Your sitemap report is ready
</Text>


        <Text as="p" variant="bodyMd" tone="subdued">
          Your store’s sitemap has been successfully analyzed. You’re just one step away from creating a well-organized sitemap page that improves site navigation and search visibility.
        </Text>

        {/* CTA helper block */}
        <div className="mt-4 rounded-md bg-white border border-dashed border-green-200 p-4">
          <Text as="p" variant="bodySm">
            <strong>Would you like us to create an HTML sitemap page for your store?</strong>
          </Text>

          <Text as="p" variant="bodySm" tone="subdued" className="mt-1">
            Click the button below and we’ll generate the sitemap page
            automatically for you.
          </Text>
        </div>
      </div>
    </CardContent>
  </Card>
)}


              <div className="flex flex-col items-center gap-3">
               {!results && (
  <Button
    onClick={handleAnalyze}
    disabled={loading}
    size="lg"
    className="group relative px-8 bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg hover:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
  >
    <span className="absolute -left-24 top-0 h-full w-24 bg-white/20 transform -skew-x-12 opacity-0 group-hover:opacity-80 group-hover:translate-x-[300%] transition-all duration-600 pointer-events-none" />
    {loading ? (
      <>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Analyzing...
      </>
    ) : (
      "Generate Report"
    )}
  </Button>
)}

 {results && (
 <Button
  onClick={async () => {
    try {
      setLoading(true);
      setSitemapResult(null);

      const res = await fetch(
        `/api/generate-html-sitemap?shop=${encodeURIComponent(shop)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: storedSitemapUrls,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate HTML sitemap");
        return;
      }

      setSitemapResult({
        pageUrl: data.pageUrl,
        counts: data.counts,
      });
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }}
  disabled={loading}
  size="lg"
  className="group relative px-8 bg-gradient-to-r from-primary to-indigo-600 text-white shadow-lg hover:shadow-2xl transition-all duration-300 ease-out transform hover:-translate-y-1 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
>
  <span className="absolute -left-24 top-0 h-full w-24 bg-white/20 transform -skew-x-12 opacity-0 group-hover:opacity-80 group-hover:translate-x-[300%] transition-all duration-600 pointer-events-none" />
  {loading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Creating Sitemap...
    </>
  ) : (
    "Create HTML Sitemap Page"
  )}
</Button>

)}
{sitemapResult && (
  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
    <div className="flex items-start gap-3">
      <CheckCircle2 className="text-green-600 mt-0.5" />
      <div>
        <p className="font-semibold text-green-800">
          Your HTML Sitemap page has been created successfully.
        </p>

        <p className="text-sm mt-1 text-green-700">
          Products: {sitemapResult.counts.products} ·
          Collections: {sitemapResult.counts.collections} ·
          Pages: {sitemapResult.counts.pages} ·
          Blogs: {sitemapResult.counts.blogs}
        </p>

        <a
          href={sitemapResult.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-green-800 underline"
        >
          View Sitemap Page <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  </div>
)}


                 {!results && (
                <Input
                  type="text"
                  placeholder="https://www.example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-lg w-full md:w-1/2"
                  disabled={loading}
                />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-8">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results Section */}
          {results && (
            <div className="space-y-8">
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Tip:</span>{" "}
                  Click any result card — <span className="font-semibold">Products</span>,{" "}
                  <span className="font-semibold">Collections</span>,{" "}
                  <span className="font-semibold">Pages</span>, or{" "}
                  <span className="font-semibold">Blogs</span> — and the matching URLs will appear below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  const typeKey = stat.title.toLowerCase(); 
                  const isActive = activeType === typeKey;

                  return (
                    <button
                      key={stat.title}
                      type="button"
                      onClick={() => {
                        setActiveType((prev) => {
                          const nextType = prev === typeKey ? null : typeKey;

                          if (nextType) {

                            const cached = urlCache?.[nextType];
                            if (cached) {
                              setUrlRows(cached.urls || []);
                              setUrlMeta({ total: cached.total || 0, limited: !!cached.limited });
                              setUrlError(null);
                              setUrlLoading(false);
                            } else {

                              setUrlLoading(true);
                              setUrlRows([]);
                              setUrlMeta({ total: 0, limited: false });
                              setUrlError(null);
                            }
                          } else {
                            setUrlRows([]);
                            setUrlMeta({ total: 0, limited: false });
                            setUrlError(null);
                            setUrlLoading(false);
                          }

                          return nextType;
                        });

                        setTimeout(() => {
                          tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 0);
                      }}
                      className="text-left w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                      aria-pressed={isActive}
                      aria-label={`Show ${stat.title} sitemaps`}
                    >
                      <Card className={`shadow-md hover:shadow-lg transition-shadow hover:cursor-pointer ${isActive ? "ring-2 ring-indigo-600" : ""}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                              <h3 className="text-4xl font-bold text-slate-900 mt-2">
                                {stat.count.toLocaleString()}
                              </h3>
                            </div>
                            <div className={`${stat.bgColor} p-2 rounded-lg`}>
                              <Icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 justify-end">
                <Button onClick={exportToJSON} variant="outline">Export as JSON</Button>
                <Button onClick={exportToCSV} variant="outline">Export as CSV</Button>
              </div>

              <Card className="shadow-lg" ref={tableRef}>
                <CardHeader>
                  <CardTitle>Sitemap Details</CardTitle>
                  <CardDescription>
                    Total Sitemaps Found: {dedupedSitemaps.length}
                    {activeType ? ` | Showing: ${filteredSitemaps.length} ${activeType}` : ""}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sitemap URL</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">URL Count</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSitemaps.map((sitemap, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm max-w-md truncate">{sitemap.url}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                                {sitemap.type}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {sitemap.count?.toLocaleString() || 0}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* URLs List */}
              {activeType && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="capitalize">{activeType} URLs</CardTitle>
                    <CardDescription>
                      {urlLoading ? "Loading..." : `Showing ${urlRows.length} URLs`}
                      {urlMeta.total ? ` (Fetched: ${urlMeta.total}${urlMeta.limited ? "+" : ""})` : ""}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {urlError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{urlError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="rounded-lg border max-h-[420px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>URL</TableHead>
                            <TableHead>Last Modified</TableHead>
                            <TableHead>Changefreq</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {urlRows.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-sm max-w-xl truncate">
                                <a
                                  href={row.loc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {row.loc}
                                </a>
                              </TableCell>
                              <TableCell className="text-sm">{row.lastmod || "-"}</TableCell>
                              <TableCell className="text-sm">{row.changefreq || "-"}</TableCell>
                            </TableRow>
                          ))}

                          {!urlLoading && urlRows.length === 0 && !urlError && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                                No URLs found for this sitemap.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!results && !error && !loading && (
            <Card className="shadow-lg rounded-xl bg-gradient-to-br from-primary/5 to-indigo-50">
              <CardContent className="pt-12 pb-12 text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-tr from-primary to-indigo-600">
                  <Search className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-black mb-2">
                  <span className="Polaris-TextStyle--variationStrong">Ready to Explore</span>
                </h3>

                <p className="text-sm md:text-base text-black max-w-md mx-auto">
                  <span className="Polaris-TextStyle--variationSubdued">
                    Just one click away from exploring your store’s full sitemap.
                  </span>
                </p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </AppProvider>
  );
};

export default App;
