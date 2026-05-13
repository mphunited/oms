-- Backfill orders.ship_date and orders.wanted_date from the first split load
-- where the order-level field is NULL but the split load has a value.

UPDATE orders o
SET ship_date = sl.ship_date
FROM (
  SELECT DISTINCT ON (order_id) order_id, ship_date
  FROM order_split_loads
  WHERE ship_date IS NOT NULL
  ORDER BY order_id, created_at ASC
) sl
WHERE o.id = sl.order_id
  AND o.ship_date IS NULL;

UPDATE orders o
SET wanted_date = sl.wanted_date
FROM (
  SELECT DISTINCT ON (order_id) order_id, wanted_date
  FROM order_split_loads
  WHERE wanted_date IS NOT NULL
  ORDER BY order_id, created_at ASC
) sl
WHERE o.id = sl.order_id
  AND o.wanted_date IS NULL;
