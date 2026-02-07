-- LLM models registry: dynamic model management
CREATE TABLE llm_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    openrouter_id TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default models
INSERT INTO llm_models (name, display_name, openrouter_id) VALUES
  ('gpt-4', 'GPT-4o', 'openai/gpt-4o'),
  ('claude', 'Claude', 'anthropic/claude-sonnet-4'),
  ('gemini', 'Gemini', 'google/gemini-2.0-flash-001');

-- Drop the hardcoded CHECK constraint on predictions.model_name
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_model_name_check;

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE llm_models;
