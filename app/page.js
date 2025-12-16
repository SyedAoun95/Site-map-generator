'use client';

import { AppProvider, Banner, BlockStack, InlineStack, Text, Badge } from '@shopify/polaris';
import createApp from '@shopify/app-bridge';
import { Redirect } from '@shopify/app-bridge/actions';
// import Image from 'next/image';
// import appIcon from '../app/img/appicon.png';
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

  // ### CHANGE 1 (ADD THIS)
const [activeType, setActiveType] = useState(null); // products | collections | blogs | pages | null
const tableRef = useRef(null);
// MARK-1: URL list states (for selected type)
const [urlRows, setUrlRows] = useState([]);
const [urlLoading, setUrlLoading] = useState(false);
const [urlError, setUrlError] = useState(null);
const [urlMeta, setUrlMeta] = useState({ total: 0, limited: false });



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
    // silent
  }
}, []);


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


    try {
  let inputUrl = url.trim();

  try {
    inputUrl = new URL(inputUrl).origin; // any link -> domain
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
}; //  ADD THIS - handleAnalyze close


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


  // ### CHANGE A (ADD) - remove locale prefix (/en/, /en-ca/) for dedupe key
const stripLocaleFromPath = (pathname) =>
  pathname.replace(/^\/[a-z]{2}(-[a-z]{2})?\//i, "/");

const isLocalizedPath = (pathname) =>
  /^\/[a-z]{2}(-[a-z]{2})?\//i.test(pathname);

const normalizeSitemapKey = (urlStr) => {
  try {
    const u = new URL(urlStr);
    const normalizedPath = stripLocaleFromPath(u.pathname);
    return `${u.origin}${normalizedPath}${u.search}`; // keep query as well
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

    // If existing is localized but new one is non-localized, replace it
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
      // ignore parsing issues
    }
  }

  return Array.from(map.values());
};


  // Get sitemap URL for a given type (products, collections, blogs, pages)
// const getSitemapUrlForType = (type) => {
//   const list = results?.sitemaps || [];
//   const t = String(type || "").toLowerCase();

//   const matches = list.filter(
//     (s) => String(s.type || "").toLowerCase() === t
//   );

//   if (!matches.length) return null;

//   // Prefer non-locale URL (no /en/ or /en-ca/ in path)
//   const nonLocalized = matches.find((s) => {
//     try {
//       const u = new URL(s.url);
//       return !/^\/[a-z]{2}(-[a-z]{2})?\//i.test(u.pathname);
//     } catch (e) {
//       return true;
//     }
//   });

//   return (nonLocalized || matches[0]).url;
// };

// 1) pehle dedupe
const dedupedSitemaps = dedupeSitemapsPreferNonLocale(results?.sitemaps || []);

// 2) phir uiCounts (cards ke liye)
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

// 3) phir stats array
const stats = [
  { title: 'Products', count: uiCounts.products, icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { title: 'Collections', count: uiCounts.collections, icon: Layers, color: 'text-green-600', bgColor: 'bg-green-50' },
  { title: 'Blogs', count: uiCounts.blogs, icon: BookOpen, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { title: 'Pages', count: uiCounts.pages, icon: FileText, color: 'text-orange-600', bgColor: 'bg-orange-50' },
];

// // MAIN sitemap url (professional display)
// const siteOrigin = (() => {
//   try {
//     return new URL(url?.trim()).origin;
//   } catch (e) {
//     return (url || "").replace(/\/$/, "");
//   }
// })();

// const mainSitemapUrl = results?.mainSitemapUrl || `${siteOrigin}/sitemap.xml`;


const filteredSitemaps =
  dedupedSitemaps.filter((s) => {
    if (!activeType) return true;
    return String(s.type || "").toLowerCase() === activeType;
  }) || [];

// MARK-2: get sitemap urls for a type from deduped list
const getSitemapUrlsByType = (typeKey) => {
  const t = String(typeKey || "").toLowerCase();
  return dedupedSitemaps
    .filter((s) => String(s.type || "").toLowerCase() === t)
    .map((s) => s.url);
};

// MARK-2: fetch actual <loc> URLs from sitemap(s)
const loadUrlsForType = async (typeKey) => {
  const sitemapUrls = getSitemapUrlsByType(typeKey);

  // reset when no sitemap found
  if (!sitemapUrls.length) {
    setUrlRows([]);
    setUrlMeta({ total: 0, limited: false });
    setUrlError(null);
    return;
  }

  setUrlLoading(true);
  setUrlError(null);
  setUrlRows([]);

  try {
    const res = await fetch("/api/sitemap-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sitemapUrls,
        maxTotal: 2000, // zarurat par 5000 kar dena
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load sitemap URLs");

    setUrlRows(data.urls || []);
    setUrlMeta({ total: data.total || 0, limited: !!data.limited });
  } catch (e) {
    setUrlError(e?.message || "Failed to load URLs");
  } finally {
    setUrlLoading(false);
  }
};


  return (
    <AppProvider i18n={enTranslations}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Header */}
          {/* <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Search className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-4">Sitemap Explorer</h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Discover your Shopify store’s structure and content with Sitemap Explorer using sitemap.xml.
            </p>
          </div> */}
     <Card className="bg-transparent shadow-none border-0 rounded-none mb-12">
  <CardContent className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 p-0">
    {/* Icon with rounded background */}
    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-tr from-primary to-indigo-600">
      <Search className="w-5 h-5 text-white" />
    </div>

    {/* Heading & description */}
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
            {/* <CardHeader>
              <CardTitle>Sitemap Analyzer</CardTitle>
              <CardDescription>
                This app automatically detects your store URL. Click the button below to generate your sitemap report.
              </CardDescription>
            </CardHeader> */}
<CardHeader className="p-6">
  <div className="flex items-center gap-4">

    {/* ICON */}
    {/* <div className="flex-shrink-0">
      <Image src={appIcon} alt="App Icon" width={32} height={32} className="rounded-full" />
    </div> */}

    {/* TEXT AREA */}
    <div className="min-w-0 space-y-1">

      {/* Polaris Heading - headingLg default style */}
   <h3 className="text-lg font-semibold text-slate-900">Analyze Your Sitemap</h3>


      {/* Polaris Description */}
      <Text 
        as="p" 
        variant="bodyMd" 
        tone="subdued" 
        className="mt-1 max-w-md text-slate-600"
      >
        This app automatically detects your store URL and analyzes sitemap.xml to generate a clear, actionable report.
      </Text>

      {/* Badge row */}
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
{!loading && !results && (
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

    </div>
  </div>
</CardHeader>





            <CardContent>
              <div className="flex flex-col items-center gap-3">
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

                <Input
                  type="text"
                  placeholder="https://www.example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-lg w-full md:w-1/2"
                  disabled={loading}
                />
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
{/* ### CHANGE 3 (REPLACE WHOLE stats.map WITH THIS) */}
{stats.map((stat) => {
  const Icon = stat.icon;
  const typeKey = stat.title.toLowerCase(); // products / collections / blogs / pages
  const isActive = activeType === typeKey;

  return (
    <button
      key={stat.title}
      type="button"
     onClick={() => {
  setActiveType((prev) => {
    const nextType = prev === typeKey ? null : typeKey;

    if (nextType) {
      loadUrlsForType(nextType);
    } else {
      setUrlRows([]);
      setUrlMeta({ total: 0, limited: false });
      setUrlError(null);
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
{/* <Card className="shadow-lg">
  <CardHeader className="pb-3">
    <CardTitle className="text-base font-semibold">Main sitemap link</CardTitle>
    <CardDescription>Primary sitemap URL for your store</CardDescription>
  </CardHeader>

  <CardContent>
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <a
            href={mainSitemapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-mono text-sm text-indigo-600 hover:underline break-all"
          >
            {mainSitemapUrl}
          </a>
        </div>

        <div className="flex items-center gap-2 md:justify-end">
          <Button
            variant="outline"
            onClick={() => navigator.clipboard.writeText(mainSitemapUrl)}
            className="whitespace-nowrap"
          >
            Copy
          </Button>

          <Button
            onClick={() => window.open(mainSitemapUrl, "_blank", "noopener,noreferrer")}
            className="whitespace-nowrap bg-gradient-to-r from-primary to-indigo-600 text-white hover:opacity-95"
          >
            Open
          </Button>
        </div>
      </div>
    </div>
  </CardContent>
</Card> */}



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
                       {/* ### CHANGE 4B */}
{filteredSitemaps.map((sitemap, index) => (

                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm max-w-md truncate">{sitemap.url}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">{sitemap.type}</span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{sitemap.count?.toLocaleString() || 0}</TableCell>
                            {/* <TableCell>
                              <a href={sitemap.url}  rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </TableCell> */}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
                        {/* MARK-4: Actual URLs list (loc entries) */}
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
            // <Card className="shadow-lg">
            //   <CardContent className="pt-12 pb-12 text-center">
            //     <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            //     <h3 className="text-xl font-semibold text-slate-900 mb-2">Ready to Explore</h3>
            //     <p className="text-muted-foreground">Enter a website URL above to start analyzing its sitemap structure</p>
            //   </CardContent>
            // </Card>
            <Card className="shadow-lg rounded-xl bg-gradient-to-br from-primary/5 to-indigo-50">
  <CardContent className="pt-12 pb-12 text-center">
    {/* Icon */}
    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-tr from-primary to-indigo-600">
      <Search className="w-7 h-7 text-white" />
    </div>

    {/* Heading using Polaris TextStyle for boldness */}
    <h3 className="text-xl md:text-2xl font-bold text-black mb-2">
      <span className="Polaris-TextStyle--variationStrong">Ready to Explore</span>
    </h3>

    {/* Tagline using Polaris TextStyle for subtle style */}
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