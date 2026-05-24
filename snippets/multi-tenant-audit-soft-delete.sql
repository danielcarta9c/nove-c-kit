-- ============================================================================
-- multi-tenant-audit-soft-delete.sql
-- Fondamenta strutturali Nove C per qualsiasi app SaaS:
--   - workspaces + workspace_members + current_workspace_id()
--   - workspace_id NOT NULL su ogni tabella business
--   - deleted_at TIMESTAMPTZ su ogni tabella business (soft delete)
--   - audit_log con RLS workspace-scoped
--   - Policy RLS workspace-scoped + soft-delete-aware su tutte le tabelle
--
-- L'app può restare single-tenant nell'uso (1 workspace) ma lo schema è
-- pronto per N senza migrare dati. Costo upfront: 1 ora di SQL.
-- Costo retrofit a 18 mesi con 200k record: 1-2 settimane + rischio leak.
--
-- TODO progetto: cerca <entity_a>, <entity_b>, <entity_c> e sostituisci con
-- i nomi reali delle tue tabelle business (NON includere qui auth.users o
-- tabelle di sistema). Mantieni l'ordine: workspaces → membership → trigger
-- → ALTER tabelle → audit_log → policy.
--
-- Esecuzione: SQL Editor Supabase, una tantum. Idempotente, additive only.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- workspaces — anagrafica tenant (oggi: 1 riga; domani: N)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UUID fisso per workspace di default. Riusato come DEFAULT delle colonne
-- workspace_id su tutte le tabelle business.
INSERT INTO public.workspaces (id, nome, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Workspace principale', 'main')
ON CONFLICT (id) DO NOTHING;

-- Trigger updated_at (richiede public.set_updated_at() già definita nel tuo schema base)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_workspaces_updated') THEN
    CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- workspace_members — appartenenza utente↔workspace con ruolo
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON public.workspace_members (user_id);

-- Auto-iscrivi gli utenti esistenti al workspace di default.
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id, 'admin'
FROM auth.users
ON CONFLICT DO NOTHING;

-- Trigger: nuovi utenti aggiunti automaticamente come 'member' al default workspace.
CREATE OR REPLACE FUNCTION public.handle_new_user_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'member')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_on_auth_user_membership') THEN
    CREATE TRIGGER trg_on_auth_user_membership AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_membership();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- current_workspace_id() — workspace dell'utente loggato.
-- Per ora: il primo membership trovato. Quando passi a N workspace,
-- il client invierà l'id selezionato via header 'x-workspace-id'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_workspace_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- ----------------------------------------------------------------------------
-- Aggiunta workspace_id + deleted_at a tutte le tabelle business.
-- Tutte le righe esistenti vengono assegnate al workspace di default.
--
-- TODO progetto: edita l'array sotto con le tue tabelle business
-- (NON includere auth.users, workspaces, workspace_members, audit_log).
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    '<entity_a>', '<entity_b>', '<entity_c>'         -- ← edita qui
  ]) LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) DEFAULT ''00000000-0000-0000-0000-000000000001''',
      t
    );
    EXECUTE format(
      'UPDATE public.%I SET workspace_id = ''00000000-0000-0000-0000-000000000001'' WHERE workspace_id IS NULL',
      t
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN workspace_id SET NOT NULL',
      t
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_workspace ON public.%I (workspace_id) WHERE deleted_at IS NULL',
      t, t
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- audit_log — chi ha fatto cosa quando.
-- Strumento forense, conformità professionale, debugging post-mortem.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            BIGSERIAL PRIMARY KEY,
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  actor_id      UUID REFERENCES auth.users(id),       -- NULL se sistema/MCP
  action        TEXT NOT NULL,                         -- 'login', 'create', 'update', 'delete', 'batch:*', ...
  entity_type   TEXT NOT NULL,                         -- '<entity_a>', '<entity_b>', 'user', 'template', ...
  entity_id     TEXT,
  payload       JSONB,                                 -- diff o snapshot
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_workspace_created
  ON public.audit_log (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.audit_log (actor_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_select_own_workspace' AND tablename = 'audit_log') THEN
    CREATE POLICY audit_select_own_workspace ON public.audit_log
      FOR SELECT TO authenticated
      USING (workspace_id = public.current_workspace_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_insert_own_workspace' AND tablename = 'audit_log') THEN
    CREATE POLICY audit_insert_own_workspace ON public.audit_log
      FOR INSERT TO authenticated
      WITH CHECK (workspace_id = public.current_workspace_id());
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- RLS update: policy workspace-scoped + soft-delete-aware su ogni business
-- table. DROP + CREATE perché ALTER POLICY non supporta modifica predicato
-- in tutte le versioni Postgres — UNICA eccezione ammessa al "mai DROP"
-- perché stiamo droppando POLICY, non TABLE/COLUMN.
--
-- TODO progetto: stesso array della sezione ALTER sopra.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    '<entity_a>', '<entity_b>', '<entity_c>'         -- ← edita qui (stesso array di sopra)
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_full_access ON public.%I', t);

    -- SELECT: solo workspace corrente + non cancellati
    EXECUTE format($f$
      CREATE POLICY workspace_select ON public.%I
        FOR SELECT TO authenticated
        USING (workspace_id = public.current_workspace_id() AND deleted_at IS NULL)
    $f$, t);

    -- INSERT: workspace corrente
    EXECUTE format($f$
      CREATE POLICY workspace_insert ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (workspace_id = public.current_workspace_id())
    $f$, t);

    -- UPDATE: workspace corrente. Permettiamo update su righe "deleted_at IS NOT NULL"
    -- per casi di restore futuro (CHECK lato app).
    EXECUTE format($f$
      CREATE POLICY workspace_update ON public.%I
        FOR UPDATE TO authenticated
        USING (workspace_id = public.current_workspace_id())
        WITH CHECK (workspace_id = public.current_workspace_id())
    $f$, t);

    -- DELETE: scoraggiamo (preferire soft delete via UPDATE), aperta per cleanup admin.
    EXECUTE format($f$
      CREATE POLICY workspace_delete ON public.%I
        FOR DELETE TO authenticated
        USING (workspace_id = public.current_workspace_id())
    $f$, t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- POST-MIGRATION CHECK (manuale)
--   SELECT count(*) FROM <entity_a> WHERE workspace_id IS NULL;     -- atteso: 0
--   SELECT count(*) FROM workspace_members WHERE user_id IS NULL;   -- atteso: 0
--   SELECT current_workspace_id();                                  -- atteso: l'UUID di default
-- ============================================================================
