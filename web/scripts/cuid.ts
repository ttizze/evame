import { createId } from "@paralleldrive/cuid2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateUserCuid() {
	const users = await prisma.user.findMany({}); // 全ユーザー取得

	for (const user of users) {
		const newId = createId(); // ランダムなCUID生成
		await prisma.$executeRaw`
      UPDATE "users"
      SET "cuid" = ${newId}
      WHERE id = ${user.id}
    `;
	}
}

migrateUserCuid().then(() => {
	console.log("Done");
});
