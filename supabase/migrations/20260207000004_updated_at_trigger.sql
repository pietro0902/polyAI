CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER markets_updated_at
    BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER consensus_updated_at
    BEFORE UPDATE ON consensus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
