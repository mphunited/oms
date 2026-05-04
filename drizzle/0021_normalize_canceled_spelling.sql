UPDATE public.orders SET status = 'Canceled' WHERE status = 'Cancelled';
UPDATE public.recycling_orders SET status = 'Canceled' WHERE status = 'Cancelled';
