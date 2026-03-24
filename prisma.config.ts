import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Prisma 7: migrate / db push 는 여기의 URL 사용 (schema.prisma 의 url 은 사용 안 함)
  datasource: {
    url: env("DATABASE_URL"),
  },
});
