import axios from 'axios';
import type { OnboardingFormData } from '@/pages/Setup/OnboardingPage';

const authBaseURL =
  import.meta.env.VITE_AUTH_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3001';

// CRM (enterprise) origin — where the whitelabel logo endpoint lives. Empty in
// the shell build so the request is same-origin and rides the reverse proxy.
const crmBaseURL = import.meta.env.VITE_API_URL || '';

const setupApi = axios.create({
  baseURL: authBaseURL,
  headers: { 'Content-Type': 'application/json' },
});

export interface SetupStatus {
  status: 'active' | 'inactive';
  instance_id: string | null;
  api_key?: string;
  licensed?: boolean;
  /** True when the box supports box branding (enterprise whitelabel present). */
  whitelabel?: boolean;
}

export interface BootstrapPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  // Optional box branding captured at /setup on a whitelabel-capable box. The
  // backend persists only the provided, non-blank fields onto the single
  // agency's whitelabel row (no-op on a community-only install).
  app_title?: string;
  primary_color?: string;
  secondary_color?: string;
}

/** Logo/favicon images captured in the branding step (all optional). */
export interface BrandingLogos {
  light?: File;
  dark?: File;
  favicon?: File;
}

export interface BootstrapResponse {
  status: string;
  message: string;
  survey_token: string | null;
}

export const setupService = {
  async getStatus(): Promise<SetupStatus> {
    const { data } = await setupApi.get<SetupStatus>('/setup/status');
    return data;
  },

  async bootstrap(payload: BootstrapPayload): Promise<BootstrapResponse> {
    const { data } = await setupApi.post<BootstrapResponse>('/setup/bootstrap', payload);
    return data;
  },

  /**
   * Best-effort upload of the box logo/favicon captured at /setup.
   *
   * The binary upload lives behind the authenticated enterprise endpoint
   * (POST /enterprise/v1/admin/whitelabel/logo), so we sign in with the
   * just-created admin to obtain a token — a standalone request that does NOT
   * touch the global auth store (the operator still logs in fresh afterwards).
   *
   * This NEVER throws: a failure (endpoint unreachable, missing grant, etc.)
   * must not block finishing the install — the text branding is already
   * persisted by /setup/bootstrap, and logos can be re-uploaded later from the
   * whitelabel settings. Returns true only when every provided image uploaded.
   */
  async uploadBrandingLogos(
    email: string,
    password: string,
    logos: BrandingLogos,
  ): Promise<boolean> {
    const variants = (['light', 'dark', 'favicon'] as const).filter(v => logos[v]);
    if (variants.length === 0) return true;

    let token: string | null = null;
    try {
      const { data } = await axios.post(
        `${authBaseURL}/api/v1/auth/login`,
        { email, password },
        { headers: { 'Content-Type': 'application/json' } },
      );
      token =
        data?.data?.token?.access_token ||
        data?.data?.access_token ||
        data?.access_token ||
        null;
    } catch {
      token = null;
    }
    if (!token) return false;

    let allOk = true;
    for (const variant of variants) {
      try {
        const formData = new FormData();
        formData.append('file', logos[variant] as File);
        formData.append('variant', variant);
        await axios.post(`${crmBaseURL}/enterprise/v1/admin/whitelabel/logo`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        allOk = false;
      }
    }
    return allOk;
  },

  /** POST /setup/survey — pre-login, authenticated via one-time survey_token */
  async saveSurvey(form: OnboardingFormData, surveyToken: string): Promise<void> {
    await setupApi.post(
      '/setup/survey',
      {
        team_size:          form.teamSize,
        daily_volume:       form.dailyVolume,
        main_channel:       form.mainChannel,
        main_channel_other: form.mainChannelOther,
        uses_ai:            form.usesAI,
        biggest_pain:       form.biggestPain,
        crm_experience:     form.crmExperience,
        main_goal:          form.mainGoal,
      },
      { headers: { 'X-Survey-Token': surveyToken } },
    );
  },
};
