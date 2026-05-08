ALTER TABLE recycling_orders
  ADD COLUMN recycling_type     text        NOT NULL DEFAULT 'IBC',
  ADD COLUMN qty                numeric(10,2),
  ADD COLUMN buy                numeric(10,2),
  ADD COLUMN sell               numeric(10,2),
  ADD COLUMN description        text,
  ADD COLUMN part_number        text,
  ADD COLUMN appointment_notes  text,
  ADD COLUMN po_contacts        jsonb,
  ADD COLUMN is_blind_shipment  boolean     NOT NULL DEFAULT false;
