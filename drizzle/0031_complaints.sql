DO $$ BEGIN
  CREATE TYPE "complaint_status" AS ENUM ('new', 'contacted', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "complaints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name" varchar(150),
  "contact" varchar(320),
  "message" text NOT NULL,
  "status" "complaint_status" DEFAULT 'new' NOT NULL,
  "awaiting_admin" boolean DEFAULT true NOT NULL,
  "resolved_at" timestamp with time zone,
  "last_message_at" timestamp with time zone,
  "source_page_url" text,
  "internal_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "complaints_awaiting_admin_idx" ON "complaints" ("awaiting_admin");
CREATE INDEX IF NOT EXISTS "complaints_created_at_idx" ON "complaints" ("created_at");

CREATE TABLE IF NOT EXISTS "complaint_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "complaint_id" uuid NOT NULL,
  "sender_type" "inquiry_message_sender_type" NOT NULL,
  "admin_id" uuid,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "complaint_messages"
    ADD CONSTRAINT "complaint_messages_complaint_id_complaints_id_fk"
    FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "complaint_messages"
    ADD CONSTRAINT "complaint_messages_admin_id_admins_id_fk"
    FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "complaint_messages_complaint_created_idx" ON "complaint_messages" ("complaint_id", "created_at");

INSERT INTO "ui_strings" ("site", "key", "default_text", "group", "context", "status", "updated_at")
VALUES
  ('web', 'partnership.complaint.title', 'Complaints and suggestions', 'partnership', '', 'active', now()),
  ('web', 'partnership.complaint.lead', 'Share a complaint or suggestion. Only the message is required.', 'partnership', '', 'active', now()),
  ('web', 'partnership.complaint.name', 'Name', 'partnership', '', 'active', now()),
  ('web', 'partnership.complaint.namePlaceholder', 'Your name (optional)', 'partnership', '', 'active', now()),
  ('web', 'partnership.complaint.contact', 'Contact', 'partnership', '', 'active', now()),
  ('web', 'partnership.complaint.contactPlaceholder', 'Phone or email (optional)', 'partnership', '', 'active', now()),
  ('web', 'partnership.complaint.message', 'Message', 'partnership', '', 'active', now()),
  ('web', 'partnership.complaint.messagePlaceholder', 'Describe your complaint or suggestion', 'partnership', '', 'active', now()),
  ('web', 'partnership.complaint.submit', 'Submit', 'partnership', '', 'active', now()),
  ('web', 'partnership.complaint.success', 'Thank you. We have received your message.', 'partnership', '', 'active', now())
ON CONFLICT ("site", "key") DO UPDATE SET
  "default_text" = EXCLUDED."default_text",
  "group" = EXCLUDED."group",
  "status" = 'active',
  "updated_at" = now();

INSERT INTO "ui_string_translations" ("site", "key", "locale", "value", "source", "updated_at")
VALUES
  ('web', 'partnership.complaint.title', 'zh', '投诉和建议', 'manual', now()),
  ('web', 'partnership.complaint.lead', 'zh', '欢迎留下投诉或建议，只有内容为必填。', 'manual', now()),
  ('web', 'partnership.complaint.name', 'zh', '姓名', 'manual', now()),
  ('web', 'partnership.complaint.namePlaceholder', 'zh', '您的姓名（选填）', 'manual', now()),
  ('web', 'partnership.complaint.contact', 'zh', '联系方式', 'manual', now()),
  ('web', 'partnership.complaint.contactPlaceholder', 'zh', '电话或邮箱（选填）', 'manual', now()),
  ('web', 'partnership.complaint.message', 'zh', '内容', 'manual', now()),
  ('web', 'partnership.complaint.messagePlaceholder', 'zh', '请描述您的投诉或建议', 'manual', now()),
  ('web', 'partnership.complaint.submit', 'zh', '提交', 'manual', now()),
  ('web', 'partnership.complaint.success', 'zh', '感谢反馈，我们已收到您的内容。', 'manual', now()),
  ('web', 'partnership.complaint.title', 'zh-CN', '投诉和建议', 'manual', now()),
  ('web', 'partnership.complaint.lead', 'zh-CN', '欢迎留下投诉或建议，只有内容为必填。', 'manual', now()),
  ('web', 'partnership.complaint.name', 'zh-CN', '姓名', 'manual', now()),
  ('web', 'partnership.complaint.namePlaceholder', 'zh-CN', '您的姓名（选填）', 'manual', now()),
  ('web', 'partnership.complaint.contact', 'zh-CN', '联系方式', 'manual', now()),
  ('web', 'partnership.complaint.contactPlaceholder', 'zh-CN', '电话或邮箱（选填）', 'manual', now()),
  ('web', 'partnership.complaint.message', 'zh-CN', '内容', 'manual', now()),
  ('web', 'partnership.complaint.messagePlaceholder', 'zh-CN', '请描述您的投诉或建议', 'manual', now()),
  ('web', 'partnership.complaint.submit', 'zh-CN', '提交', 'manual', now()),
  ('web', 'partnership.complaint.success', 'zh-CN', '感谢反馈，我们已收到您的内容。', 'manual', now())
ON CONFLICT ("site", "key", "locale") DO UPDATE SET
  "value" = EXCLUDED."value",
  "updated_at" = now();
