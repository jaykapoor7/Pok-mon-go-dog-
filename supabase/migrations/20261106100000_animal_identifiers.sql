-- Animal identifiers: RFID tags, ISO microchips, QR codes and printed tags.
-- One active identifier belongs to one animal. Organisations see only their
-- own identifiers; a scan of another organisation's identifier says only that
-- it is registered elsewhere. Every add and retire writes the operational
-- audit log. Additive only: no existing table or row is changed.

CREATE TABLE IF NOT EXISTS public.animal_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL REFERENCES public.ngos(id),
  kind text NOT NULL CHECK (kind IN ('microchip','rfid_tag','qr','ear_tag','collar_tag')),
  value text NOT NULL CHECK (length(value) BETWEEN 3 AND 64 AND value ~ '^[A-Z0-9._:/-]+$'),
  note text CHECK (note IS NULL OR length(note) <= 200),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  retired_by uuid REFERENCES auth.users(id),
  CHECK (kind <> 'microchip' OR value ~ '^([0-9]{15}|[0-9A-F]{9,10})$')
);
CREATE UNIQUE INDEX IF NOT EXISTS animal_identifiers_active_unique ON public.animal_identifiers (kind, value) WHERE retired_at IS NULL;
CREATE INDEX IF NOT EXISTS animal_identifiers_dog ON public.animal_identifiers (dog_id);
CREATE INDEX IF NOT EXISTS animal_identifiers_value ON public.animal_identifiers (value) WHERE retired_at IS NULL;

ALTER TABLE public.animal_identifiers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.animal_identifiers FROM anon, authenticated;
GRANT SELECT ON public.animal_identifiers TO authenticated;
CREATE POLICY animal_identifiers_read ON public.animal_identifiers FOR SELECT TO authenticated
USING (ngo_id = (SELECT public.my_ngo()));

-- Normalise what a scanner or a person typed: trim, upper-case, drop spaces.
CREATE OR REPLACE FUNCTION public.normalise_identifier(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT upper(regexp_replace(coalesce(p_value, ''), '\s+', '', 'g'));
$$;

-- Add an identifier to one of the caller's organisation's animals.
CREATE OR REPLACE FUNCTION public.add_animal_identifier(p_dog_id uuid, p_kind text, p_value text, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid uuid := auth.uid(); org uuid := public.my_ngo(); v text := public.normalise_identifier(p_value); rid uuid; holder uuid;
BEGIN
  IF uid IS NULL OR org IS NULL THEN RAISE EXCEPTION 'Organisation access required' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dogs d WHERE d.id = p_dog_id AND d.ngo_id = org) THEN
    RAISE EXCEPTION 'This animal is not in your organisation''s register' USING ERRCODE = '42501';
  END IF;
  SELECT ngo_id INTO holder FROM public.animal_identifiers WHERE kind = p_kind AND value = v AND retired_at IS NULL;
  IF FOUND THEN
    RAISE EXCEPTION '%', CASE WHEN holder = org THEN 'This identifier is already on an animal in your register' ELSE 'This identifier is registered with another organisation' END USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.animal_identifiers (dog_id, ngo_id, kind, value, note, created_by)
  VALUES (p_dog_id, org, p_kind, v, nullif(btrim(left(coalesce(p_note, ''), 200)), ''), uid)
  RETURNING id INTO rid;
  INSERT INTO public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  VALUES (org, uid, 'animal_identifier', rid, 'identifier_added', jsonb_build_object('dog_id', p_dog_id, 'kind', p_kind, 'value', v));
  RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.add_animal_identifier(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_animal_identifier(uuid, text, text, text) TO authenticated;

-- Retire an identifier (lost tag, misread chip). Coordinators, veterinarians and admins only.
CREATE OR REPLACE FUNCTION public.retire_animal_identifier(p_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid uuid := auth.uid(); org uuid := public.my_ngo(); row public.animal_identifiers;
BEGIN
  IF uid IS NULL OR org IS NULL THEN RAISE EXCEPTION 'Organisation access required' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ngo_members m WHERE m.user_id = uid AND m.ngo_id = org AND m.role IN ('admin','coordinator','veterinarian')) THEN
    RAISE EXCEPTION 'A coordinator, veterinarian or admin retires identifiers' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(coalesce(p_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'Say why the identifier is retired'; END IF;
  SELECT * INTO row FROM public.animal_identifiers WHERE id = p_id AND ngo_id = org AND retired_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Identifier not found' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.animal_identifiers SET retired_at = now(), retired_by = uid WHERE id = p_id;
  INSERT INTO public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data, after_data)
  VALUES (org, uid, 'animal_identifier', p_id, 'identifier_retired', jsonb_build_object('kind', row.kind, 'value', row.value, 'dog_id', row.dog_id), jsonb_build_object('reason', left(p_reason, 200)));
END $$;
REVOKE ALL ON FUNCTION public.retire_animal_identifier(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retire_animal_identifier(uuid, text) TO authenticated;

-- Look up a scan. Own organisation: the animal. Another organisation: only that it exists.
CREATE OR REPLACE FUNCTION public.lookup_animal_identifier(p_value text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE org uuid := public.my_ngo(); v text := public.normalise_identifier(p_value); hit record;
BEGIN
  IF auth.uid() IS NULL OR org IS NULL THEN RAISE EXCEPTION 'Organisation access required' USING ERRCODE = '42501'; END IF;
  IF length(v) < 3 THEN RETURN jsonb_build_object('found', false); END IF;
  -- A StrayPaw QR carries the animal's StrayPaw ID.
  IF v ~ '^SP:' OR v ~ '^SP-' THEN
    SELECT d.id, d.ngo_id, d.straypaw_id, d.name INTO hit FROM public.dogs d WHERE upper(d.straypaw_id) = regexp_replace(v, '^SP:', '') LIMIT 1;
    IF FOUND THEN
      RETURN CASE WHEN hit.ngo_id = org THEN jsonb_build_object('found', true, 'own', true, 'dog_id', hit.id, 'straypaw_id', hit.straypaw_id, 'name', hit.name, 'kind', 'qr')
                  ELSE jsonb_build_object('found', true, 'own', false) END;
    END IF;
  END IF;
  SELECT i.dog_id, i.ngo_id, i.kind, d.straypaw_id, d.name INTO hit
  FROM public.animal_identifiers i JOIN public.dogs d ON d.id = i.dog_id
  WHERE i.value = v AND i.retired_at IS NULL ORDER BY (i.ngo_id = org) DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  IF hit.ngo_id <> org THEN RETURN jsonb_build_object('found', true, 'own', false); END IF;
  RETURN jsonb_build_object('found', true, 'own', true, 'dog_id', hit.dog_id, 'straypaw_id', hit.straypaw_id, 'name', hit.name, 'kind', hit.kind);
END $$;
REVOKE ALL ON FUNCTION public.lookup_animal_identifier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_animal_identifier(text) TO authenticated;
