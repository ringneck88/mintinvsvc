require('dotenv').config();
const axios = require('axios');

const DUTCHIE_PLUS_URL = 'https://plus.dutchie.com/plus/2021-07/graphql';
const DUTCHIE_PLUS_API_KEY = process.env.DUTCHIE_PLUS_API_KEY;

const RETAILER_BANNER_QUERY = `
query RetailerBannerQuery($retailerId: ID!) {
  retailer(id: $retailerId) {
    banner {
      html
    }
  }
}
`;

async function testBanner(retailerId) {
  console.log('=== Dutchie Plus Banner Test ===\n');
  console.log('API Key set:', !!DUTCHIE_PLUS_API_KEY);
  console.log('Retailer ID:', retailerId);
  console.log('\n--- Making request ---\n');

  try {
    const response = await axios.post(DUTCHIE_PLUS_URL, {
      query: RETAILER_BANNER_QUERY,
      variables: { retailerId }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DUTCHIE_PLUS_API_KEY}`
      }
    });

    console.log('Response status:', response.status);
    console.log('\nFull response data:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.errors) {
      console.log('\n--- GraphQL Errors ---');
      console.log(JSON.stringify(response.data.errors, null, 2));
    }

    if (response.data.data?.retailer?.banner?.html) {
      console.log('\n--- Banner HTML ---');
      console.log(response.data.data.retailer.banner.html);
    } else {
      console.log('\n--- No banner found ---');
    }

  } catch (error) {
    console.error('\n--- Error ---');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Get retailer ID from command line or use a default
const retailerId = process.argv[2];

if (!retailerId) {
  console.log('Usage: node test-banner.js <retailerId>');
  console.log('\nExample: node test-banner.js 12345678-1234-1234-1234-123456789012');
  process.exit(1);
}

testBanner(retailerId);
