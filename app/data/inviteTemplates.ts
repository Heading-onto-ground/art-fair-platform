export type InviteTemplates = {
  galleryId: string;
  korea: string;
  japan: string;
  global: string;
  updatedAt: number;
};

const KEY = "__INVITE_TEMPLATES_STORE__";

function getStore(): Record<string, InviteTemplates> {
  const g = globalThis as any;
  if (!g[KEY]) {
    g[KEY] = {};
  }
  return g[KEY] as Record<string, InviteTemplates>;
}

export function getTemplates(galleryId: string): InviteTemplates {
  const store = getStore();
  if (!store[galleryId]) {
    store[galleryId] = {
      galleryId,
      korea:
        `안녕하세요 {{artist}}님! {{gallery}}에서 "{{theme}}" 오픈콜에 초대합니다. ` +
        `마감: {{deadline}} · {{city}}, {{country}}`,
      japan:
        `こんにちは {{artist}}さん！{{gallery}}より「{{theme}}」オープンコールにご招待します。 ` +
        `締切: {{deadline}} · {{city}}, {{country}}`,
      global:
        `Hello {{artist}}! {{gallery}} invites you to the open call "{{theme}}". ` +
        `Deadline: {{deadline}} · {{city}}, {{country}}`,
      updatedAt: Date.now(),
    };
  }
  return store[galleryId];
}

export function updateTemplates(
  galleryId: string,
  input: Partial<Omit<InviteTemplates, "galleryId" | "updatedAt">>
): InviteTemplates {
  const existing = getTemplates(galleryId);
  const updated: InviteTemplates = {
    ...existing,
    korea: input.korea ?? existing.korea,
    japan: input.japan ?? existing.japan,
    global: input.global ?? existing.global,
    updatedAt: Date.now(),
  };
  const store = getStore();
  store[galleryId] = updated;
  return updated;
}
