-- 037_create_verification_documents.sql
-- Private table for business/legal verification documents uploaded by users.
--
-- SECURITY NOTE:
--   This table is intentionally separate from all public image tables.
--   Documents stored here must NEVER be returned by public profile APIs.
--   Access is restricted to:
--     - The profile owner (to view/replace their own document)
--     - Admin users (to review documents during the verification process)
--
-- Accepted formats: JPEG, PNG, PDF
-- Storage: Supabase Storage under verification-docs/{profileId}/{uuid}.{ext}
-- The Supabase bucket for these documents should be set to PRIVATE
-- (no public URL access without a signed URL generated server-side).

CREATE TABLE IF NOT EXISTS verification_documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The profile this document belongs to (one active document per profile)
  profile_id    UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,

  -- Human-readable file name (original upload filename, sanitised)
  document_name TEXT        NOT NULL,

  -- File type description (e.g. 'business_license', 'registration_certificate')
  document_type TEXT        NOT NULL DEFAULT 'business_license',

  -- Supabase Storage object path — used for signed URL generation and deletion
  -- Stored in the format: verification-docs/{profileId}/{uuid}.{ext}
  storage_key   TEXT        NOT NULL,

  -- MIME type of the uploaded file (image/jpeg | image/png | application/pdf)
  mime_type     TEXT        NOT NULL,

  -- File size in bytes — stored for admin display and audit purposes
  file_size     BIGINT,

  -- Upload timestamp
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Review notes set by admin (optional — can note document quality issues)
  admin_notes   TEXT
);

-- A profile should have at most one active document at a time.
-- Previous documents are replaced on resubmission (old record deleted, new inserted).
-- We use a unique index on profile_id so the code can rely on finding at most one row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_documents_profile_id
  ON verification_documents (profile_id);

-- Admin query: list all documents for a given profile (for audit history if we later
-- switch to keeping history; currently the UNIQUE index enforces one per profile).
CREATE INDEX IF NOT EXISTS idx_verification_documents_uploaded_at
  ON verification_documents (uploaded_at DESC);
