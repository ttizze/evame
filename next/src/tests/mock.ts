import { PageStatus } from "@prisma/client";

export const mockUser = {
  id: "mockUser.id",
  handle: "testuser",
  profile: "testuser",
  createdAt: new Date(),
  updatedAt: new Date(),
  totalPoints: 0,
  isAI: false,
  name: "testuser",
  image: "testuser",
};

export const mockPages = [
  {
    id: 1,
    userId: "mockUser.id",
    content: "test",
    slug: "test",
    sourceLocale: "en",
    status: PageStatus.PUBLIC,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    userId: "mockUser.id",
    content: "test",
    slug: "test",
    sourceLocale: "en",
    status: PageStatus.PUBLIC,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];