-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAGE_COMMENT', 'FOLLOW', 'TRANSLATION_VOTE');

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_page_comments" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "pageId" INTEGER NOT NULL,

    CONSTRAINT "notification_page_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_follows" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "followerId" TEXT NOT NULL,

    CONSTRAINT "notification_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_translation_votes" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "translationId" INTEGER NOT NULL,
    "voterId" TEXT NOT NULL,

    CONSTRAINT "notification_translation_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_page_comments_notificationId_key" ON "notification_page_comments"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_follows_notificationId_key" ON "notification_follows"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_translation_votes_notificationId_key" ON "notification_translation_votes"("notificationId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_page_comments" ADD CONSTRAINT "notification_page_comments_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_follows" ADD CONSTRAINT "notification_follows_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_translation_votes" ADD CONSTRAINT "notification_translation_votes_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
