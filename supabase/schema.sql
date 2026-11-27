-- MSWAZI Core PostgreSQL Schema (Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper to keep updated_at current
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  active_mode TEXT NOT NULL DEFAULT 'SHOP' CHECK (active_mode IN ('SHOP', 'MY_BUSINESS')),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_rider BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  area_slug TEXT NOT NULL,
  street_or_landmark TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SERVICE AREAS & LOCATION ACTIVATION
CREATE TABLE IF NOT EXISTS public.service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sub_county TEXT NOT NULL,
  county TEXT NOT NULL DEFAULT 'Mombasa',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  nearby_slugs TEXT[] NOT NULL DEFAULT '{}',
  lat DOUBLE PRECISION DEFAULT -4.0065,
  lng DOUBLE PRECISION DEFAULT 39.6050,
  radius_km NUMERIC(5, 2) DEFAULT 4.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEPENDENT VENDOR MINI-STORES (WITH LIVE LOCATION)
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  area_slug TEXT NOT NULL REFERENCES public.service_areas(slug) ON DELETE RESTRICT,
  opening_hours TEXT NOT NULL DEFAULT '07:00 AM - 08:00 PM',
  approval_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (approval_status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  lat DOUBLE PRECISION DEFAULT -4.0065,
  lng DOUBLE PRECISION DEFAULT 39.6050,
  live_lat DOUBLE PRECISION DEFAULT -4.0065,
  live_lng DOUBLE PRECISION DEFAULT 39.6050,
  location_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. VENDOR-OWNED PRODUCTS & INVENTORY
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  price_kes NUMERIC(12, 2) NOT NULL CHECK (price_kes >= 0),
  unit_label TEXT NOT NULL DEFAULT 'unit',
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CART & MULTI-VENDOR ORDERS (PARENT + VENDOR SUB-ORDERS)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  area_slug TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('MPESA', 'COD')),
  payment_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (payment_status IN ('PENDING', 'PAID', 'PENDING_COLLECTION', 'FAILED')),
  total_kes NUMERIC(12, 2) NOT NULL CHECK (total_kes >= 0),
  running_late BOOLEAN NOT NULL DEFAULT FALSE,
  hold_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  subtotal_kes NUMERIC(12, 2) NOT NULL CHECK (subtotal_kes >= 0),
  status TEXT NOT NULL DEFAULT 'CONFIRMED'
    CHECK (status IN ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_order_id UUID NOT NULL REFERENCES public.vendor_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  unit_price_snapshot NUMERIC(12, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- 6. INVITE-ONLY TRUSTED RIDERS, DELIVERIES & LIVE LOCATION PINGS
CREATE TABLE IF NOT EXISTS public.trusted_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rider_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rider_label TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  route_scope TEXT NOT NULL DEFAULT 'LOCAL',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_order_id UUID NOT NULL REFERENCES public.vendor_orders(id) ON DELETE CASCADE,
  trusted_rider_id UUID REFERENCES public.trusted_riders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'AWAITING_ASSIGNMENT'
    CHECK (status IN ('AWAITING_ASSIGNMENT', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trusted_rider_id UUID NOT NULL REFERENCES public.trusted_riders(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading NUMERIC(6, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trusted_rider_id)
);

ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rider_locations_read_all" ON public.rider_locations
  FOR SELECT USING (TRUE);

CREATE POLICY "rider_locations_write_authenticated" ON public.rider_locations
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendors_area_status ON public.vendors(area_slug, approval_status);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor_id, is_available);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_vendor ON public.vendor_orders(vendor_id, status);

-- Triggers
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_addresses_updated BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_service_areas_updated BEFORE UPDATE ON public.service_areas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_vendor_orders_updated BEFORE UPDATE ON public.vendor_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS payment_channel TEXT NOT NULL DEFAULT 'MPESA_SEND'
    CHECK (payment_channel IN ('MPESA_SEND', 'MPESA_TILL', 'MPESA_PAYBILL', 'COD_ONLY')),
  ADD COLUMN IF NOT EXISTS payment_account_ref TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_account_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT NOT NULL DEFAULT '';
  ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'STANDARD'
    CHECK (plan_tier IN ('STANDARD', 'SPOTLIGHT')),
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY'
    CHECK (billing_cycle IN ('WEEKLY', 'MONTHLY')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'LAUNCH_FREE'
    CHECK (subscription_status IN ('LAUNCH_FREE', 'ACTIVE', 'GRACE_DUE', 'SUSPENDED')),
  ADD COLUMN IF NOT EXISTS launch_free_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 months'),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 months'),
  ADD COLUMN IF NOT EXISTS last_payment_ref TEXT NOT NULL DEFAULT '';
  ALTER TABLE public.vendor_orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID', 'SENT_PENDING_CONFIRMATION', 'PAID_CONFIRMED', 'COD_ON_DELIVERY')),
  ADD COLUMN IF NOT EXISTS payment_reference TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;