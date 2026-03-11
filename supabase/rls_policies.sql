-- ═══════════════════════════════════════════════════════════════════════════
-- ZimLivestock — Supabase Row Level Security (RLS) Policies
-- Run this in your Supabase SQL Editor to secure your tables.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enable RLS on all tables ────────────────────────────────────────────

ALTER TABLE livestock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ── livestock_items ─────────────────────────────────────────────────────

-- Anyone can view listings (public marketplace)
CREATE POLICY "Anyone can view listings"
  ON livestock_items FOR SELECT
  USING (true);

-- Authenticated users can create listings
CREATE POLICY "Authenticated users can create listings"
  ON livestock_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own listings
CREATE POLICY "Sellers can update own listings"
  ON livestock_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete their own listings
CREATE POLICY "Sellers can delete own listings"
  ON livestock_items FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Service role can update any listing (for webhook marking items as sold)
CREATE POLICY "Service role can update any listing"
  ON livestock_items FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── bids ────────────────────────────────────────────────────────────────

-- Anyone can view bids (bid history is public)
CREATE POLICY "Anyone can view bids"
  ON bids FOR SELECT
  USING (true);

-- Authenticated users can place bids
CREATE POLICY "Authenticated users can place bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = bidder_id);

-- ── payments ────────────────────────────────────────────────────────────

-- Users can only view their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = payer_id);

-- Authenticated users can create payments
CREATE POLICY "Authenticated users can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = payer_id);

-- Service role can update payments (for webhook callbacks)
CREATE POLICY "Service role can update payments"
  ON payments FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can insert payments (fallback)
CREATE POLICY "Service role can insert payments"
  ON payments FOR INSERT
  TO service_role
  WITH CHECK (true);
