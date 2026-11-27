-- MSWAZI Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: users read/update own profile; admins can read all
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Addresses: owner only
CREATE POLICY "addresses_owner_all" ON public.addresses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service areas: public can view active areas (or all for admin); only admin can mutate
CREATE POLICY "service_areas_select_active_or_admin" ON public.service_areas
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "service_areas_admin_write" ON public.service_areas
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Vendors: public sees APPROVED vendors in ACTIVE areas; owners & admins manage
CREATE POLICY "vendors_select_public_approved_active" ON public.vendors
  FOR SELECT USING (
    (
      approval_status = 'APPROVED'
      AND EXISTS (
        SELECT 1 FROM public.service_areas sa
        WHERE sa.slug = vendors.area_slug AND sa.is_active = TRUE
      )
    )
    OR auth.uid() = owner_id
    OR public.is_admin()
  );
CREATE POLICY "vendors_insert_owner" ON public.vendors
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "vendors_update_owner_or_admin" ON public.vendors
  FOR UPDATE USING (auth.uid() = owner_id OR public.is_admin());

-- Products: visible if parent vendor is publicly visible; owner manages own products
CREATE POLICY "products_select_visible_vendor_or_owner" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      JOIN public.service_areas sa ON sa.slug = v.area_slug
      WHERE v.id = products.vendor_id
        AND ((v.approval_status = 'APPROVED' AND sa.is_active = TRUE) OR v.owner_id = auth.uid() OR public.is_admin())
    )
  );
CREATE POLICY "products_owner_insert" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = products.vendor_id AND v.owner_id = auth.uid())
  );
CREATE POLICY "products_owner_update" ON public.products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = products.vendor_id AND v.owner_id = auth.uid())
  );
CREATE POLICY "products_owner_delete" ON public.products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = products.vendor_id AND v.owner_id = auth.uid())
  );

-- Cart items: owner only
CREATE POLICY "cart_items_owner_all" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Parent orders: customer or admin
CREATE POLICY "orders_customer_or_admin" ON public.orders
  FOR SELECT USING (auth.uid() = customer_id OR public.is_admin());
CREATE POLICY "orders_customer_insert" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "orders_customer_update" ON public.orders
  FOR UPDATE USING (auth.uid() = customer_id OR public.is_admin());

-- Vendor sub-orders: customer of parent order, owning vendor, or admin
CREATE POLICY "vendor_orders_party_access" ON public.vendor_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = vendor_orders.parent_order_id AND o.customer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_orders.vendor_id AND v.owner_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "vendor_orders_vendor_update" ON public.vendor_orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_orders.vendor_id AND v.owner_id = auth.uid())
    OR public.is_admin()
  );

-- Trusted riders: inviter, invited rider, or admin
CREATE POLICY "trusted_riders_access" ON public.trusted_riders
  FOR ALL USING (
    auth.uid() = invited_by_user_id OR auth.uid() = rider_user_id OR public.is_admin()
  )
  WITH CHECK (auth.uid() = invited_by_user_id OR public.is_admin());