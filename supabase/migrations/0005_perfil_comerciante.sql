-- =============================================================
-- Cidade Digital — permite que um visitante se torne comerciante
-- (auto-serviço). Promoção a 'admin' continua exclusiva de admin.
-- =============================================================

drop policy if exists perfis_upd_self on perfis;

create policy perfis_upd_self on perfis for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and funcao in ('visitante', 'comerciante')  -- nunca 'admin' por esta via
  );
