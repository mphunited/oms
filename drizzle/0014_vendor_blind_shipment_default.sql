ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS is_blind_shipment_default boolean NOT NULL DEFAULT false;
