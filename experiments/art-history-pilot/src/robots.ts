export type RobotRule = { allow: boolean; path: string };
export type RobotGroup = { agents: string[]; rules: RobotRule[] };

export function parseRobots(text: string): RobotGroup[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean);
  const groups: RobotGroup[] = [];
  let current: RobotGroup | null = null;
  for (const line of lines) {
    const index = line.indexOf(":");
    if (index < 0) continue;
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [value], rules: [] };
        groups.push(current);
      } else {
        current.agents.push(value);
      }
      continue;
    }
    if (!current) continue;
    if (key === "disallow" && value === "") {
      current.rules.push({ allow: true, path: "/" });
    } else if (key === "allow" || key === "disallow") {
      current.rules.push({ allow: key === "allow", path: value });
    }
  }
  return groups;
}

function robotsPatternMatches(pattern: string, requestPath: string): boolean {
  let source = pattern;
  let anchorEnd = false;
  if (source.endsWith("$")) {
    anchorEnd = true;
    source = source.slice(0, -1);
  }
  const body = source.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${body}${anchorEnd ? "$" : ""}`).test(requestPath);
}

export function robotsAllows(text: string, requestPath: string, agent = "*"): boolean {
  const groups = parseRobots(text);
  const specific = groups.find((group) =>
    group.agents.some((name) => name.toLowerCase() === agent.toLowerCase()),
  );
  const group = specific ?? groups.find((item) => item.agents.includes("*"));
  if (!group) return true;
  let winner: { length: number; allow: boolean } | null = null;
  for (const rule of group.rules) {
    if (!rule.path || !robotsPatternMatches(rule.path, requestPath)) continue;
    const allowWinsTie = rule.path.length === winner?.length && rule.allow && !winner.allow;
    if (!winner || rule.path.length > winner.length || allowWinsTie) {
      winner = { length: rule.path.length, allow: rule.allow };
    }
  }
  return winner ? winner.allow : true;
}

export function crawlDelaySeconds(text: string): number | null {
  const match = text.match(/crawl-delay\s*:\s*(\d+)/i);
  if (!match) return null;
  return Number(match[1]);
}
