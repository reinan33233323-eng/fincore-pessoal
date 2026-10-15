import { FormEvent, useState } from "react";
import { Landmark, Plus } from "lucide-react";
import { Bank, deleteBank, saveBank } from "../lib/bridge";
import { summarizeBank, type FinancialEntry } from "../lib/finance";
import { fmt } from "./shared";

const normalize = (name: string) => name.trim().replace(/\s+/g, " ");
const sameName = (a: string, b: string) =>
  normalize(a).toLocaleLowerCase("pt-BR") === normalize(b).toLocaleLowerCase("pt-BR");
const sortBanks = (list: Bank[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

/** Cadastro de bancos (aba Contas). Todos veem; só o Master cadastra/edita. */
export default function BanksSection({
  banks,
  ready,
  canManage,
  entries,
  setBanks,
}: {
  banks: Bank[];
  ready: boolean;
  canManage: boolean;
  entries: FinancialEntry[];
  setBanks: (update: (old: Bank[]) => Bank[]) => void;
}) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const validate = (value: string, ignoreId?: string) => {
    const clean = normalize(value);
    if (clean.length < 2 || clean.length > 80) return "Informe um nome entre 2 e 80 caracteres.";
    if (banks.some((bank) => bank.id !== ignoreId && sameName(bank.name, clean)))
      return "Já existe uma conta bancária com esse nome.";
    return "";
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validate(name);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveBank({ id: crypto.randomUUID(), name: normalize(name) });
      setBanks((old) => sortBanks([...old, saved]));
      setName("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível cadastrar a conta bancária.");
    } finally {
      setBusy(false);
    }
  };

  const rename = async (bank: Bank) => {
    const problem = validate(editName, bank.id);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveBank({ id: bank.id, name: normalize(editName) });
      setBanks((old) => sortBanks(old.map((item) => (item.id === bank.id ? saved : item))));
      setEditingId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível renomear a conta bancária.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (bank: Bank) => {
    const count = entries.filter(entry => entry.bankId === bank.id).length;
    const warning = count
      ? `\n\n${count} lançamento(s) estão vinculados a esta conta e ficarão sem conta bancária (nada é apagado).`
      : "";
    if (!window.confirm(`Excluir a conta bancária "${bank.name}"?${warning}`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteBank(bank.id);
      setBanks((old) => old.filter((item) => item.id !== bank.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir a conta bancária.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-slate-900">Contas bancárias</h2>
          <p className="text-xs text-gray-400">
            Cadastre as contas usadas para pagar e receber. Centros de custo e planos de contas ficam separados.
          </p>
        </div>
        {canManage && ready && (
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <input
              aria-label="Nome da conta bancária"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Itaú PJ • conta 12345-6"
              maxLength={80}
              className="w-56 rounded-xl border bg-gray-50 px-3 py-2 text-sm"
            />
            <button
              disabled={busy}
              className="flex items-center gap-1 rounded-xl bg-brand-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Cadastrar conta bancária
            </button>
          </form>
        )}
      </div>
      {!ready && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
          O cadastro de contas bancárias está temporariamente indisponível. Atualize a página ou contate o responsável.
        </p>
      )}
      {canManage && <p className="mb-4 rounded-xl bg-brand-50 p-3 text-xs text-brand-800">O saldo considera apenas receitas e despesas realizadas vinculadas à conta, em todos os meses. Não inclui saldo anterior nem lançamentos sem conta informada.</p>}
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
      {ready && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {banks.map((bank) => { const summary = summarizeBank(entries, bank.id); return (
            <article key={bank.id} className="flex items-center gap-3 rounded-xl border p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Landmark className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                {editingId === bank.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void rename(bank);
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    maxLength={80}
                    className="w-full rounded-lg border bg-gray-50 px-2 py-1 text-sm"
                  />
                ) : (
                  <p className="truncate font-bold text-slate-800">{bank.name}</p>
                )}
                <p className="text-[11px] text-slate-400">{summary.count} lançamento(s) vinculado(s)</p>
                {canManage && <div className="mt-3 space-y-1 text-xs"><p className="text-slate-500">Saldo dos lançamentos realizados</p><b className={`block text-xl ${summary.balance < 0 ? "text-red-600" : "text-brand-700"}`}>{fmt(summary.balance)}</b><p>Recebido {fmt(summary.income)} · Pago {fmt(summary.expense)}</p><p className="text-slate-500">A receber {fmt(summary.receive)} · A pagar {fmt(summary.pay)}</p></div>}
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-1 text-xs font-bold">
                  {editingId === bank.id ? (
                    <>
                      <button type="button" disabled={busy} onClick={() => void rename(bank)} className="rounded px-1.5 py-1 text-brand-700 hover:bg-brand-50">Salvar</button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded px-1.5 py-1 text-slate-500 hover:bg-slate-50">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(bank.id);
                          setEditName(bank.name);
                          setError("");
                        }}
                        className="rounded px-1.5 py-1 text-brand-700 hover:bg-brand-50"
                      >
                        Editar
                      </button>
                      <button type="button" disabled={busy} onClick={() => void remove(bank)} className="rounded px-1.5 py-1 text-red-600 hover:bg-red-50">Excluir</button>
                    </>
                  )}
                </div>
              )}
            </article>
          ); })}
          {!banks.length && (
            <p className="text-sm text-slate-400">
              {canManage ? "Nenhuma conta bancária cadastrada. Use o campo acima para cadastrar." : "Nenhuma conta bancária cadastrada ainda."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
