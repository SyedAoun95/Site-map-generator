import { NextResponse } from 'next/server';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export const dynamic = 'force-dynamic';

// Helper function to extract URLs from parsed XML
function extractUrls(parsedXml) {
  try {
    if (parsedXml.urlset && parsedXml.urlset.url) {
      return parsedXml.urlset.url.length;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

// Helper function to extract sitemap references
function extractSitemaps(parsedXml) {
  try {
    if (parsedXml.sitemapindex && parsedXml.sitemapindex.sitemap) {
      return parsedXml.sitemapindex.sitemap.map(sitemap => {
        return sitemap.loc[0];
      });
    }
    return [];
  } catch (error) {
    return [];
  }
}

// Categorize sitemap by type
function categorizeSitemap(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('product')) return 'products';
  if (urlLower.includes('collection')) return 'collections';
  if (urlLower.includes('blog') || urlLower.includes('article')) return 'blogs';
  if (urlLower.includes('page')) return 'pages';
  return 'other';
}

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Normalize URL
    let baseUrl = url.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }

    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');

    // Try to fetch sitemap.xml
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    
    let sitemapResponse;
    try {
      sitemapResponse = await axios.get(sitemapUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SitemapExplorer/1.0)'
        }
      });
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Unable to fetch sitemap.xml',
          message: 'The website does not have a publicly accessible sitemap.xml file, or it blocked our request.',
          details: error.message
        },
        { status: 404 }
      );
    }

    // Parse the main sitemap
    const parsedSitemap = await parseStringPromise(sitemapResponse.data);

    // Check if this is a sitemap index or a regular sitemap
    const childSitemaps = extractSitemaps(parsedSitemap);

    if (childSitemaps.length === 0) {
      // This is a regular sitemap, not an index
      const urlCount = extractUrls(parsedSitemap);
      return NextResponse.json({
        success: true,
        mainSitemap: sitemapUrl,
        totalSitemaps: 1,
        sitemaps: [
          {
            url: sitemapUrl,
            type: 'pages',
            count: urlCount
          }
        ],
        counts: {
          products: 0,
          collections: 0,
          blogs: 0,
          pages: urlCount,
          other: 0
        }
      });
    }

    // Process child sitemaps
    const sitemapDetails = [];
    const counts = {
      products: 0,
      collections: 0,
      blogs: 0,
      pages: 0,
      other: 0
    };

    // Fetch and process each child sitemap
    const promises = childSitemaps.map(async (childUrl) => {
      try {
        const childResponse = await axios.get(childUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SitemapExplorer/1.0)'
          }
        });
        
        const parsedChild = await parseStringPromise(childResponse.data);
        const urlCount = extractUrls(parsedChild);
        const type = categorizeSitemap(childUrl);

        return {
          url: childUrl,
          type,
          count: urlCount
        };
      } catch (error) {
        return {
          url: childUrl,
          type: 'error',
          count: 0,
          error: error.message
        };
      }
    });

    const results = await Promise.all(promises);

    // Aggregate counts
    results.forEach(result => {
      sitemapDetails.push(result);
      if (result.type !== 'error' && counts[result.type] !== undefined) {
        counts[result.type] += result.count;
      } else if (result.type !== 'error') {
        counts.other += result.count;
      }
    });

    return NextResponse.json({
      success: true,
      mainSitemap: sitemapUrl,
      totalSitemaps: childSitemaps.length,
      sitemaps: sitemapDetails,
      counts
    });

  } catch (error) {
    console.error('Error analyzing sitemap:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze sitemap',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Sitemap Explorer API',
    endpoints: {
      'POST /api/sitemap': 'Analyze a website sitemap'
    }
  });
}
