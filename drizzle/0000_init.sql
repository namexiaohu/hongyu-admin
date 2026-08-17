CREATE TYPE "public"."account_type" AS ENUM('oauth', 'oidc', 'email', 'credentials');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."admin_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."brand_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."cart_status" AS ENUM('active', 'converted', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."category_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."cms_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."coupon_discount_type" AS ENUM('direct_amount', 'percent', 'fixed_amount', 'special_price');--> statement-breakpoint
CREATE TYPE "public"."coupon_distribution_target_mode" AS ENUM('all_customers', 'selected_customers');--> statement-breakpoint
CREATE TYPE "public"."coupon_grant_source" AS ENUM('admin_send', 'registration', 'self_claim');--> statement-breakpoint
CREATE TYPE "public"."coupon_scope" AS ENUM('all', 'category', 'brand', 'product');--> statement-breakpoint
CREATE TYPE "public"."coupon_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."customer_message_sender_type" AS ENUM('admin', 'customer');--> statement-breakpoint
CREATE TYPE "public"."editorial_content_module" AS ENUM('editorial', 'faq');--> statement-breakpoint
CREATE TYPE "public"."editorial_content_type" AS ENUM('content');--> statement-breakpoint
CREATE TYPE "public"."geo_division_level" AS ENUM('country', 'admin1', 'admin2', 'admin3', 'locality', 'postal');--> statement-breakpoint
CREATE TYPE "public"."inquiry_message_sender_type" AS ENUM('customer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."inquiry_queue_kind" AS ENUM('new_inquiry', 'customer_replied');--> statement-breakpoint
CREATE TYPE "public"."inquiry_sales_status" AS ENUM('unset', 'following', 'negotiating', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'contacted', 'quoted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."newsletter_status" AS ENUM('subscribed', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."order_action_type" AS ENUM('status_change', 'shipment_added', 'refund_processed', 'terminated', 'note_updated', 'completed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('unpaid', 'pending_processing', 'partially_shipped', 'shipped', 'completed', 'cancelled', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'paid');--> statement-breakpoint
CREATE TYPE "public"."product_lifecycle" AS ENUM('new', 'active', 'nfd', 'eol', 'last_time_buy');--> statement-breakpoint
CREATE TYPE "public"."product_relation_type" AS ENUM('drivers', 'mechanical-integration', 'power-control', 'custom');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."purchase_mode" AS ENUM('buy', 'inquiry');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('none', 'pending', 'refunded', 'partially_refunded', 'refund_rejected');--> statement-breakpoint
CREATE TYPE "public"."refund_type" AS ENUM('full_refund', 'partial_refund', 'no_refund');--> statement-breakpoint
CREATE TYPE "public"."return_type" AS ENUM('return_goods', 'no_return');--> statement-breakpoint
CREATE TYPE "public"."shipping_status" AS ENUM('unshipped', 'shipped', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."simple_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."text_direction" AS ENUM('ltr', 'rtl');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'staff', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled', 'pending');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "account_type" NOT NULL,
	"provider" varchar(100) NOT NULL,
	"provider_account_id" varchar(191) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(50),
	"scope" text,
	"id_token" text,
	"session_state" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"company" varchar(150),
	"phone" varchar(50),
	"country_code" varchar(2) NOT NULL,
	"state" varchar(100),
	"city" varchar(100) NOT NULL,
	"address_line_1" varchar(255) NOT NULL,
	"address_line_2" varchar(255),
	"postal_code" varchar(30) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(32) NOT NULL,
	"name" varchar(200) NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"status" "admin_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"seo_title" varchar(70),
	"seo_description" varchar(160),
	"payload" jsonb DEFAULT '{"tags":[]}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logo_url" text,
	"website_url" text,
	"status" "brand_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"configuration_key" varchar(64) DEFAULT '' NOT NULL,
	"feature_selections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anonymous_token" varchar(255),
	"status" "cart_status" DEFAULT 'active' NOT NULL,
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"coupon_code" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"image_url" text,
	"status" "category_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"seo_title" varchar(70),
	"seo_description" varchar(160),
	"payload" jsonb DEFAULT '{"tags":[]}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"summary" text,
	"content" text,
	"seo_title" varchar(255),
	"seo_description" varchar(500),
	"status" "cms_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"default_shipping_method_code" varchar(100) DEFAULT 'dhl-express' NOT NULL,
	"volume_pricing_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shipping_country_rates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compare_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement" varchar(100) NOT NULL,
	"block_key" varchar(150) NOT NULL,
	"title" varchar(255),
	"subtitle" varchar(255),
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "content_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_brands" (
	"coupon_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	CONSTRAINT "coupon_brands_coupon_id_brand_id_pk" PRIMARY KEY("coupon_id","brand_id")
);
--> statement-breakpoint
CREATE TABLE "coupon_categories" (
	"coupon_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "coupon_categories_coupon_id_category_id_pk" PRIMARY KEY("coupon_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "coupon_distribution_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"target_mode" "coupon_distribution_target_mode" NOT NULL,
	"quantity_per_user" integer NOT NULL,
	"recipient_count" integer NOT NULL,
	"total_quantity" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"source" "coupon_grant_source" NOT NULL,
	"batch_id" uuid,
	"admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_locale_pricing" (
	"coupon_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"threshold_amount" numeric(12, 2),
	"discount_value" numeric(12, 4) NOT NULL,
	"max_discount_amount" numeric(12, 2),
	CONSTRAINT "coupon_locale_pricing_coupon_id_locale_pk" PRIMARY KEY("coupon_id","locale")
);
--> statement-breakpoint
CREATE TABLE "coupon_products" (
	"coupon_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "coupon_products_coupon_id_product_id_pk" PRIMARY KEY("coupon_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(64) NOT NULL,
	"coupon_key" varchar(64) NOT NULL,
	"scope" "coupon_scope" NOT NULL,
	"stackable" boolean DEFAULT false NOT NULL,
	"discount_type" "coupon_discount_type" NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" "coupon_status" DEFAULT 'inactive' NOT NULL,
	"note" text,
	"total_quota" integer,
	"issued_quantity" integer DEFAULT 0 NOT NULL,
	"per_user_limit" integer,
	"grant_on_register" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sender_type" "customer_message_sender_type" NOT NULL,
	"admin_id" uuid,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial_content_boards" (
	"content_id" uuid NOT NULL,
	"board_key" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_content_boards_pk" PRIMARY KEY("content_id","board_key")
);
--> statement-breakpoint
CREATE TABLE "editorial_content_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"content_type" "editorial_content_type" DEFAULT 'content' NOT NULL,
	"content_module" "editorial_content_module" DEFAULT 'editorial' NOT NULL,
	"locale" varchar(16) DEFAULT 'en-US' NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"summary" text,
	"seo_title" varchar(255),
	"seo_description" varchar(500),
	"payload" jsonb DEFAULT '{"body":"","coverStyle":null,"tags":[],"relatedProductSlugs":[],"authorName":null,"authorTitle":null,"authorBio":null,"category":null}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial_contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" "editorial_content_type" DEFAULT 'content' NOT NULL,
	"content_module" "editorial_content_module" DEFAULT 'editorial' NOT NULL,
	"board_key" varchar(100) DEFAULT 'content' NOT NULL,
	"status" "cms_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"workflow_settings" jsonb DEFAULT '{"brandVoiceSummary":"","geoStrategy":"","internalLinkPolicy":"","factCheckingPolicy":"","schemaPriorities":[],"publishGuardrails":[]}'::jsonb NOT NULL,
	"coverage_boards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"templates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"briefs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"runs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rate_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"base_currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"currency_code" varchar(3) PRIMARY KEY NOT NULL,
	"rate_to_base" numeric(18, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_definition_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"name" varchar(150) NOT NULL,
	"value_text" varchar(255),
	"value_min" numeric(12, 4),
	"value_max" numeric(12, 4),
	"unit" varchar(50),
	"text_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(120) NOT NULL,
	"spec_category" varchar(50) DEFAULT 'general' NOT NULL,
	"value_type" varchar(20) DEFAULT 'text' NOT NULL,
	"unit" varchar(50),
	"status" "brand_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"level" "geo_division_level" NOT NULL,
	"code" varchar(32) NOT NULL,
	"iso_alpha2" varchar(2),
	"iso_alpha3" varchar(3),
	"continent_code" varchar(32),
	"name_en" varchar(200) NOT NULL,
	"name_zh" varchar(200),
	"name_native" varchar(200),
	"name_en_title" varchar(200) NOT NULL,
	"postal_code" varchar(32),
	"postal_code_pattern" varchar(120),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"user_id" uuid,
	"full_name" varchar(150) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(50),
	"company" varchar(150),
	"country" varchar(100),
	"message" text NOT NULL,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"sales_status" "inquiry_sales_status" DEFAULT 'unset' NOT NULL,
	"awaiting_admin" boolean DEFAULT true NOT NULL,
	"queue_kind" "inquiry_queue_kind",
	"resolved_at" timestamp with time zone,
	"terminated_at" timestamp with time zone,
	"terminated_by" uuid,
	"last_message_at" timestamp with time zone,
	"source_page_url" text,
	"handled_by" uuid,
	"handled_at" timestamp with time zone,
	"internal_note" text,
	"quote_number" varchar(32),
	"rfq_payload" jsonb,
	"quoted_lines" jsonb,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"sender_type" "inquiry_message_sender_type" NOT NULL,
	"admin_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"status" "newsletter_status" DEFAULT 'subscribed' NOT NULL,
	"source" varchar(100),
	"subscribed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_action_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"action_type" "order_action_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"coupon_id" uuid,
	"coupon_code" varchar(64) NOT NULL,
	"coupon_name" varchar(255),
	"discount_type" varchar(32) NOT NULL,
	"discount_value" numeric(12, 4) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"scope_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"product_name" varchar(255) NOT NULL,
	"spu" varchar(100) NOT NULL,
	"variant_label" varchar(255),
	"feature_selections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_refund_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"refund_type" "refund_type" NOT NULL,
	"return_type" "return_type" NOT NULL,
	"reason" text,
	"requested_amount" numeric(12, 2),
	"processed_amount" numeric(12, 2),
	"processed_at" timestamp with time zone,
	"processed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_shipment_items" (
	"shipment_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity" integer,
	CONSTRAINT "order_shipment_items_pk" PRIMARY KEY("shipment_id","order_item_id")
);
--> statement-breakpoint
CREATE TABLE "order_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"tracking_number" varchar(120) NOT NULL,
	"shipped_at" timestamp with time zone NOT NULL,
	"note" text,
	"admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"user_id" uuid,
	"cart_id" uuid,
	"status" "order_status" DEFAULT 'unpaid' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"shipping_status" "shipping_status" DEFAULT 'unshipped' NOT NULL,
	"refund_status" "refund_status" DEFAULT 'none' NOT NULL,
	"locale" varchar(16) DEFAULT 'en' NOT NULL,
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping_method" varchar(100),
	"payment_method" varchar(100),
	"airwallex_payment_intent_id" varchar(64),
	"stripe_payment_intent_id" varchar(64),
	"customer_note" text,
	"shipping_address_id" uuid,
	"billing_address_id" uuid,
	"shipping_address_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"billing_address_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"internal_note" text,
	"terminated_at" timestamp with time zone,
	"terminated_by" uuid,
	"placed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_board_assignments" (
	"product_id" uuid NOT NULL,
	"board_key" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_board_assignments_pk" PRIMARY KEY("product_id","board_key")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_feature_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"definition_id" uuid NOT NULL,
	"status" "brand_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_feature_value_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"value_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"value_text" text,
	"value_number" numeric(12, 4),
	"value_boolean" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_feature_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"status" "brand_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" varchar(255) NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_dimension" boolean DEFAULT false NOT NULL,
	"image_type" varchar(50) DEFAULT 'gallery' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"related_product_id" uuid NOT NULL,
	"relation_type" "product_relation_type" DEFAULT 'custom' NOT NULL,
	"relation_label" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"coverage_boards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" varchar(16) DEFAULT 'en' NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"short_description" text,
	"description" text,
	"seo_title" varchar(255),
	"seo_description" varchar(500),
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"compare_at_price" numeric(12, 2),
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"moq" integer DEFAULT 1 NOT NULL,
	"lead_time_min" integer DEFAULT 3 NOT NULL,
	"lead_time_max" integer DEFAULT 15 NOT NULL,
	"lead_time_unit" varchar(20) DEFAULT 'business_days' NOT NULL,
	"lifecycle_status" "product_lifecycle" DEFAULT 'active' NOT NULL,
	"eol_date" timestamp with time zone,
	"last_time_buy_date" timestamp with time zone,
	"efficiency_class" varchar(20),
	"payload" jsonb DEFAULT '{"coverUrl":null,"coverAlt":null,"gallery":[],"tags":[],"attachments":[],"certifications":[]}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"attributes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"compare_at_price" numeric(12, 2),
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"status" "simple_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid,
	"default_category_id" uuid,
	"spu" varchar(100) NOT NULL,
	"purchase_mode" "purchase_mode" DEFAULT 'buy' NOT NULL,
	"status" "product_status" DEFAULT 'inactive' NOT NULL,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"paid_sample_enabled" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"featured_sort_order" integer DEFAULT 0 NOT NULL,
	"has_multiple_specs" boolean DEFAULT false NOT NULL,
	"board_key" varchar(100),
	"configuration_rules" jsonb,
	"torque_curve_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_method_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipping_method_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"name" varchar(150) NOT NULL,
	"eta_label" varchar(100) DEFAULT '' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_languages" (
	"code" varchar(16) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"native_name" varchar(120) NOT NULL,
	"region" varchar(80) NOT NULL,
	"direction" text_direction DEFAULT 'ltr' NOT NULL,
	"country_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" "simple_status" DEFAULT 'active' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"default_currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"default_country_code" varchar(16) DEFAULT 'US' NOT NULL,
	"payment_sandbox_mode" boolean DEFAULT true NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ui_string_translations" (
	"key" varchar(200) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"value" text NOT NULL,
	"source" varchar(16) DEFAULT 'manual' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ui_string_translations_key_locale_pk" PRIMARY KEY("key","locale")
);
--> statement-breakpoint
CREATE TABLE "ui_strings" (
	"key" varchar(200) PRIMARY KEY NOT NULL,
	"default_text" text NOT NULL,
	"group" varchar(64) NOT NULL,
	"context" text,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(32) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"company" varchar(150),
	"phone" varchar(50),
	"avatar_url" text,
	"job_title" varchar(100),
	"industry" varchar(80),
	"company_country_code" varchar(2),
	"company_state" varchar(100),
	"company_city" varchar(100),
	"company_address_line1" varchar(255),
	"company_address_line2" varchar(255),
	"company_postal_code" varchar(30),
	"website" varchar(255),
	"tax_id" varchar(100),
	"company_size" varchar(50),
	"annual_volume_estimate" varchar(255),
	"internal_note" text,
	"verification_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_translations" ADD CONSTRAINT "brand_translations_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compare_items" ADD CONSTRAINT "compare_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compare_items" ADD CONSTRAINT "compare_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_brands" ADD CONSTRAINT "coupon_brands_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_brands" ADD CONSTRAINT "coupon_brands_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_categories" ADD CONSTRAINT "coupon_categories_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_categories" ADD CONSTRAINT "coupon_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_distribution_batches" ADD CONSTRAINT "coupon_distribution_batches_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_distribution_batches" ADD CONSTRAINT "coupon_distribution_batches_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_grants" ADD CONSTRAINT "coupon_grants_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_grants" ADD CONSTRAINT "coupon_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_grants" ADD CONSTRAINT "coupon_grants_batch_id_coupon_distribution_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."coupon_distribution_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_grants" ADD CONSTRAINT "coupon_grants_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_locale_pricing" ADD CONSTRAINT "coupon_locale_pricing_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_products" ADD CONSTRAINT "coupon_products_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_products" ADD CONSTRAINT "coupon_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_messages" ADD CONSTRAINT "customer_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_messages" ADD CONSTRAINT "customer_messages_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_content_boards" ADD CONSTRAINT "editorial_content_boards_content_id_editorial_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."editorial_contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_content_translations" ADD CONSTRAINT "editorial_content_translations_content_id_editorial_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."editorial_contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_definition_translations" ADD CONSTRAINT "feature_definition_translations_definition_id_feature_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."feature_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_divisions" ADD CONSTRAINT "geo_divisions_parent_id_geo_divisions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."geo_divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_terminated_by_admins_id_fk" FOREIGN KEY ("terminated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_action_logs" ADD CONSTRAINT "order_action_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_action_logs" ADD CONSTRAINT "order_action_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_coupon_redemptions" ADD CONSTRAINT "order_coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_coupon_redemptions" ADD CONSTRAINT "order_coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_refund_requests" ADD CONSTRAINT "order_refund_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_refund_requests" ADD CONSTRAINT "order_refund_requests_processed_by_admins_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_shipment_items" ADD CONSTRAINT "order_shipment_items_shipment_id_order_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."order_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_shipment_items" ADD CONSTRAINT "order_shipment_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_shipments" ADD CONSTRAINT "order_shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_shipments" ADD CONSTRAINT "order_shipments_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_address_id_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_terminated_by_admins_id_fk" FOREIGN KEY ("terminated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_board_assignments" ADD CONSTRAINT "product_board_assignments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_feature_assignments" ADD CONSTRAINT "product_feature_assignments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_feature_assignments" ADD CONSTRAINT "product_feature_assignments_definition_id_feature_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."feature_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_feature_value_translations" ADD CONSTRAINT "product_feature_value_translations_value_id_product_feature_values_id_fk" FOREIGN KEY ("value_id") REFERENCES "public"."product_feature_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_feature_values" ADD CONSTRAINT "product_feature_values_assignment_id_product_feature_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."product_feature_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_default_category_id_categories_id_fk" FOREIGN KEY ("default_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_method_translations" ADD CONSTRAINT "shipping_method_translations_shipping_method_id_shipping_methods_id_fk" FOREIGN KEY ("shipping_method_id") REFERENCES "public"."shipping_methods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ui_string_translations" ADD CONSTRAINT "ui_string_translations_key_ui_strings_key_fk" FOREIGN KEY ("key") REFERENCES "public"."ui_strings"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_unique" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "addresses_user_id_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_translations_brand_locale_unique" ON "brand_translations" USING btree ("brand_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_translations_slug_locale_unique" ON "brand_translations" USING btree ("slug","locale");--> statement-breakpoint
CREATE INDEX "brand_translations_brand_id_idx" ON "brand_translations" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brands_status_idx" ON "brands" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_unique_line" ON "cart_items" USING btree ("cart_id","product_id","configuration_key");--> statement-breakpoint
CREATE INDEX "categories_featured_idx" ON "categories" USING btree ("is_featured","featured_order");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_translations_category_locale_unique" ON "category_translations" USING btree ("category_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "category_translations_slug_locale_unique" ON "category_translations" USING btree ("slug","locale");--> statement-breakpoint
CREATE INDEX "category_translations_category_id_idx" ON "category_translations" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_pages_slug_unique" ON "cms_pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "compare_items_user_product_unique" ON "compare_items" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_blocks_placement_key_unique" ON "content_blocks" USING btree ("placement","block_key");--> statement-breakpoint
CREATE INDEX "coupon_distribution_batches_coupon_created_idx" ON "coupon_distribution_batches" USING btree ("coupon_id","created_at");--> statement-breakpoint
CREATE INDEX "coupon_grants_coupon_created_idx" ON "coupon_grants" USING btree ("coupon_id","created_at");--> statement-breakpoint
CREATE INDEX "coupon_grants_coupon_user_idx" ON "coupon_grants" USING btree ("coupon_id","user_id");--> statement-breakpoint
CREATE INDEX "coupon_grants_batch_idx" ON "coupon_grants" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "coupon_locale_pricing_coupon_id_idx" ON "coupon_locale_pricing" USING btree ("coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_coupon_key_unique" ON "coupons" USING btree ("coupon_key");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_unique" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "coupons_status_dates_idx" ON "coupons" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "editorial_content_boards_board_key_idx" ON "editorial_content_boards" USING btree ("board_key");--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_content_translations_content_locale_unique" ON "editorial_content_translations" USING btree ("content_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_content_translations_module_slug_locale_unique" ON "editorial_content_translations" USING btree ("content_module","slug","locale");--> statement-breakpoint
CREATE INDEX "editorial_content_translations_content_id_idx" ON "editorial_content_translations" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "editorial_contents_type_status_published_idx" ON "editorial_contents" USING btree ("content_type","status","published_at");--> statement-breakpoint
CREATE INDEX "editorial_contents_board_key_idx" ON "editorial_contents" USING btree ("board_key");--> statement-breakpoint
CREATE INDEX "editorial_contents_content_module_board_idx" ON "editorial_contents" USING btree ("content_module","board_key");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_definition_translations_definition_locale_unique" ON "feature_definition_translations" USING btree ("definition_id","locale");--> statement-breakpoint
CREATE INDEX "feature_definition_translations_definition_id_idx" ON "feature_definition_translations" USING btree ("definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_definitions_key_unique" ON "feature_definitions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "feature_definitions_status_idx" ON "feature_definitions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_divisions_parent_code_unique" ON "geo_divisions" USING btree ("parent_id","code");--> statement-breakpoint
CREATE INDEX "geo_divisions_parent_idx" ON "geo_divisions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "geo_divisions_level_idx" ON "geo_divisions" USING btree ("level");--> statement-breakpoint
CREATE INDEX "geo_divisions_continent_idx" ON "geo_divisions" USING btree ("continent_code");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_divisions_iso_alpha2_unique" ON "geo_divisions" USING btree ("iso_alpha2");--> statement-breakpoint
CREATE INDEX "inquiries_awaiting_admin_idx" ON "inquiries" USING btree ("awaiting_admin");--> statement-breakpoint
CREATE INDEX "inquiries_last_message_at_idx" ON "inquiries" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inquiries_quote_number_unique" ON "inquiries" USING btree ("quote_number");--> statement-breakpoint
CREATE INDEX "inquiry_messages_inquiry_created_idx" ON "inquiry_messages" USING btree ("inquiry_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_product_variant_unique" ON "inventory" USING btree ("product_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_email_unique" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_unique" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_airwallex_payment_intent_idx" ON "orders" USING btree ("airwallex_payment_intent_id");--> statement-breakpoint
CREATE INDEX "orders_stripe_payment_intent_idx" ON "orders" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "product_board_assignments_board_key_idx" ON "product_board_assignments" USING btree ("board_key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_feature_assignments_product_definition_unique" ON "product_feature_assignments" USING btree ("product_id","definition_id");--> statement-breakpoint
CREATE INDEX "product_feature_assignments_product_id_idx" ON "product_feature_assignments" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_feature_value_translations_value_locale_unique" ON "product_feature_value_translations" USING btree ("value_id","locale");--> statement-breakpoint
CREATE INDEX "product_feature_values_assignment_id_idx" ON "product_feature_values" USING btree ("assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_relations_unique" ON "product_relations" USING btree ("product_id","related_product_id");--> statement-breakpoint
CREATE INDEX "product_relations_product_idx" ON "product_relations" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "product_translations_product_locale_unique" ON "product_translations" USING btree ("product_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "product_translations_slug_locale_unique" ON "product_translations" USING btree ("slug","locale");--> statement-breakpoint
CREATE INDEX "product_translations_product_id_idx" ON "product_translations" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_product_sku_unique" ON "product_variants" USING btree ("product_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "products_spu_unique" ON "products" USING btree ("spu");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("featured","status");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_method_translations_method_locale_unique" ON "shipping_method_translations" USING btree ("shipping_method_id","locale");--> statement-breakpoint
CREATE INDEX "shipping_method_translations_locale_idx" ON "shipping_method_translations" USING btree ("locale");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_methods_code_unique" ON "shipping_methods" USING btree ("code");--> statement-breakpoint
CREATE INDEX "shipping_methods_enabled_idx" ON "shipping_methods" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "site_languages_status_sort_idx" ON "site_languages" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "site_languages_default_idx" ON "site_languages" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "ui_string_translations_locale_idx" ON "ui_string_translations" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "ui_strings_group_idx" ON "ui_strings" USING btree ("group");--> statement-breakpoint
CREATE INDEX "ui_strings_status_idx" ON "ui_strings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_industry_idx" ON "users" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "users_company_country_code_idx" ON "users" USING btree ("company_country_code");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlists_user_product_unique" ON "wishlists" USING btree ("user_id","product_id");