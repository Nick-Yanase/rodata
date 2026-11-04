/**
 * Tipos do banco. Escritos à mão para o MVP; para regenerar a partir do projeto:
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */
type Timestamps = { created_at: string };

export type TripRow = {
  id: string;
  driver_id: string;
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
  driver_id: string;
  author_id: string;
  title: string;
  body: string;
  note_date: string;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = Timestamps & {
  id: string;
  name: string;
  role: 'driver' | 'analyst';
};

export type BusinessSettingsRow = {
  driver_id: string;
  regime: 'mei' | 'mei_tac' | 'me' | 'other';
  cnpj_opened_at: string | null;
  annual_limit_cents: number | null;
  updated_at: string;
};

export type AnalystLinkRow = Timestamps & {
  id: string;
  driver_id: string;
  analyst_id: string | null;
  invite_code: string;
  status: 'pending' | 'active' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
};

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type TripInsert = Omit<TripRow, 'cost_cents' | 'created_at' | 'updated_at' | 'driver_id'> & {
  driver_id?: string;
};
export type NoteInsert = Omit<NoteRow, 'created_at' | 'updated_at' | 'author_id'> & {
  author_id?: string;
};

export type Database = {
  public: {
    Tables: {
      trips: Table<TripRow, TripInsert>;
      notes: Table<NoteRow, NoteInsert>;
      profiles: Table<ProfileRow>;
      business_settings: Table<BusinessSettingsRow, Partial<BusinessSettingsRow> & { driver_id: string }>;
      analyst_links: Table<AnalystLinkRow>;
    };
    Views: Record<string, never>;
    Functions: {
      dashboard_summary: {
        Args: { p_driver: string; p_start: string; p_end: string; p_cmp_start: string; p_cmp_end: string };
        Returns: { current: Record<string, number>; previous: Record<string, number> };
      };
      period_totals: {
        Args: { p_driver: string; p_start: string; p_end: string };
        Returns: Record<string, number>;
      };
      timeline: {
        Args: { p_driver: string; p_start: string; p_end: string; p_grain: string };
        Returns: { bucket: string; revenue: number; cost: number }[];
      };
      create_invite: { Args: Record<string, never>; Returns: AnalystLinkRow };
      accept_invite: { Args: { p_code: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
