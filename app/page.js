'use client';

import { AppProvider } from '@shopify/polaris';
import createApp from '@shopify/app-bridge';
import { Redirect } from '@shopify/app-bridge/actions';
import Image from 'next/image';
import appIcon from '../app/img/appicon.png';
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
  AlertCircle
} from 'lucide-react';

import { Badge, InlineStack, BlockStack, Text } from '@shopify/polaris';



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

    try {
      const response = await fetch('/api/sitemap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
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
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sitemap-report.json';
    link.click();
  };

  const exportToCSV = () => {
    if (!results) return;
    
    let csv = 'Type,Count\n';
    csv += `Products,${results.counts.products}\n`;
    csv += `Collections,${results.counts.collections}\n`;
    csv += `Blogs,${results.counts.blogs}\n`;
    csv += `Pages,${results.counts.pages}\n`;
    csv += `Other,${results.counts.other}\n`;
    csv += '\nSitemap URL,Type,URL Count\n';
    
   dedupeSitemapsPreferNonLocale(results?.sitemaps || []).forEach(sitemap => {
      csv += `"${sitemap.url}",${sitemap.type},${sitemap.count}\n`;
    });

    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
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

  const stats = [
    { title: 'Products', count: results?.counts?.products || 0, icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Collections', count: results?.counts?.collections || 0, icon: Layers, color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: 'Blogs', count: results?.counts?.blogs || 0, icon: BookOpen, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { title: 'Pages', count: results?.counts?.pages || 0, icon: FileText, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  ];
// ### FIX 1 (ADD/REPLACE HERE) - dedupe first, then filter
const dedupedSitemaps = dedupeSitemapsPreferNonLocale(results?.sitemaps || []);

const filteredSitemaps =
  dedupedSitemaps.filter((s) => {
    if (!activeType) return true;
    return String(s.type || "").toLowerCase() === activeType;
  }) || [];



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
    <div className="flex-shrink-0">
      <Image src={appIcon} alt="App Icon" width={32} height={32} className="rounded-full" />
    </div>

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

            <span className="flex items-center gap-2 text-sm font-medium text-green-700">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3 h-3 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.414a1 1 0 011.414-1.414l3.343 3.343 6.657-6.657a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span className="animate-pulse">Click Generate Report to start</span>
            </span>
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
        setActiveType((prev) => (prev === typeKey ? null : typeKey));

        // scroll to table
        setTimeout(() => {
          tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }}
      className="text-left w-full focus:outline-none rounded-xl focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-pressed={isActive}
      aria-label={`Show ${stat.title} sitemaps`}
    >
      <Card className={`shadow-md hover:shadow-lg transition-shadow hover:cursor-pointer ${isActive ? "ring-2 ring-primary" : ""}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <h3 className="text-4xl font-bold text-slate-900 mt-2">
                {stat.count.toLocaleString()}
              </h3>
            </div>
            <div className={`${stat.bgColor} p-3 rounded-lg`}>
              <Icon className={`w-8 h-8 ${stat.color}`} />
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
                       {/* ### CHANGE 4B */}
{filteredSitemaps.map((sitemap, index) => (

                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm max-w-md truncate">{sitemap.url}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">{sitemap.type}</span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{sitemap.count?.toLocaleString() || 0}</TableCell>
                            <TableCell>
                              <a href={sitemap.url}  rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
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

