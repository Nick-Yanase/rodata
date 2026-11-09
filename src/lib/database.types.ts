/**
 * Tipos do banco. Escritos à mão para o MVP; para regenerar a partir do projeto:
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */
type Timestamps = { created_at: string };

export type TripRow = {
  id: string;
  org_id: string;
  created_by: string | null;
  title: string;
  origin: string;
  destination: string;
  trip_date: string;
  freight_cents: number;
  fuel_cents: number;
  toll_cents: number;
  food_cents: number;
  maintenance_cents: number;
  other_cents: number;
  cost_cents: number;
  km: number | null;
  created_at: string;
  updated_at: string;
};

export type NoteRow = {
  id: string;
  org_id: string;
  author_id: string | null;
  title: string;
  body: string;
  note_date: string;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = Timestamps & {
  id: string;
  name: string;
  /** cidade base, usada como origem padrão das viagens ("Bauru - SP") */
  home_city: string;
};

export type OrganizationRow = Timestamps & {
  id: string;
  name: string;
  created_by: string | null;
};

export type MemberRole = 'owner' | 'member';

export type OrganizationMemberRow = {
  org_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
};

export type OrganizationSettingsRow = {
  org_id: string;
  /** primeiro dia do mês de abertura do MEI */
  mei_opened_at: string | null;
  updated_at: string;
};

export type OrganizationInviteRow = Timestamps & {
  id: string;
  org_id: string;
  code: string;
  created_by: string | null;
  status: 'pending' | 'used' | 'revoked';
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
};

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type TripInsert = Omit<TripRow, 'cost_cents' | 'created_at' | 'updated_at' | 'created_by'> & {
  created_by?: string | null;
};
export type NoteInsert = Omit<NoteRow, 'created_at' | 'updated_at' | 'author_id'> & {
  author_id?: string | null;
};

export type Database = {
  public: {
    Tables: {
      trips: Table<TripRow, TripInsert>;
      notes: Table<NoteRow, NoteInsert>;
      profiles: Table<ProfileRow>;
      organizations: Table<OrganizationRow>;
      organization_members: Table<OrganizationMemberRow>;
      organization_settings: Table<OrganizationSettingsRow, Partial<OrganizationSettingsRow> & { org_id: string }>;
      organization_invites: Table<OrganizationInviteRow>;
    };
    Views: Record<string, never>;
    Functions: {
      dashboard_summary: {
        Args: { p_org: string; p_start: string; p_end: string; p_cmp_start: string; p_cmp_end: string };
        Returns: { current: Record<string, number>; previous: Record<string, number> };
      };
      period_totals: {
        Args: { p_org: string; p_start: string; p_end: string };
        Returns: Record<string, number>;
      };
      timeline: {
        Args: { p_org: string; p_start: string; p_end: string; p_grain: string };
        Returns: { bucket: string; revenue: number; cost: number }[];
      };
      create_organization: { Args: { p_name: string }; Returns: string };
      create_invite: { Args: { p_org: string }; Returns: OrganizationInviteRow };
      accept_invite: { Args: { p_code: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
