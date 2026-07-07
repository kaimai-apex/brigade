-- Local dev seed data for Brigade / ConnectPro
-- Run: psql $DATABASE_URL -f scripts/seed-local.sql

INSERT INTO jobs.companies (id, name, industry, website, size)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'The Grand Kitchen', 'Hospitality', 'https://example.com/grand', '50-200'),
  ('22222222-2222-2222-2222-222222222222', 'Coastal Events Co.', 'Events', 'https://example.com/coastal', '10-50')
ON CONFLICT DO NOTHING;

-- Sample jobs (recruiter_id must match a real user after signup — update manually)
-- INSERT INTO jobs.jobs (company_id, recruiter_id, title, description, location, employment_type)
-- VALUES ('11111111-1111-1111-1111-111111111111', '<your-user-id>', 'Executive Chef', 'Lead a fine-dining brigade.', 'New York, NY', 'full-time');
