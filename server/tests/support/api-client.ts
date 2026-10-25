import { randomUUID } from 'node:crypto';

export const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';

export type ParticipantJson = {
  id: string;
  name: string;
  exclusions: string[];
  userId: string | null;
  invitePending: boolean;
};

export type MemberJson = {
  userId: string;
  role: 'owner' | 'member';
};

export type GroupJson = {
  id: string;
  name: string;
  participants: ParticipantJson[];
  members: MemberJson[];
};

export type IssuedInviteJson = {
  group: GroupJson;
  token: string;
};

export type InvitePreviewJson = {
  groupName: string;
  participantName: string;
};

export type ClaimedInviteJson = {
  groupId: string;
};

export type FailureJson = {
  failure: { type: string; reason: string };
};

export type ApiResponse<T> = {
  status: number;
  body: T;
};

type SessionOptions = {
  session?: boolean;
  email?: string;
  name?: string;
};

const cookieHeader = (response: Response): string => {
  const cookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
};

export const failureType = (response: ApiResponse<unknown>): string =>
  (response.body as FailureJson).failure.type;

export const uniqueGroupName = () => `Integration ${randomUUID()}`;

export const createApiClient = ({
  session = true,
  email = `integration-${randomUUID()}@example.com`,
  name = 'Integration User',
}: SessionOptions = {}) => {
  const createdGroupIds = new Set<string>();
  let cookie: string | undefined;
  let userId = '';

  const ensureSession = async () => {
    if (!session) {
      return undefined;
    }
    if (cookie) {
      return cookie;
    }
    const response = await fetch(`${baseUrl}/api/dev/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Dev session failed with ${response.status}: ${text || 'empty body'}`
      );
    }
    cookie = cookieHeader(response);
    const body = (await response.json()) as { user: { id: string } };
    userId = body.user.id;
    if (!cookie) {
      throw new Error('Dev session did not set a cookie');
    }
    return cookie;
  };

  const request = async <T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> => {
    const sessionCookie = path === '/health' ? undefined : await ensureSession();
    const headers = new Headers();
    if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    if (sessionCookie) {
      headers.set('cookie', sessionCookie);
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : undefined,
    };
  };

  const createGroup = async (groupName: string = uniqueGroupName()) => {
    const response = await request<GroupJson>('POST', '/api/groups', {
      name: groupName,
    });
    if (response.status === 201) {
      createdGroupIds.add(response.body.id);
    }
    return response;
  };

  const deleteGroup = async (groupId: string) => {
    const response = await request<undefined>(
      'DELETE',
      `/api/groups/${groupId}`
    );
    createdGroupIds.delete(groupId);
    return response;
  };

  return {
    get userId() {
      return userId;
    },
    health: () => request<unknown>('GET', '/health'),
    createGroup,
    listGroups: () => request<GroupJson[]>('GET', '/api/groups'),
    getGroup: (groupId: string) =>
      request<GroupJson>('GET', `/api/groups/${groupId}`),
    renameGroup: (groupId: string, groupName: unknown) =>
      request<GroupJson>('PUT', `/api/groups/${groupId}`, { name: groupName }),
    deleteGroup,
    addParticipant: (
      groupId: string,
      participant: { name?: string; exclusions?: string[] }
    ) =>
      request<GroupJson>(
        'POST',
        `/api/groups/${groupId}/participants`,
        participant
      ),
    updateParticipant: (
      groupId: string,
      participantId: string,
      changes: { name?: string; exclusions?: string[] }
    ) =>
      request<GroupJson>(
        'PUT',
        `/api/groups/${groupId}/participants/${participantId}`,
        changes
      ),
    removeParticipant: (groupId: string, participantId: string) =>
      request<GroupJson>(
        'DELETE',
        `/api/groups/${groupId}/participants/${participantId}`
      ),
    issueInvite: (groupId: string, participantId: string) =>
      request<IssuedInviteJson>(
        'POST',
        `/api/groups/${groupId}/participants/${participantId}/invite`
      ),
    revokeInvite: (groupId: string, participantId: string) =>
      request<GroupJson>(
        'DELETE',
        `/api/groups/${groupId}/participants/${participantId}/invite`
      ),
    previewInvite: (token: string) =>
      request<InvitePreviewJson>('GET', `/api/invites/${token}`),
    claimInvite: (token: string) =>
      request<ClaimedInviteJson>('POST', `/api/invites/${token}/claim`),
    cleanup: async () => {
      await Promise.all([...createdGroupIds].map(deleteGroup));
    },
  };
};
