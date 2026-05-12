UPDATE order_split_loads
SET commission_status = 'Eligible'
WHERE commission_status = 'Pending';
