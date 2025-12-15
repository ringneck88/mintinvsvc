require('dotenv').config();
const axios = require('axios');

const DUTCHIE_PLUS_URL = 'https://plus.dutchie.com/plus/2021-07/graphql';
const DUTCHIE_PLUS_API_KEY = process.env.DUTCHIE_PLUS_API_KEY;
const STORES_API_URL = process.env.STORES_API_URL || 'https://mintdealsbackend-production.up.railway.app/api/stores';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const RETAILER_BANNER_QUERY = `
query RetailerBannerQuery($retailerId: ID!) {
  retailer(id: $retailerId) {
    banner {
      html
    }
  }
}
`;

function stripHtml(html) {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .replace(/&nbsp;/g, ' ')   // Replace &nbsp; with space
    .replace(/&amp;/g, '&')    // Replace &amp; with &
    .replace(/&lt;/g, '<')     // Replace &lt; with <
    .replace(/&gt;/g, '>')     // Replace &gt; with >
    .replace(/&quot;/g, '"')   // Replace &quot; with "
    .replace(/&#39;/g, "'")    // Replace &#39; with '
    .replace(/\s+/g, ' ')      // Collapse multiple spaces
    .trim();
}

async function fetchStores() {
  const response = await axios.get(`${STORES_API_URL}?pagination[limit]=100`);
  return response.data.data || response.data;
}

async function getBanner(retailerId) {
  const response = await axios.post(DUTCHIE_PLUS_URL, {
    query: RETAILER_BANNER_QUERY,
    variables: { retailerId }
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DUTCHIE_PLUS_API_KEY}`
    }
  });
  return response.data;
}

async function updateStrapi(storeId, tickertape) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`;
  }

  const response = await axios.put(`${STORES_API_URL}/${storeId}`, {
    data: {
      tickertape: tickertape
    }
  }, { headers });
  return response;
}

async function main() {
  console.log('=== Dutchie Plus Banner Sync to Strapi ===\n');
  console.log('DUTCHIE_PLUS_API_KEY set:', !!DUTCHIE_PLUS_API_KEY);
  console.log('STRAPI_API_TOKEN set:', !!STRAPI_API_TOKEN);

  if (!DUTCHIE_PLUS_API_KEY) {
    console.error('ERROR: DUTCHIE_PLUS_API_KEY not set in .env');
    process.exit(1);
  }

  if (!STRAPI_API_TOKEN) {
    console.log('WARNING: STRAPI_API_TOKEN not set - trying without auth...');
  }

  console.log('\n--- Fetching stores ---\n');

  try {
    const stores = await fetchStores();
    console.log(`Found ${stores.length} stores\n`);

    // Debug: show first store structure
    if (stores.length > 0) {
      console.log('Sample store object keys:', Object.keys(stores[0]));
      console.log('Sample store:', JSON.stringify(stores[0], null, 2).substring(0, 500));
    }

    for (const store of stores) {
      const retailerId = store.DutchieStoreID;
      const storeId = store.documentId || store.id;  // Strapi v5 uses documentId
      console.log(`\n--- ${store.name} ---`);
      console.log(`Store ID: ${store.id}, documentId: ${store.documentId}`);
      console.log(`DutchieStoreID (retailerId): ${retailerId}`);

      if (!retailerId) {
        console.log('  No DutchieStoreID, skipping...');
        continue;
      }

      try {
        const result = await getBanner(retailerId);
        let bannerText = null;

        if (result.errors) {
          console.log('  GraphQL Error:', result.errors[0]?.message);
        } else if (result.data?.retailer?.banner?.html) {
          const bannerHtml = result.data.retailer.banner.html;
          bannerText = stripHtml(bannerHtml);
          console.log('  Banner text:', bannerText.substring(0, 100) + (bannerText.length > 100 ? '...' : ''));
        } else {
          console.log('  No banner found');
        }

        // Update Strapi with the banner text (or null if no banner)
        console.log(`  Updating Strapi (using ID: ${storeId})...`);
        const updateResult = await updateStrapi(storeId, bannerText);
        console.log('  Strapi updated:', updateResult.status === 200 ? 'SUCCESS' : `Status ${updateResult.status}`);

      } catch (error) {
        console.log('  Error:', error.message);
        if (error.response?.data) {
          console.log('  Response:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    console.log('\n=== Done ===');

  } catch (error) {
    console.error('Error fetching stores:', error.message);
  }
}

main();
