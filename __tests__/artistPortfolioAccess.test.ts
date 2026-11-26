import { beforeEach, describe, expect, it, vi } from "vitest";

const getProfile = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn());
const getAdmin = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  getProfileByUserId: (...args: unknown[]) => getProfile(...args),
  getServerSession: () => getSession(),
}));

vi.mock("@/lib/adminAuth", () => ({
  getAdminSession: () => getAdmin(),
}));

import { GET } from "@/app/api/artist-portfolio/[id]/route";

const PDF = "data:application/pdf;base64,JVBERg==";

function artist(id: string, exhibitionsPublic: boolean) {
  return { userId: id, role: "artist", portfolioUrl: PDF, exhibitions_public: exhibitionsPublic };
}

describe("public portfolio PDF access", () => {
  beforeEach(() => {
    getSession.mockReturnValue(null);
    getAdmin.mockReturnValue(null);
    getProfile.mockImplementation(async (id: string) => {
      if (id === "public-artist") return artist(id, true);
      if (id === "private-artist") return artist(id, false);
      if (id === "empty-artist") return { userId: id, role: "artist", portfolioUrl: "", exhibitions_public: true };
      return null;
    });
  });

  async function get(id: string) {
    return GET(new Request(`https://rob.example/api/artist-portfolio/${id}`), { params: { id } });
  }

  it("keeps an anonymous PDF available when the artist profile is public", async () => {
    const response = await get("public-artist");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
  });

  it("hides a PDF when the artist profile is not public", async () => {
    const response = await get("private-artist");
    expect(response.status).toBe(404);
  });

  it("still lets the artist open their own PDF when the profile is not public", async () => {
    getSession.mockReturnValue({ userId: "private-artist", role: "artist" });
    const response = await get("private-artist");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
  });

  it("keeps the admin review link available for a private profile", async () => {
    getAdmin.mockReturnValue({ email: "admin@example.com", role: "admin", isAdmin: true });
    const response = await get("private-artist");
    expect(response.status).toBe(200);
  });

  it("does not let another account open a private PDF", async () => {
    getSession.mockReturnValue({ userId: "someone-else", role: "gallery" });
    const response = await get("private-artist");
    expect(response.status).toBe(404);
  });

  it("returns not found when the artist or the file is missing", async () => {
    expect((await get("missing")).status).toBe(404);
    expect((await get("empty-artist")).status).toBe(404);
  });
});
