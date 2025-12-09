'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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

const App = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

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
    
    results.sitemaps?.forEach(sitemap => {
      csv += `"${sitemap.url}",${sitemap.type},${sitemap.count}\n`;
    });

    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sitemap-report.csv';
    link.click();
  };

  const stats = [
    {
      title: 'Products',
      count: results?.counts?.products || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Collections',
      count: results?.counts?.collections || 0,
      icon: Layers,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Blogs',
      count: results?.counts?.blogs || 0,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Pages',
      count: results?.counts?.pages || 0,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Search className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Sitemap Explorer
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Discover the content structure of any website by analyzing their sitemap.xml
          </p>
        </div>

        {/* Input Section */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle>Enter Website URL</CardTitle>
            <CardDescription>
              Enter any website URL to analyze its sitemap structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="https://www.example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-lg"
                disabled={loading}
              />
              <Button
                onClick={handleAnalyze}
                disabled={loading}
                size="lg"
                className="px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>
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

        {/* Results */}
        {results && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {stat.title}
                          </p>
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
                );
              })}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3 justify-end">
              <Button onClick={exportToJSON} variant="outline">
                Export as JSON
              </Button>
              <Button onClick={exportToCSV} variant="outline">
                Export as CSV
              </Button>
            </div>

            {/* Sitemap Details Table */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Sitemap Details</CardTitle>
                <CardDescription>
                  Total Sitemaps Found: {results.totalSitemaps}
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
                      {results.sitemaps?.map((sitemap, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm max-w-md truncate">
                            {sitemap.url}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                              {sitemap.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {sitemap.count?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell>
                            <a
                              href={sitemap.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
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

        {/* Empty State */}
        {!results && !error && !loading && (
          <Card className="shadow-lg">
            <CardContent className="pt-12 pb-12 text-center">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Ready to Explore
              </h3>
              <p className="text-muted-foreground">
                Enter a website URL above to start analyzing its sitemap structure
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default App;
