-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  proof_image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE payments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE payments_id_seq TO authenticated;

-- Create storage bucket for payment proofs if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for payments
DROP POLICY IF EXISTS "Tenants can view own payments" ON payments;
DROP POLICY IF EXISTS "Tenants can insert own payments" ON payments;
DROP POLICY IF EXISTS "Owners can view property payments" ON payments;
DROP POLICY IF EXISTS "Owners can update payment status" ON payments;
DROP POLICY IF EXISTS "Owners can delete payments" ON payments;
DROP POLICY IF EXISTS "Public can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete own payment proofs" ON storage.objects;

-- Allow tenants to view their own payments
CREATE POLICY "Tenants can view own payments"
ON payments FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = payments.tenant_id
    AND tenants.profile_id = auth.uid()
  )
);

-- Allow tenants to insert their own payments
CREATE POLICY "Tenants can insert own payments"
ON payments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = payments.tenant_id
    AND tenants.profile_id = auth.uid()
  )
);

-- Allow owners to view payments for their properties
CREATE POLICY "Owners can view property payments"
ON payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = payments.property_id
    AND properties.owner_id = auth.uid()
  )
);

-- Allow owners to update payment status
CREATE POLICY "Owners can update payment status"
ON payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = payments.property_id
    AND properties.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = payments.property_id
    AND properties.owner_id = auth.uid()
  )
);

-- Allow owners to delete payments
CREATE POLICY "Owners can delete payments"
ON payments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = payments.property_id
    AND properties.owner_id = auth.uid()
  )
);

-- Storage policies for payment-proofs bucket
CREATE POLICY "Public can view payment proofs" ON storage.objects FOR SELECT TO public USING (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated can upload payment proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated can delete own payment proofs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
