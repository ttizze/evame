DROP INDEX "accounts_provider_providerAccountId_key";--> statement-breakpoint
DROP INDEX "contents_kind_idx";--> statement-breakpoint
DROP INDEX "follows_follower_id_idx";--> statement-breakpoint
DROP INDEX "follows_following_id_idx";--> statement-breakpoint
DROP INDEX "gemini_api_keys_user_id_idx";--> statement-breakpoint
DROP INDEX "gemini_api_keys_user_id_key";--> statement-breakpoint
DROP INDEX "like_pages_guest_id_page_id_key";--> statement-breakpoint
DROP INDEX "like_pages_page_id_idx";--> statement-breakpoint
DROP INDEX "like_pages_user_id_idx";--> statement-breakpoint
DROP INDEX "like_pages_user_id_page_id_key";--> statement-breakpoint
DROP INDEX "notifications_actor_id_idx";--> statement-breakpoint
DROP INDEX "notifications_user_id_idx";--> statement-breakpoint
DROP INDEX "page_comments_page_id_parent_id_created_at_idx";--> statement-breakpoint
DROP INDEX "page_comments_parent_id_is_deleted_created_at_idx";--> statement-breakpoint
DROP INDEX "page_comments_user_id_idx";--> statement-breakpoint
DROP INDEX "page_locale_translation_proofs_page_id_locale_key";--> statement-breakpoint
DROP INDEX "page_locale_translation_proofs_translation_proof_status_idx";--> statement-breakpoint
DROP INDEX "pages_created_at_idx";--> statement-breakpoint
DROP INDEX "pages_parent_id_idx";--> statement-breakpoint
DROP INDEX "pages_parent_id_order_idx";--> statement-breakpoint
DROP INDEX "pages_slug_idx";--> statement-breakpoint
DROP INDEX "pages_slug_key";--> statement-breakpoint
DROP INDEX "pages_user_id_idx";--> statement-breakpoint
DROP INDEX "segment_annotation_links_annotation_segment_id_idx";--> statement-breakpoint
DROP INDEX "segment_annotation_links_main_segment_id_idx";--> statement-breakpoint
DROP INDEX "segment_metadata_metadata_type_id_idx";--> statement-breakpoint
DROP INDEX "segment_metadata_segment_id_idx";--> statement-breakpoint
DROP INDEX "segment_metadata_segment_id_metadata_type_id_value_key";--> statement-breakpoint
DROP INDEX "segment_metadata_types_key_key";--> statement-breakpoint
DROP INDEX "segment_translations_segment_id_locale_idx";--> statement-breakpoint
DROP INDEX "segment_translations_user_id_idx";--> statement-breakpoint
DROP INDEX "segment_types_key_idx";--> statement-breakpoint
DROP INDEX "segment_types_key_label_key";--> statement-breakpoint
DROP INDEX "segment_types_label_idx";--> statement-breakpoint
DROP INDEX "segments_content_id_idx";--> statement-breakpoint
DROP INDEX "segments_content_id_number_key";--> statement-breakpoint
DROP INDEX "segments_content_id_text_and_occurrence_hash_key";--> statement-breakpoint
DROP INDEX "segments_text_and_occurrence_hash_idx";--> statement-breakpoint
DROP INDEX "sessions_sessionToken_key";--> statement-breakpoint
DROP INDEX "tag_pages_pageId_idx";--> statement-breakpoint
DROP INDEX "tag_pages_tagId_idx";--> statement-breakpoint
DROP INDEX "tags_name_idx";--> statement-breakpoint
DROP INDEX "tags_name_key";--> statement-breakpoint
DROP INDEX "translation_jobs_userId_idx";--> statement-breakpoint
DROP INDEX "translation_votes_translation_id_idx";--> statement-breakpoint
DROP INDEX "translation_votes_translation_id_user_id_key";--> statement-breakpoint
DROP INDEX "translation_votes_user_id_idx";--> statement-breakpoint
DROP INDEX "user_credentials_user_id_idx";--> statement-breakpoint
DROP INDEX "user_credentials_user_id_key";--> statement-breakpoint
DROP INDEX "user_settings_user_id_key";--> statement-breakpoint
DROP INDEX "users_email_key";--> statement-breakpoint
DROP INDEX "users_handle_key";--> statement-breakpoint
DROP INDEX "verification_tokens_token_key";--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE INDEX "contents_kind_idx" ON "contents" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "follows_follower_id_idx" ON "follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "follows_following_id_idx" ON "follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "gemini_api_keys_user_id_idx" ON "gemini_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gemini_api_keys_user_id_key" ON "gemini_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "like_pages_guest_id_page_id_key" ON "like_pages" USING btree ("guest_id","page_id");--> statement-breakpoint
CREATE INDEX "like_pages_page_id_idx" ON "like_pages" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "like_pages_user_id_idx" ON "like_pages" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "like_pages_user_id_page_id_key" ON "like_pages" USING btree ("user_id","page_id");--> statement-breakpoint
CREATE INDEX "notifications_actor_id_idx" ON "notifications" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "page_comments_page_id_parent_id_created_at_idx" ON "page_comments" USING btree ("page_id","parent_id","created_at");--> statement-breakpoint
CREATE INDEX "page_comments_parent_id_is_deleted_created_at_idx" ON "page_comments" USING btree ("parent_id","is_deleted","created_at");--> statement-breakpoint
CREATE INDEX "page_comments_user_id_idx" ON "page_comments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_locale_translation_proofs_page_id_locale_key" ON "page_locale_translation_proofs" USING btree ("page_id","locale");--> statement-breakpoint
CREATE INDEX "page_locale_translation_proofs_translation_proof_status_idx" ON "page_locale_translation_proofs" USING btree ("translation_proof_status");--> statement-breakpoint
CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pages_parent_id_idx" ON "pages" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "pages_parent_id_order_idx" ON "pages" USING btree ("parent_id","order");--> statement-breakpoint
CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_key" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "pages_user_id_idx" ON "pages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "segment_annotation_links_annotation_segment_id_idx" ON "segment_annotation_links" USING btree ("annotation_segment_id");--> statement-breakpoint
CREATE INDEX "segment_annotation_links_main_segment_id_idx" ON "segment_annotation_links" USING btree ("main_segment_id");--> statement-breakpoint
CREATE INDEX "segment_metadata_metadata_type_id_idx" ON "segment_metadata" USING btree ("metadata_type_id");--> statement-breakpoint
CREATE INDEX "segment_metadata_segment_id_idx" ON "segment_metadata" USING btree ("segment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_metadata_segment_id_metadata_type_id_value_key" ON "segment_metadata" USING btree ("segment_id","metadata_type_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_metadata_types_key_key" ON "segment_metadata_types" USING btree ("key");--> statement-breakpoint
CREATE INDEX "segment_translations_segment_id_locale_idx" ON "segment_translations" USING btree ("segment_id","locale");--> statement-breakpoint
CREATE INDEX "segment_translations_user_id_idx" ON "segment_translations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "segment_types_key_idx" ON "segment_types" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_types_key_label_key" ON "segment_types" USING btree ("key","label");--> statement-breakpoint
CREATE INDEX "segment_types_label_idx" ON "segment_types" USING btree ("label");--> statement-breakpoint
CREATE INDEX "segments_content_id_idx" ON "segments" USING btree ("content_id");--> statement-breakpoint
CREATE UNIQUE INDEX "segments_content_id_number_key" ON "segments" USING btree ("content_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "segments_content_id_text_and_occurrence_hash_key" ON "segments" USING btree ("content_id","text_and_occurrence_hash");--> statement-breakpoint
CREATE INDEX "segments_text_and_occurrence_hash_idx" ON "segments" USING btree ("text_and_occurrence_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions" USING btree ("sessionToken");--> statement-breakpoint
CREATE INDEX "tag_pages_pageId_idx" ON "tag_pages" USING btree ("pageId");--> statement-breakpoint
CREATE INDEX "tag_pages_tagId_idx" ON "tag_pages" USING btree ("tagId");--> statement-breakpoint
CREATE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_key" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "translation_jobs_userId_idx" ON "translation_jobs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "translation_votes_translation_id_idx" ON "translation_votes" USING btree ("translation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_votes_translation_id_user_id_key" ON "translation_votes" USING btree ("translation_id","user_id");--> statement-breakpoint
CREATE INDEX "translation_votes_user_id_idx" ON "translation_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_credentials_user_id_idx" ON "user_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_credentials_user_id_key" ON "user_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_key" ON "users" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens" USING btree ("token");