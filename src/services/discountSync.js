const db = require('../db');
const DutchieClient = require('../api/dutchie');

// Map API fields (camelCase) to database columns (snake_case)
const fieldMapping = {
  discountId: 'discount_id',
  discountName: 'discount_name',
  discountCode: 'discount_code',
  discountType: 'discount_type',
  discountMethod: 'discount_method',
  discountAmount: 'discount_amount',
  applicationMethod: 'application_method',
  externalId: 'external_id',
  isActive: 'is_active',
  isAvailableOnline: 'is_available_online',
  isDeleted: 'is_deleted',
  requireManagerApproval: 'require_manager_approval',
  validFrom: 'valid_from',
  validUntil: 'valid_until',
  thresholdType: 'threshold_type',
  minimumItemsRequired: 'minimum_items_required',
  maximumItemsAllowed: 'maximum_items_allowed',
  maximumUsageCount: 'maximum_usage_count',
  includeNonCannabis: 'include_non_cannabis',
  firstTimeCustomerOnly: 'first_time_customer_only',
  stackOnOtherDiscounts: 'stack_on_other_discounts',
  appliesToLocations: 'applies_to_locations',
  weeklyRecurrenceInfo: 'weekly_recurrence_info',
  products: 'products',
  productCategories: 'product_categories',
  brands: 'brands',
  vendors: 'vendors',
  strains: 'strains',
  tiers: 'tiers',
  tags: 'tags',
  inventoryTags: 'inventory_tags',
  customerTypes: 'customer_types',
  discountGroups: 'discount_groups'
};

// JSONB fields that need to be stringified
const jsonFields = [
  'applies_to_locations',
  'weekly_recurrence_info',
  'products',
  'product_categories',
  'brands',
  'vendors',
  'strains',
  'tiers',
  'tags',
  'inventory_tags',
  'customer_types',
  'discount_groups'
];

class DiscountSyncService {
  constructor(locationId, locationName, apiKey) {
    this.locationId = locationId;
    this.locationName = locationName;
    this.dutchieClient = new DutchieClient(null, apiKey);
  }

  transformItem(item) {
    const transformed = {};

    for (const [apiField, dbColumn] of Object.entries(fieldMapping)) {
      if (item[apiField] !== undefined) {
        let value = item[apiField];

        // Handle JSONB fields
        if (jsonFields.includes(dbColumn) && value !== null) {
          value = JSON.stringify(value);
        }

        transformed[dbColumn] = value;
      }
    }

    // Add location_id
    transformed.location_id = this.locationId;

    // Generate unique id: locationId_discountId
    if (transformed.discount_id) {
      transformed.id = `${this.locationId}_${transformed.discount_id}`;
    }

    return transformed;
  }

  buildUpsertQuery(item) {
    const columns = Object.keys(item);
    const values = Object.values(item);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const updateClauses = columns
      .filter(col => col !== 'id' && col !== 'location_id' && col !== 'discount_id')
      .map(col => `${col} = EXCLUDED.${col}`);

    updateClauses.push('synced_at = CURRENT_TIMESTAMP');

    const query = `
      INSERT INTO discounts (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (id) DO UPDATE SET
        ${updateClauses.join(',\n        ')}
    `;

    return { query, values };
  }

  async syncDiscounts() {
    const startTime = Date.now();
    console.log(`Starting discount sync for ${this.locationName}...`);

    try {
      const discountsData = await this.dutchieClient.getDiscountsReport();

      if (!discountsData || !Array.isArray(discountsData)) {
        console.log('  No discounts data received');
        return { synced: 0, errors: 0, locationId: this.locationId };
      }

      let synced = 0;
      let errors = 0;

      let skipped = 0;

      for (const item of discountsData) {
        try {
          // Skip discounts without products
          if (item.products === null || item.products === undefined) {
            skipped++;
            continue;
          }

          const transformed = this.transformItem(item);

          if (!transformed.id) {
            console.warn('  Skipping discount without discount_id');
            errors++;
            continue;
          }

          const { query, values } = this.buildUpsertQuery(transformed);
          await db.query(query, values);
          synced++;
        } catch (error) {
          console.error(`  Error syncing discount ${item.discountId}:`, error.message);
          errors++;
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`  Discount sync complete in ${duration}s: ${synced} synced, ${skipped} skipped (no products), ${errors} errors`);

      return { synced, skipped, errors, duration, locationId: this.locationId };
    } catch (error) {
      console.error(`  Discount sync failed for ${this.locationName}:`, error.message);
      return { synced: 0, errors: 1, locationId: this.locationId };
    }
  }
}

module.exports = DiscountSyncService;
