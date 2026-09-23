export type Source = {
  title: string;
  url: string;
  snippet: string | null;
};

export function normalizeSources(input: unknown): Source[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const result = item as Record<string, unknown>;
    const url = typeof result.url === "string" ? result.url : null;

    if (!url) return [];

    return [{
      url,
      title:
        typeof result.title === "string" && result.title.trim()
          ? result.title.trim()
          : new URL(url).hostname.replace(/^www\./, ""),
      snippet:
        typeof result.content === "string"
          ? result.content.slice(0, 1_500)
          : null,
    }];
  });
}

export function parseModelResponse(raw: string) {
  const followUpBlock = raw.match(
    /<FOLLOW_UPS>([\s\S]*?)<\/FOLLOW_UPS>/i,
  )?.[0];

  const followUps = [...raw.matchAll(/<question>([\s\S]*?)<\/question>/gi)]
    .map((match) => match[1]?.trim())
    .filter((question): question is string => Boolean(question))
    .slice(0, 3);

  const answer = raw
    .replace(followUpBlock ?? "", "")
    .replace(/<\/?ANSWER>/gi, "")
    .trim();

  return {
    answer,
    followUps,
  };
}

export function serializeMessage(message: {
  id: number;
  content: string;
  role: "User" | "Assistant";
  sources: unknown;
  followUps: unknown;
  createdAt: Date;
}) {
  return {
    id: message.id,
    content: message.content,
    role: message.role.toLowerCase(),
    sources: normalizeSources(message.sources),
    followUps: Array.isArray(message.followUps)
      ? message.followUps.filter((item): item is string => typeof item === "string")
      : [],
    createdAt: message.createdAt.toISOString(),
  };
}