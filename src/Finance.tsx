import FinancialHistory from "./FinancialHistory";
import { redactedFinanceCsv } from "./lib/financial-diagnostics";
import { inspectFinancialLedger } from "./lib/financial-inspection";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock3, Plus, Receipt, WalletCards } from "lucide-react";
import {
  createCaravanExpense,
  recordPassengerPayment,
  updateCaravanExpense,
  voidPassengerPayment,
  voidCaravanExpense,
  watchAdminCaravans,
  watchCaravanExpenses,
  watchOrganizationRegistrations,
  watchPassengerPayments,
  watchRegistrations,
  type CaravanExpenseInput,
  type PassengerPaymentInput,
} from "./lib/data";
import {
  calculateFinanceSummary,
  passengerFinancialStatus,
  validMoneyInput,
  moneyInputValue,
} from "./lib/finance";
import {
  money,
  type Caravan,
  type CaravanExpense,
  type ExpenseCategory,
  type PassengerPayment,
  type Registration,
} from "./lib/types";

import { adjustRegistrationFare } from "./lib/financial-operations";
import { getFinancialAttempt, completeFinancialAttempt } from "./lib/financial-attempt";
import { auth } from "./lib/firebase";
import { trackWrite } from "./lib/pending-writes";

const expenseCategories: { value: ExpenseCategory; label: string }[] = [
  { value: "transporte", label: "Transporte" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "pedagio", label: "Pedágio" },
  { value: "estacionamento", label: "Estacionamento" },
  { value: "outros", label: "Outros" },
];

const paymentMethods = [
  ["pix", "Pix"],
  ["transfer", "Transferência"],
  ["cash", "Dinheiro"],
  ["card", "Cartão"],
  ["other", "Outro"],
] as const;

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente.";

const amountText = (amount?: number) =>
  Number.isSafeInteger(amount) && (amount || 0) > 0
    ? money(amount!)
    : "Não informado";

const dateText = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !Number.isFinite(Date.parse(`${date}T12:00:00Z`))) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
};

export default function FinancePage({ organizationId, canEdit = false }: { organizationId: string; canEdit?: boolean }) {
  const { id: routeCaravanId = "" } = useParams();
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [expensesByCaravan, setExpensesByCaravan] = useState<Record<string, CaravanExpense[]>>({});
  const [caravanFilter, setCaravanFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paymentFor, setPaymentFor] = useState<Registration | null>(null);
  const [historyFor, setHistoryFor] = useState<Registration | null>(null);
  const [history, setHistory] = useState<PassengerPayment[]>([]);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PassengerPaymentInput["method"]>("pix");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [diagnostic, setDiagnostic] = useState("");
  const [diagnosticBusy, setDiagnosticBusy] = useState(false);
  const [expenseReason, setExpenseReason] = useState("");
  const [expenseBeingEdited, setExpenseBeingEdited] = useState<CaravanExpense | null>(null);
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("transporte");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setError("");
    return watchAdminCaravans(
      organizationId,
      (items) => {
        setCaravans(items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setLoading(false);
      },
      (cause) => {
        setError(errorText(cause));
        setLoading(false);
      },
    );
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    setRegistrations([]);
    const fail = (cause: Error) => setError(errorText(cause));
    return routeCaravanId
      ? watchRegistrations(organizationId, routeCaravanId, setRegistrations, fail)
      : watchOrganizationRegistrations(organizationId, setRegistrations, fail);
  }, [organizationId, routeCaravanId]);

  useEffect(() => {
    const targets = routeCaravanId
      ? caravans.filter((item) => item.id === routeCaravanId)
      : caravans;
    let active = true;
    setExpensesByCaravan({});
    const stops = targets.map((target) =>
      watchCaravanExpenses(
        target.id,
        (items) => {
          if (active) setExpensesByCaravan((current) => ({ ...current, [target.id]: items }));
        },
        (cause) => {
          if (active) setError(errorText(cause));
        },
      ),
    );
    return () => {
      active = false;
      stops.forEach((stop) => stop());
    };
  }, [caravans, routeCaravanId]);

  const isGlobalFinance = !routeCaravanId;
  const selectedCaravanId = routeCaravanId || (caravanFilter === "all" ? "" : caravanFilter);
  const isAllCaravans = !selectedCaravanId;
  const caravan = caravans.find((item) => item.id === selectedCaravanId) || null;
  const allExpenses = useMemo(() => Object.values(expensesByCaravan).flat(), [expensesByCaravan]);
  const visibleRegistrations = useMemo(
    () => isAllCaravans ? registrations : registrations.filter((item) => item.caravanId === selectedCaravanId),
    [isAllCaravans, registrations, selectedCaravanId],
  );
  const visibleExpenses = useMemo(
    () => allExpenses
      .filter((item) => isAllCaravans || item.caravanId === selectedCaravanId)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [allExpenses, isAllCaravans, selectedCaravanId],
  );

  useEffect(() => {
    if (routeCaravanId && !loading && !caravan) {
      setError("Esta caravana não está disponível para a organização atual.");
    }
  }, [caravan, loading, routeCaravanId]);

  useEffect(() => {
    if (!isGlobalFinance || caravanFilter === "all" || !caravans.length) return;
    if (!caravans.some((item) => item.id === caravanFilter)) setCaravanFilter("all");
  }, [caravanFilter, caravans, isGlobalFinance]);

  useEffect(() => {
    if (!historyFor) {
      setHistory([]);
      return;
    }
    return watchPassengerPayments(
      historyFor.id,
      setHistory,
      (cause) => setError(errorText(cause)),
    );
  }, [historyFor]);

  const summary = useMemo(
    () => calculateFinanceSummary(visibleRegistrations, visibleExpenses),
    [visibleExpenses, visibleRegistrations],
  );

  async function attemptFinancial(scope: string, operation: (id: string) => Promise<void>) {
    return trackWrite(async () => {
      const context = JSON.stringify([auth?.currentUser?.uid, organizationId, scope]);
      const id = getFinancialAttempt(context, sessionStorage);
      await operation(id); completeFinancialAttempt(context, id, sessionStorage);
    });
  }

  function openPayment(registration: Registration) {
    setPaymentFor(registration);
    setPaymentError("");
    setPaymentAmount("");
    setPaymentMethod("pix");
    setPaymentDate("");
    setPaymentNotes("");
  }

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    if (!paymentFor) return;
    const amountCents = validMoneyInput(paymentAmount);
    if (amountCents === null) {
      setPaymentError("Informe um valor maior que zero, com até duas casas decimais.");
      return;
    }
    setPaymentBusy(true);
    setPaymentError("");
    try {
      await attemptFinancial(`payment:${paymentFor.id}`, (id) => recordPassengerPayment(paymentFor, {
        amountCents,
        method: paymentMethod,
        ...(paymentDate ? { paymentDate } : {}),
        notes: paymentNotes.trim(),
      }, id));
      setPaymentFor(null);
      setNotice("Pagamento registrado no histórico financeiro.");
      window.setTimeout(() => setNotice(""), 3000);
    } catch (cause) {
      setPaymentError(errorText(cause));
    } finally {
      setPaymentBusy(false);
    }
  }

  function openExpense(expense?: CaravanExpense) {
    setExpenseError("");
    setExpenseReason("");
    setExpenseBeingEdited(expense || null);
    setExpenseDescription(expense?.description || "");
    setExpenseCategory(expense?.category || "transporte");
    setExpenseAmount(expense ? moneyInputValue(expense.amountCents) : "");
    setExpenseDate(expense?.date || "");
    setExpenseNotes(expense?.notes || "");
  }

  async function submitExpense(event: FormEvent) {
    event.preventDefault();
    const amountCents = validMoneyInput(expenseAmount);
    if (amountCents === null) {
      setExpenseError("Informe um valor maior que zero, com até duas casas decimais.");
      return;
    }
    if (!expenseDate) {
      setExpenseError("Informe a data da despesa.");
      return;
    }
    const input: CaravanExpenseInput = {
      description: expenseDescription.trim(),
      category: expenseCategory,
      amountCents,
      date: expenseDate,
      notes: expenseNotes.trim(),
    };
    setExpenseBusy(true);
    setExpenseError("");
    try {
      const targetCaravanId = expenseBeingEdited?.caravanId || selectedCaravanId;
      if (!organizationId || !targetCaravanId) {
        throw new Error("Selecione uma caravana no filtro para registrar a despesa.");
      }
      if (expenseBeingEdited) {
        await attemptFinancial(`expense-correct:${targetCaravanId}:${expenseBeingEdited.id}`, (id) => updateCaravanExpense(targetCaravanId, expenseBeingEdited.id, input, expenseReason, id));
        setNotice("Despesa corrigida; original anulado e preservado no histórico.");
      } else {
        await attemptFinancial(`expense-create:${targetCaravanId}`, (id) => createCaravanExpense(targetCaravanId, organizationId, input, id));
        setNotice("Despesa registrada.");
      }
      setExpenseBeingEdited(null);
      setExpenseDescription("");
      setExpenseAmount("");
      setExpenseDate("");
      setExpenseNotes("");
      window.setTimeout(() => setNotice(""), 3000);
    } catch (cause) {
      setExpenseError(errorText(cause));
    } finally {
      setExpenseBusy(false);
    }
  }

  async function correctPayment(payment: PassengerPayment) {
    const reason = window.prompt("Motivo da correção deste lançamento:");
    if (!reason) return;
    try {
      await attemptFinancial(`payment-void:${payment.registrationId}:${payment.id}`, (id) => voidPassengerPayment(payment.registrationId, payment.id, reason, id));
      setNotice("Lançamento marcado como corrigido; o histórico foi preservado.");
      window.setTimeout(() => setNotice(""), 3000);
    } catch (cause) {
      setError(errorText(cause));
    }
  }

  async function correctFare(registration: Registration) {
    const amount = window.prompt("Valor previsto corrigido (R$). Isso não registra recebimento:", registration.amountCents ? moneyInputValue(registration.amountCents) : "");
    if (amount === null) return;
    const cents = validMoneyInput(amount);
    if (cents === null) { setError("Informe um valor previsto positivo com até duas casas decimais."); return; }
    const reason = window.prompt("Motivo da correção do valor previsto:"); if (!reason) return;
    try { await attemptFinancial(`fare:${registration.id}`, (id) => adjustRegistrationFare(registration, cents, reason, id)); setNotice("Valor previsto corrigido com auditoria. Recebimento preservado."); }
    catch (cause) { setError(errorText(cause)); }
  }

  async function inspectLedger() {
    setDiagnosticBusy(true); setDiagnostic("");
    try {
      const findings = await inspectFinancialLedger(visibleRegistrations);
      const legacy = findings.filter((item) => item.kind === "unitemized_total").length;
      setDiagnostic(findings.length ? String(legacy) + " cadastro(s) com total sem lançamentos individuais; " + String(findings.length - legacy) + " outra(s) divergência(s). Nenhum valor foi alterado. Confira o histórico antes de corrigir." : "Totais e lançamentos individuais conferem no conjunto consultado. Nenhum valor foi alterado.");
    } catch { setDiagnostic("Não foi possível concluir a conferência autorizada. Nenhum valor foi alterado."); }
    finally { setDiagnosticBusy(false); }
  }
  function exportSummary() {
    const url = URL.createObjectURL(new Blob([redactedFinanceCsv(visibleRegistrations, visibleExpenses)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "financeiro-resumo-sem-dados-pessoais.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function cancelExpense(expense: CaravanExpense) {
    const reason = window.prompt("Motivo da anulação desta despesa:");
    if (!reason) return;
    try { await attemptFinancial(`expense-void:${expense.caravanId}:${expense.id}`, (id) => voidCaravanExpense(expense.caravanId, expense.id, reason, id)); setNotice("Despesa anulada; histórico preservado."); }
    catch (cause) { setError(errorText(cause)); }
  }

  if (loading) return <div className="empty-box admin-empty">Carregando financeiro…</div>;

  return (
    <>
      <div className="admin-title-row finance-title-row">
        <div>
          <div className="eyebrow eyebrow-dark">{isGlobalFinance ? "ESPAÇO DA ORGANIZAÇÃO" : "OPERAÇÃO DA VIAGEM"}</div>
          <h1>Financeiro</h1>
          <p>{isGlobalFinance
            ? isAllCaravans ? "Todas as caravanas · histórico completo" : caravan?.name || "Caravana selecionada"
            : caravan?.name || "Caravana"}</p>
        </div>
        {isGlobalFinance ? (
          <label className="finance-filter">
            <span>Mostrar dados de</span>
            <select value={caravanFilter} disabled={diagnosticBusy} onChange={(event) => { setDiagnostic(""); setCaravanFilter(event.target.value); }}>
              <option value="all">Tudo</option>
              {caravans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        ) : (
          <Link to={`/admin/caravanas/${routeCaravanId}/passageiros`} className="button button-outline">
            Passageiros <ArrowRight size={15} />
          </Link>
        )}
      </div>
      <p className="finance-summary-note">Valores registrados manualmente pela equipe. Comprovante aprovado e Pix informado não comprovam recebimento bancário automático.</p>
      <div className="finance-form-actions"><button className="button button-outline" type="button" onClick={exportSummary}>Exportar resumo sem dados pessoais</button><button className="button button-outline" type="button" disabled={diagnosticBusy} onClick={() => void inspectLedger()}>{diagnosticBusy ? "Conferindo…" : "Conferir lançamentos"}</button></div>
      {diagnostic && <p role="status">{diagnostic}</p>}
      {error && <div className="error-message" role="alert">{error}</div>}
      {notice && <div className="success-message">{notice}</div>}
      <div className="finance-process-note">
        <WalletCards size={19} />
        <span>Registre valores já recebidos fora do site. O sistema não cobra, não transfere e não processa pagamentos.</span>
      </div>

      <section className="finance-summary-grid" aria-label={isGlobalFinance ? "Resumo financeiro das caravanas" : "Resumo financeiro da caravana"}>
        <Summary label="Passageiros ativos" value={String(summary.passengerCount)} />
        <Summary label="Pagos" value={String(summary.paidPassengerCount)} tone="green" />
        <Summary label="Parciais" value={String(summary.partialPassengerCount)} tone="amber" />
        <Summary label="Pendentes" value={String(summary.pendingPassengerCount)} tone="blue" />
        <Summary label="Pix informado · sem conciliação" value={String(summary.reportedPassengerCount)} tone="violet" />
        <Summary label="Valor previsto conhecido" value={money(summary.expectedCents)} hint={summary.unknownFareCount ? `${summary.unknownFareCount} sem valor definido` : "Valores registrados"} />
        <Summary label="Recebido registrado" value={money(summary.receivedCents)} hint="Somente lançamentos com valor" tone="green" />
        <Summary label="A receber calculável" value={money(summary.receivableCents)} hint={summary.uncertainReceivableCount ? `${summary.uncertainReceivableCount} sem conciliação` : "Saldo conhecido"} tone="amber" />
        <Summary label="Despesas" value={money(summary.expenseCents)} tone="red" />
        <Summary label="Saldo de caixa registrado" value={money(summary.recordedBalanceCents)} hint="Recebimentos lançados menos despesas" />
        <Summary label="Resultado previsto conhecido" value={money(summary.projectedResultCents)} hint="Previsão conhecida menos despesas" />
      </section>
      {summary.unknownFareCount > 0 && (
        <p className="finance-summary-note">
          Valores previstos são parciais: {summary.unknownFareCount} passageiro(s) estão sem valor de viagem definido.
          Pagamentos informados sem valor não entram no total recebido nem no cálculo do saldo a receber.
        </p>
      )}

      <section className="admin-panel finance-panel">
        <div className="panel-heading">
          <div>
            <h2>Pagamentos por passageiro</h2>
            <p>{isAllCaravans ? "Registre e consulte pagamentos de todas as caravanas." : "Registre pagamento integral ou parcial e consulte o histórico individual."}</p>
          </div>
        </div>
        {visibleRegistrations.filter((item) => item.registrationStatus !== "cancelled").length ? (
          <div className="finance-passenger-list">
            {visibleRegistrations
              .filter((item) => item.registrationStatus !== "cancelled")
              .sort((a, b) => a.passengerName.localeCompare(b.passengerName, "pt-BR"))
              .map((registration) => {
                const status = passengerFinancialStatus(registration);
                const paid = Math.max(0, registration.paymentTotalCents || 0);
                const due = registration.amountCents;
                const balance = due && !registration.paymentReportedUnreconciled
                  ? Math.max(0, due - paid)
                  : null;
                return (
                  <article className="finance-passenger-row" key={registration.id}>
                    <div className="finance-passenger-main">
                      <strong>{registration.passengerName}</strong>
                      {isAllCaravans && <small>Caravana: {registration.caravanName}</small>}
                      <span className={`finance-status finance-status-${status}`}>
                        {status === "paid" ? "Pago" : status === "partial" ? "Parcial" : status === "reported" ? "Pix informado · valor não conciliado" : status === "unknown" ? "Valor da viagem não informado" : "Pendente"}
                      </span>
                      <small>Viagem: {amountText(due)} · Recebido com valor: {money(paid)}</small>
                      <small>Saldo: {balance === null ? "Não calculável" : money(balance)}</small>
                    </div>
                    <div className="finance-row-actions">
                      <button type="button" className="button button-outline" onClick={() => setHistoryFor(registration)}>
                        <Clock3 size={15} /> Histórico
                      </button>
                      {canEdit && <button type="button" className="button button-outline" onClick={() => void correctFare(registration)}>Corrigir valor previsto</button>}
                      {canEdit && <button type="button" className="button button-primary" onClick={() => openPayment(registration)}>
                        <Plus size={15} /> Registrar
                      </button>}
                    </div>
                  </article>
                );
              })}
          </div>
        ) : (
          <div className="table-empty">Os pagamentos aparecerão quando houver passageiros nas caravanas selecionadas.</div>
        )}
      </section>

      <section className="admin-panel finance-panel">
        <div className="panel-heading">
          <div>
            <h2>{isAllCaravans ? "Despesas das caravanas" : "Despesas da caravana"}</h2>
            <p>{isAllCaravans
              ? "Consulte despesas históricas de todas as viagens. Para lançar uma nova, selecione uma caravana no filtro."
              : "Transporte, alimentação, pedágio, estacionamento e outros custos."}</p>
          </div>
          {canEdit && <button type="button" className="button button-primary" disabled={!selectedCaravanId} onClick={() => openExpense()}>
            <Plus size={15} /> Nova despesa
          </button>}
        </div>
        {canEdit && (selectedCaravanId || expenseBeingEdited) && <form className="finance-expense-form" onSubmit={(event) => void submitExpense(event)}>
          <label className="field">
            <span>Descrição</span>
            <input required minLength={3} maxLength={120} value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} placeholder="Ex.: sinal do ônibus" />
          </label>
          <label className="field">
            <span>Categoria</span>
            <select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value as ExpenseCategory)}>
              {expenseCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Valor (R$)</span>
            <input required inputMode="decimal" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="0,00" />
          </label>
          <label className="field">
            <span>Data</span>
            <input required type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
          </label>
          <label className="field finance-expense-notes">
            <span>Observação (opcional)</span>
            <input maxLength={500} value={expenseNotes} onChange={(event) => setExpenseNotes(event.target.value)} />
          </label>
          {expenseBeingEdited && <label className="field finance-expense-notes"><span>Motivo da correção</span><input required minLength={3} maxLength={300} value={expenseReason} onChange={(event) => setExpenseReason(event.target.value)} /></label>}
          {expenseError && <div className="error-message" role="alert">{expenseError}</div>}
          <div className="finance-form-actions">
            {expenseBeingEdited && <button type="button" className="button button-outline" onClick={() => openExpense()}>Cancelar edição</button>}
            <button type="submit" className="button button-primary" disabled={expenseBusy}>
              {expenseBusy ? "Salvando…" : expenseBeingEdited ? "Salvar alteração" : "Registrar despesa"}
            </button>
          </div>
        </form>}
        {visibleExpenses.length ? (
          <div className="finance-expense-list">
            {visibleExpenses.map((expense) => (
              <article className="finance-expense-row" key={expense.id}>
                <span className="finance-expense-icon"><Receipt size={17} /></span>
                <div>
                  <strong>{expense.description}</strong>
                  {isAllCaravans && <small>Caravana: {caravans.find((item) => item.id === expense.caravanId)?.name || expense.caravanId}</small>}
                  <small>{expenseCategories.find((item) => item.value === expense.category)?.label || "Outros"} · {dateText(expense.date)}</small>
                  {expense.status === "voided" && <small>Anulada: {expense.voidReason}{expense.replacementId ? " · há um lançamento substituto" : ""}</small>}
                  {expense.replacesId && <small>Correção de lançamento anterior; vínculo preservado no histórico.</small>}
                  {expense.notes && <small>{expense.notes}</small>}
                </div>
                <strong>{money(expense.amountCents)}</strong>
                {canEdit && expense.status !== "voided" && <div className="finance-expense-actions"><button className="button button-tiny button-outline" type="button" onClick={() => openExpense(expense)}>Editar</button><button className="button button-tiny button-outline" type="button" onClick={() => void cancelExpense(expense)}>Anular</button></div>}
              </article>
            ))}
          </div>
        ) : (
          <div className="table-empty">Nenhuma despesa registrada.</div>
        )}
      </section>

      {organizationId && <FinancialHistory key={`${organizationId}:${selectedCaravanId}`} organizationId={organizationId} caravanId={selectedCaravanId} />}
      {canEdit && paymentFor && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !paymentBusy) setPaymentFor(null); }}>
          <section className="modal finance-modal">
            <button type="button" className="modal-close" aria-label="Fechar" onClick={() => setPaymentFor(null)}>×</button>
            <div className="eyebrow eyebrow-dark">LANÇAMENTO MANUAL</div>
            <h2>Registrar pagamento</h2>
            <p>{paymentFor.passengerName} · {amountText(paymentFor.amountCents)} pela viagem.</p>
            {paymentFor.paymentReportedUnreconciled && <div className="finance-summary-note">Há um Pix informado sem valor conciliado. Este lançamento registra apenas o valor que a equipe confirmar agora.</div>}
            <form className="finance-modal-form" onSubmit={(event) => void submitPayment(event)}>
              <label className="field">
                <span>Valor recebido (R$)</span>
                <input required inputMode="decimal" autoFocus value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="0,00" />
              </label>
              <label className="field">
                <span>Forma</span>
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PassengerPaymentInput["method"])}>
                  {paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Data (opcional, se conhecida)</span>
                <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
              </label>
              <label className="field">
                <span>Observação (opcional)</span>
                <textarea maxLength={500} rows={3} value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} />
              </label>
              {paymentError && <div className="error-message" role="alert">{paymentError}</div>}
              <div className="finance-form-actions">
                <button type="button" className="button button-outline" disabled={paymentBusy} onClick={() => setPaymentFor(null)}>Cancelar</button>
                <button type="submit" className="button button-primary" disabled={paymentBusy}>{paymentBusy ? "Salvando…" : "Salvar pagamento"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {historyFor && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryFor(null); }}>
          <section className="modal finance-modal">
            <button type="button" className="modal-close" aria-label="Fechar" onClick={() => setHistoryFor(null)}>×</button>
            <div className="eyebrow eyebrow-dark">HISTÓRICO FINANCEIRO</div>
            <h2>{historyFor.passengerName}</h2>
            <p>Somente lançamentos feitos pela equipe entram no total recebido.</p>
            {history.length ? (
              <div className="finance-history-list">
                {history.map((payment) => (
                  <article className="finance-history-row" key={payment.id}>
                    <div>
                      <strong>{money(payment.amountCents)} · {paymentMethods.find(([value]) => value === payment.method)?.[1] || "Outro"}</strong>
                      <small>{payment.paymentDate ? dateText(payment.paymentDate) : "Data do pagamento não informada"} · lançado {dateText(payment.createdAt.slice(0, 10))}</small>
                      {payment.notes && <small>{payment.notes}</small>}
                      {payment.status === "voided" && <small className="finance-void-note">Corrigido: {payment.voidReason}</small>}
                    </div>
                    {canEdit && payment.status === "active" && (
                      <button type="button" className="button button-tiny button-outline" onClick={() => void correctPayment(payment)}>Corrigir</button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="table-empty">Ainda não há lançamentos de pagamento.</div>
            )}
          </section>
        </div>
      )}
      <p className="finance-back-link"><Link to="/admin/caravanas"><ArrowLeft size={15} /> Voltar às caravanas</Link></p>
    </>
  );
}

function Summary({
  label,
  value,
  hint,
  tone = "purple",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <article className={`finance-summary-card finance-summary-${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {hint && <span>{hint}</span>}
    </article>
  );
}
