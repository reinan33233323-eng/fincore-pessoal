-- FinCore Pessoal: zero-value entries remain valid records.
begin;
alter table public.entries drop constraint if exists entries_amount_check;
alter table public.entries add constraint entries_amount_check check (
 (not invoice_adjustment and amount >= 0) or
 (invoice_adjustment and amount <> 0 and kind='despesa' and credit_card_id is not null and invoice_month is not null and recurrence='nenhuma' and series_id is null)
);
commit;
