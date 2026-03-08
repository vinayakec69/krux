-- Migration: 00004_create_products_orders.sql
-- Products catalogue and order management

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price > 0),
  image TEXT,
  category TEXT,
  stock INTEGER DEFAULT 0,
  affiliate_commission NUMERIC(5,2) DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN (
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  )),
  delivery_info JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- Seed initial products
INSERT INTO public.products (name, description, price, image, category, stock, affiliate_commission, features, rating, reviews)
VALUES
  ('Eco Warrior Anime Tee', 'Limited edition anime-style eco warrior t-shirt made from 100% recycled materials.', 250, '👕', 'clothing', 50, 25, ARRAY['100% Recycled Cotton','Eco-friendly dyes','Exclusive KRUX design','Available in S, M, L, XL'], 4.8, 127),
  ('Ocean Blue Steel Bottle', 'Premium stainless steel bottle with ocean-inspired design.', 150, '🍶', 'accessories', 100, 20, ARRAY['500ml capacity','Double-wall vacuum insulation','BPA-free','Leak-proof cap'], 4.9, 243),
  ('Street Style Baggy Pants', 'Comfortable baggy pants made from upcycled denim.', 400, '👖', 'clothing', 30, 30, ARRAY['Upcycled denim material','Relaxed fit','Multiple pockets','Adjustable waist'], 4.6, 89),
  ('Solar Power Bank 10000mAh', 'Eco-friendly solar-powered charger for all your devices.', 350, '🔋', 'electronics', 25, 15, ARRAY['10000mAh capacity','Solar + USB charging','Dual USB output','LED flashlight built-in'], 4.5, 156),
  ('Bamboo Wireless Earbuds', 'Premium wireless earbuds with sustainable bamboo charging case.', 500, '🎧', 'electronics', 20, 20, ARRAY['Bluetooth 5.2','Active noise cancellation','24hr total battery life','Bamboo charging case'], 4.7, 198),
  ('Ocean Plastic Tote Bag', 'Stylish tote bag made from recycled ocean plastic.', 100, '👜', 'accessories', 200, 25, ARRAY['Made from ocean plastic','Large 15L capacity','Reinforced handles','Interior pocket'], 4.9, 312),
  ('Anime Eco Hoodie', 'Cozy hoodie featuring exclusive eco-warrior anime art.', 450, '🧥', 'clothing', 40, 25, ARRAY['60% organic cotton, 40% recycled polyester','Kangaroo pocket','Adjustable drawstring hood','Unisex design'], 4.8, 167),
  ('Smart LED Desk Lamp', 'Energy-efficient LED lamp with wireless charging base.', 300, '💡', 'electronics', 35, 18, ARRAY['5 brightness levels','3 color temperatures','10W wireless charging','Touch controls'], 4.6, 134),
  ('Recycled Phone Case', 'Durable phone case made from recycled materials.', 80, '📱', 'accessories', 150, 30, ARRAY['100% recycled materials','Shock-absorbing design','Wireless charging compatible','Lifetime warranty'], 4.4, 256),
  ('Eco Sneakers', 'Comfortable sneakers made from recycled plastic bottles and natural rubber.', 600, '👟', 'clothing', 25, 22, ARRAY['Upper from 12 recycled bottles','Natural rubber sole','Organic cotton laces','Memory foam insole'], 4.7, 89)
ON CONFLICT DO NOTHING;
