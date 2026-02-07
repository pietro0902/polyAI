-- Re-add UNIQUE constraint on (market_id, model_name) needed for upsert
ALTER TABLE predictions ADD CONSTRAINT predictions_market_id_model_name_key UNIQUE (market_id, model_name);
