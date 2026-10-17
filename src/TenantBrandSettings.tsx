import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTenantBrand } from "./lib/tenant-brand-context";
import { BRAND_COLORS, tenantHomePath, type TenantBranding } from "./lib/tenant-branding";
import { brandingOperationId, saveTenantBranding } from "./lib/tenant-branding-data";
export default function TenantBrandSettings({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const { branding } = useTenantBrand();
  const [form, setForm] = useState<TenantBranding>(() => branding || { organizationId, slug: "", publicName: "", description: "", primaryColor: BRAND_COLORS[0], logo: "", website: "", contactEmail: "", whatsapp: "", operationalMessage: "" });
  const [operationId, setOperationId] = useState(brandingOperationId); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  function change(field: keyof TenantBranding, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await saveTenantBranding(form, operationId); setOperationId(brandingOperationId()); setNotice("Identidade pública salva. Os links e a marca são atualizados sem nova publicação do site."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a identidade."); } finally { setBusy(false); }
  }
  async function image(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 60000) { setError("Escolha uma imagem PNG ou JPG de até60KB."); return; }
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file); const valid = bitmap.width > 0 && bitmap.height > 0 && bitmap.width <= 2048 && bitmap.height <= 2048; bitmap.close();
      if (!valid) throw new Error("dimensions");
      const bytes = new Uint8Array(await file.arrayBuffer()); change("logo", `data:${file.type};base64,${btoa(String.fromCharCode(...bytes))}`);
    } catch { setError("A imagem não é válida ou ultrapassa2048×2048. Escolha outro PNG/JPG."); } finally { setBusy(false); }
  }
  return <><h1>Identidade da organização</h1><p>Nome, imagem, contatos e mensagens públicos. Não inclua dados de passageiros. As permissões do painel são independentes da marca.</p>
    {error && <p role="alert" className="error-message">{error}</p>}{notice && <p role="status" className="success-message">{notice}</p>}
    <section className="admin-panel platform-section"><form className="field-grid" onSubmit={(event) => void save(event)}>
      <label className="field"><span>Nome público</span><input required minLength={2} maxLength={80} disabled={!canManage || busy} value={form.publicName} onChange={(event) => change("publicName", event.target.value)} /></label>
      <label className="field"><span>Endereço público da organização</span><input required minLength={3} maxLength={60} pattern="[a-z0-9][a-z0-9-]{2,59}" disabled={!canManage || busy || Boolean(branding)} value={form.slug} onChange={(event) => change("slug", event.target.value)} /><small>Após a primeira configuração, o endereço é preservado para manter os links.</small></label>
      <label className="field"><span>Cor principal</span><select disabled={!canManage || busy} value={form.primaryColor} onChange={(event) => change("primaryColor", event.target.value)}>{BRAND_COLORS.map((color, index) => <option key={color} value={color}>{["Violeta", "Azul", "Turquesa", "Verde", "Rosa", "Roxo", "Âmbar", "Cinza"][index]}</option>)}</select></label>
      <label className="field"><span>Site oficial (HTTPS)</span><input type="url" maxLength={500} disabled={!canManage || busy} value={form.website} onChange={(event) => change("website", event.target.value)} /></label>
      <label className="field"><span>E-mail público de contato</span><input type="email" maxLength={120} disabled={!canManage || busy} value={form.contactEmail} onChange={(event) => change("contactEmail", event.target.value)} /></label>
      <label className="field"><span>WhatsApp público (somente números)</span><input inputMode="numeric" maxLength={15} disabled={!canManage || busy} value={form.whatsapp} onChange={(event) => change("whatsapp", event.target.value)} /></label>
      <label className="field field-full"><span>Descrição pública</span><textarea maxLength={240} disabled={!canManage || busy} value={form.description} onChange={(event) => change("description", event.target.value)} /></label>
      <label className="field field-full"><span>Mensagem operacional pública</span><textarea maxLength={800} disabled={!canManage || busy} value={form.operationalMessage} onChange={(event) => change("operationalMessage", event.target.value)} /></label>
      <label className="field field-full"><span>URL da imagem da marca (PNG/JPG/WebP, HTTPS)</span><input maxLength={1000} disabled={!canManage || busy} value={form.logo.startsWith("data:") ? "" : form.logo} onChange={(event) => change("logo", event.target.value)} /></label>
      {canManage && <label className="field"><span>Enviar imagem da marca (PNG/JPG, até60KB)</span><input type="file" accept="image/png,image/jpeg" disabled={busy} onChange={(event) => { void image(event.target.files?.[0]); event.target.value = ""; }} /></label>}
      {form.logo && <div className="field"><img src={form.logo} alt="Prévia da marca" style={{ maxWidth: 120, maxHeight: 90, objectFit: "contain" }} referrerPolicy="no-referrer" />{canManage && <button className="button button-outline" type="button" disabled={busy} onClick={() => change("logo", "")}>Remover imagem</button>}</div>}
      {canManage && <button className="button button-primary" disabled={busy}>{busy ? "Salvando…" : "Salvar identidade pública"}</button>}
    </form>{branding && <p><Link to={tenantHomePath(branding.slug)}>Abrir página pública da organização</Link></p>}</section>
  </>;
}
