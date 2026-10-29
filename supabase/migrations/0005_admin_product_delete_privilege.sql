-- The server already restricts deletion to Admin-created products and keeps
-- products with order history inactive instead of deleting those records.
-- Match the runtime role's permissions to that existing Admin action only.
GRANT DELETE ON TABLE public.products TO okv_preview_app;
