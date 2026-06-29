-- Ensure the current owner account has admin role for approval workflow
INSERT INTO public.user_roles (user_id, role)
VALUES ('6523cd85-5ae4-46e8-9538-edf8084bb628'::uuid, 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;