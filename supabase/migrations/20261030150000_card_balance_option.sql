-- FinCore Pessoal: control cards remain in consumption reports, never in cash.
begin;
alter table public.credit_cards add column if not exists include_in_balance boolean not null default true;
alter table public.card_invoice_payments alter column bank_id drop not null;
create or replace function public.add_personal_card_partial_payment(target_card uuid, target_month text, target_bank uuid, payment_amount numeric, payment_date date)
returns public.card_invoice_payments language plpgsql security definer set search_path=public as $$
declare open_amount numeric; result public.card_invoice_payments; included boolean; effective_bank uuid;
begin
 if not public.is_master() then raise exception 'Acesso restrito ao Master'; end if;
 if payment_date is null or payment_date>current_date then raise exception 'Informe a data de um pagamento já realizado'; end if;
 if payment_amount is null or payment_amount<=0 then raise exception 'Informe um valor maior que zero'; end if;
 select include_in_balance into included from public.credit_cards where id=target_card for update;
 if not found then raise exception 'Cartão não encontrado'; end if;
 effective_bank=case when included then target_bank else null end;
 if included then
  perform 1 from public.banks where id=effective_bank;
  if not found then raise exception 'Conta bancária não encontrada'; end if;
 end if;
 select coalesce(sum(amount),0) into open_amount from public.entries
  where credit_card_id=target_card and invoice_month=target_month and status='previsto';
 select open_amount-coalesce(sum(amount),0) into open_amount from public.card_invoice_payments
  where card_id=target_card and invoice_month=target_month and settled_date is null;
 if round(payment_amount,2)>round(open_amount,2) then raise exception 'O valor é maior que o saldo em aberto da fatura (%)', round(open_amount,2); end if;
 insert into public.card_invoice_payments(card_id,invoice_month,bank_id,amount,paid_date,notes)
 values(target_card,target_month,effective_bank,round(payment_amount,2),payment_date,'Pagamento parcial da fatura') returning * into result;
 return result;
end $$;

create or replace function public.pay_personal_card_invoice(target_card uuid, target_month text, target_bank uuid, payment_date date)
returns setof public.entries language plpgsql security definer set search_path=public as $$
declare included boolean; effective_bank uuid;
begin
 if not public.is_master() then raise exception 'Acesso restrito ao Master'; end if;
 if payment_date is null or payment_date>current_date then raise exception 'Informe a data de um pagamento já realizado'; end if;
 select include_in_balance into included from public.credit_cards where id=target_card for update;
 if not found then raise exception 'Cartão não encontrado'; end if;
 effective_bank=case when included then target_bank else null end;
 if included then
  perform 1 from public.banks where id=effective_bank for update;
  if not found then raise exception 'Conta bancária não encontrada'; end if;
 end if;
 update public.card_invoice_payments set settled_bank=effective_bank,settled_date=payment_date
 where card_id=target_card and invoice_month=target_month and settled_date is null;
 return query update public.entries set status='realizado',bank_id=effective_bank,paid_date=payment_date
 where credit_card_id=target_card and invoice_month=target_month and status='previsto' returning *;
end $$;

create or replace function public.set_personal_bank_balance(target_bank uuid, desired_balance numeric, effective_date date)
returns void language plpgsql security definer set search_path=public as $$
declare old_balance numeric;
begin
 if not public.is_master() then raise exception 'Acesso restrito ao Master'; end if;
 if desired_balance is null or abs(desired_balance) > 99999999999 or effective_date is null or effective_date > current_date then raise exception 'Saldo ou data inválidos'; end if;
 perform 1 from public.banks where id=target_bank for update;
 if not found then raise exception 'Conta não encontrada'; end if;
 select coalesce(sum(case when kind='receita' then amount else -(amount+coalesce(juros,0)-coalesce(discount,0)) end),0) into old_balance
 from public.entries e where bank_id=target_bank and status='realizado' and coalesce(paid_date,date)<=effective_date
 and not exists(select 1 from public.credit_cards c where c.id=e.credit_card_id and not c.include_in_balance);
 select old_balance+coalesce(sum(amount),0) into old_balance from public.bank_balance_adjustments where bank_id=target_bank and date<=effective_date;
 select old_balance-coalesce(sum(amount),0) into old_balance from public.card_invoice_payments p where bank_id=target_bank and paid_date<=effective_date
 and not exists(select 1 from public.credit_cards c where c.id=p.card_id and not c.include_in_balance);
 select old_balance+coalesce(sum(amount),0) into old_balance from public.card_invoice_payments p where settled_bank=target_bank and settled_date<=effective_date
 and not exists(select 1 from public.credit_cards c where c.id=p.card_id and not c.include_in_balance);
 if round(desired_balance-old_balance,2)<>0 then
 insert into public.bank_balance_adjustments(bank_id,amount,date,notes) values(target_bank,round(desired_balance-old_balance,2),effective_date,'Saldo informado pelo Master');
 end if;
end $$;

revoke all on function public.add_personal_card_partial_payment(uuid,text,uuid,numeric,date) from public,anon;
revoke all on function public.pay_personal_card_invoice(uuid,text,uuid,date) from public,anon;
grant execute on function public.add_personal_card_partial_payment(uuid,text,uuid,numeric,date) to authenticated;
grant execute on function public.pay_personal_card_invoice(uuid,text,uuid,date) to authenticated;
commit;
