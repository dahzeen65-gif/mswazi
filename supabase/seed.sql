-- MSWAZI Seed Data (Service Areas, Approved Stalls & Starter Products)
-- Note: Replace '00000000-0000-0000-0000-000000000001' with a real auth.users / profiles UUID
-- if you want sample stalls pre-assigned to a specific owner account.

-- 1. SERVICE AREAS
INSERT INTO public.service_areas (slug, name, sub_county, county, is_active, nearby_slugs, lat, lng, radius_km)
VALUES
  (
    'miritini',
    'Miritini',
    'Jomvu',
    'Mombasa',
    TRUE,
    ARRAY['mikindani', 'changamwe'],
    -4.0065,
    39.6050,
    3.5
  ),
  (
    'mikindani',
    'Mikindani',
    'Jomvu',
    'Mombasa',
    TRUE,
    ARRAY['miritini', 'changamwe'],
    -4.0185,
    39.6010,
    3.5
  ),
  (
    'changamwe',
    'Changamwe',
    'Changamwe',
    'Mombasa',
    TRUE,
    ARRAY['miritini', 'mikindani'],
    -4.0220,
    39.6220,
    3.5
  ),
  (
    'nyali',
    'Nyali',
    'Nyali',
    'Mombasa',
    FALSE,
    ARRAY[]::TEXT[],
    -4.0350,
    39.6920,
    4.0
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sub_county = EXCLUDED.sub_county,
  county = EXCLUDED.county,
  is_active = EXCLUDED.is_active,
  nearby_slugs = EXCLUDED.nearby_slugs,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  radius_km = EXCLUDED.radius_km;

-- 2. SAMPLE VENDOR STALLS & PRODUCTS
-- Run this block after signing up a user in Supabase Auth and copying their UUID into v_owner_id:
DO $$
DECLARE
  v_owner_id UUID;
  v_groceries_id UUID;
  v_grill_id UUID;
  v_general_id UUID;
  v_hardware_id UUID;
  v_wearables_id UUID;
BEGIN
  SELECT id INTO v_owner_id FROM auth.users LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'No auth.users record found yet. Create a user first, then re-run the vendor/product seed block.';
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone_number, active_mode)
  VALUES (v_owner_id, 'MSWAZI Sample Vendor', '0700000000', 'SHOP')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.vendors (
    id, owner_id, slug, business_name, category, description,
    area_slug, opening_hours, approval_status, is_open, lat, lng, live_lat, live_lng
  )
  VALUES
    (
      '11111111-1111-4111-8111-111111111101',
      v_owner_id,
      'fresh-groceries-stall',
      'Fresh Groceries & Produce Stall',
      'Grocery & Fresh Produce',
      'Morning farm vegetables, fruits, potatoes, and daily kitchen staples.',
      'miritini',
      '06:30 AM - 09:00 PM',
      'APPROVED',
      TRUE,
      -4.0065, 39.6050, -4.0065, 39.6050
    ),
    (
      '11111111-1111-4111-8111-111111111102',
      v_owner_id,
      'kitchen-grill-stall',
      'Kitchen & Grill Stall',
      'Food & Restaurants',
      'Hot meals, charcoal grilled platters, snacks, and local refreshments.',
      'miritini',
      '11:00 AM - 10:30 PM',
      'APPROVED',
      TRUE,
      -4.0052, 39.6075, -4.0052, 39.6075
    ),
    (
      '11111111-1111-4111-8111-111111111103',
      v_owner_id,
      'general-household-stall',
      'General & Household Stall',
      'General Retail',
      'Household supplies, dry goods, beverages, and everyday essentials.',
      'miritini',
      '07:00 AM - 09:30 PM',
      'APPROVED',
      TRUE,
      -4.0080, 39.6032, -4.0080, 39.6032
    ),
    (
      '11111111-1111-4111-8111-111111111104',
      v_owner_id,
      'builders-materials-stall',
      'Builders Materials & Hardware Stall',
      'Hardware & Building Supplies',
      'Cement, washed sand, ballast, timber, and construction hardware.',
      'mikindani',
      '07:30 AM - 06:00 PM',
      'APPROVED',
      TRUE,
      -4.0185, 39.6010, -4.0185, 39.6010
    ),
    (
      '11111111-1111-4111-8111-111111111105',
      v_owner_id,
      'wearables-studio-stall',
      'Wearables & Apparel Stall',
      'Fashion & Clothing',
      'Everyday apparel, footwear, and tailored outfits.',
      'changamwe',
      '08:30 AM - 07:30 PM',
      'APPROVED',
      TRUE,
      -4.0220, 39.6220, -4.0220, 39.6220
    )
  ON CONFLICT (slug) DO NOTHING;

  v_groceries_id := '11111111-1111-4111-8111-111111111101';
  v_grill_id     := '11111111-1111-4111-8111-111111111102';
  v_general_id   := '11111111-1111-4111-8111-111111111103';
  v_hardware_id  := '11111111-1111-4111-8111-111111111104';
  v_wearables_id := '11111111-1111-4111-8111-111111111105';

  INSERT INTO public.products (id, vendor_id, name, description, category, price_kes, unit_label, stock_qty, is_available)
  VALUES
    ('22222222-2222-4222-8222-222222222201', v_groceries_id, 'Fresh Potatoes (5kg Bag)', 'Sorted highland potatoes packed for household cooking.', 'Grocery & Fresh Produce', 350, 'bag', 24, TRUE),
    ('22222222-2222-4222-8222-222222222202', v_groceries_id, 'Tomatoes & Leafy Greens Bundle', 'Fresh ripe tomatoes paired with morning greens.', 'Grocery & Fresh Produce', 140, 'bundle', 40, TRUE),
    ('22222222-2222-4222-8222-222222222203', v_grill_id, 'Spiced Rice & Grill Platter', 'Freshly prepared platter with grilled meat and accompaniments.', 'Food & Restaurants', 450, 'plate', 15, TRUE),
    ('22222222-2222-4222-8222-222222222204', v_general_id, 'Cooking Oil & Maize Flour Pack', 'Everyday household pantry bundle ready for local dispatch.', 'General Retail', 620, 'pack', 30, TRUE),
    ('22222222-2222-4222-8222-222222222205', v_hardware_id, 'Portland Cement (50kg Bag)', 'Standard 50kg construction cement bag for masonry and slab work.', 'Hardware & Building Supplies', 820, 'bag', 85, TRUE),
    ('22222222-2222-4222-8222-222222222206', v_wearables_id, 'Breathable Cotton Casual Shirt', 'Lightweight everyday shirt available in standard sizes.', 'Fashion & Clothing', 1650, 'piece', 12, TRUE)
  ON CONFLICT (id) DO NOTHING;
END $$;