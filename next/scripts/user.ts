import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateUsers() {
	// 1) 旧ユーザー一覧を取得
	const legacyUsers = await prisma.legacyUser.findMany();

	for (const lu of legacyUsers) {
		// 2) 旧 `UserEmail` からメールを取得
		const userEmail = await prisma.userEmail.findUnique({
			where: { userId: lu.id },
		});
		const email = userEmail?.email;
		if (!email) {
			// メールなしの場合どうするか？
			// NextAuthはemail必須が多いのでスキップ or ダミーを入れる
			continue;
		}

		// 3) 新しい `User` をINSERT
		//    - oldUserId に lu.id (旧ID) を保存
		//    - name に lu.displayName
		//    - image に lu.icon
		await prisma.user.create({
			data: {
				oldUserId: lu.id,
				email: email,
				name: lu.displayName,
				image: lu.icon,
			},
		});
	}

	console.log("LegacyUser → User の移行完了");
}

migrateUsers()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
