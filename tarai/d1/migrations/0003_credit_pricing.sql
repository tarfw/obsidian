-- Credit pricing as of the activation + at-cost top-up model.
-- Keep prior packs for payment/audit history, but never offer them again.
UPDATE packs SET state = 'inactive';

INSERT INTO packs (id, credits, price, currency, state) VALUES
  ('activation-1000', 1000, 50000, 'INR', 'active'),
  ('topup-starter-1000', 1000, 10000, 'INR', 'active'),
  ('topup-growth-5000', 5000, 50000, 'INR', 'active'),
  ('topup-scale-10000', 10000, 100000, 'INR', 'active');
