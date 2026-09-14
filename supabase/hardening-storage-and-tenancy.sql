-- ════════════════════════════════════════════════════════════════════
-- Hardening before organisations upload at volume.
--
-- Three things the application cannot enforce, because all three are
-- enforced (or not) by the database and by Storage:
--
--   1. Upload limits. The 8 MB and image-type checks live in browser
--      JavaScript, which means they are advice. The anon key is public —
--      it ships in the page — so anyone can POST to Storage directly and
--      put a 2 GB file, or any file at all, into a bucket. A bucket-level
--      size limit and MIME allow-list are the only real ones.
--
--   2. Partner documents are world-readable. `partner-docs` is a public
--      bucket holding registration certificates, 12A/80G and PAN
--      documents that organisations send us to prove who they are. Those
--      should be readable by staff, not by anyone with the URL.
--
--   3. Cases are world-readable. The policy is
--      `using (not is_demo or is_member_of_ngo(ngo_id))`, which means
--      every real case row of every organisation is readable with the
--      public key: the animal, the location, the notes, who it was
--      assigned to. The dashboard already reads through my_org_cases(),
--      so the application does not depend on the open policy — but the
--      table does not know that.
--
-- READ BEFORE RUNNING. Section 3 changes who can read casework. If any
-- screen still reads `cases` directly with the anon key rather than
-- through an org-scoped function, it will go empty. Run sections 1 and 2
-- first, check the console, then run section 3.
-- ════════════════════════════════════════════════════════════════════


-- ── 1. Real upload limits, at the bucket ────────────────────────────
-- 8 MB matches what the interface already tells people. The MIME list is
-- what the product can actually display.

update storage.buckets
   set file_size_limit = 8388608,
       allowed_mime_types = array[
         'image/jpeg','image/jpg','image/png','image/webp',
         'image/heic','image/heif'
       ]
 where id = 'sightings';

update storage.buckets
   set file_size_limit = 8388608,
       allowed_mime_types = array[
         'image/jpeg','image/jpg','image/png','image/webp',
         'image/heic','image/heif','application/pdf'
       ]
 where id = 'partner-docs';


-- ── 2. Partner documents stop being public ──────────────────────────
-- Uploading stays open, because an organisation applies before it has an
-- account. Reading becomes staff-only: the application route reads with
-- the service role, which bypasses RLS, so nothing in the product breaks.
--
-- NOTE: existing public URLs already handed out stop resolving. The admin
-- screens should read these through a signed URL
-- (storage.createSignedUrl) rather than getPublicUrl.

update storage.buckets set public = false where id = 'partner-docs';

-- No read policy at all for anon or authenticated. The service role
-- bypasses RLS, so the admin API routes — which already use it — keep
-- working, and nobody else can read the bucket even with the URL.
drop policy if exists partner_docs_read on storage.objects;


-- ── 3. Casework belongs to the organisation that filed it ───────────
-- DEPENDS ON demo-mode.sql having been run: it defines is_member_of_ngo()
-- and the is_demo columns these policies read. Check with
--   select 1 from pg_proc where proname = 'is_member_of_ngo';
-- before running this section.
-- Everything else about a case stays as it is; this is only about who can
-- read the row. A case with no organisation attached (a community report
-- nobody has claimed) stays public, because that is the queue the public
-- map is showing.

drop policy if exists cases_read on cases;
create policy cases_read on cases for select
  using (
    (not is_demo or is_member_of_ngo(ngo_id))
    and (ngo_id is null or is_member_of_ngo(ngo_id))
  );

-- The same reasoning for an organisation's own animal records. A dog with
-- ngo_id set is that organisation's registry entry, and intake_notes is
-- written for them, not for the public map.
drop policy if exists dogs_read on dogs;
create policy dogs_read on dogs for select
  using (
    (not is_demo or is_member_of_ngo(ngo_id))
    and (ngo_id is null or is_member_of_ngo(ngo_id))
  );
