import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import CommercialLanding from "./CommercialLanding";
import "./styles.css";

// Separate entry: no App, Firebase SDK, configuration, auth or private data.
ReactDOM.createRoot(document.getElementById("root")!).render(<BrowserRouter>
  <aside role="status" style={{ padding: "12px 20px", background: "#fff3c4", color: "#322500", textAlign: "center" }}>Prévia comercial. O painel e as operações de viagens ainda não estão disponíveis neste endereço.</aside>
  <Routes><Route path="/" element={<CommercialLanding />} /><Route path="/saas" element={<CommercialLanding />} />
    <Route path="*" element={<main className="center-page"><section className="empty-box"><h1>Prévia comercial</h1><p>Este endereço apresenta a Caravana 77. Acesso ao painel, criação de contas, reservas e pagamentos não estão disponíveis nesta prévia.</p><Link to="/saas">Voltar à apresentação</Link></section></main>} />
  </Routes>
</BrowserRouter>);
