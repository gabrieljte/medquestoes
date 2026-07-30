import { useState } from "react";
import { cloudConfigured, supabase } from "./supabase.js";

const REMEMBERED_EMAIL_KEY = "medquestoes-remembered-email";

function getRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export default function AuthScreen({ onOffline }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(getRememberedEmail);
  const [password, setPassword] = useState("");
  const [rememberAccess, setRememberAccess] = useState(() => Boolean(getRememberedEmail()));
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!cloudConfigured) return;
    setLoading(true);
    setMessage("");
    const action = mode === "login"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error } = await action;
    setLoading(false);
    if (error) setMessage(error.message);
    else if (mode === "register") setMessage("Conta criada. Verifique seu e-mail para confirmar o cadastro.");
    else {
      try {
        if (rememberAccess) localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
        else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch {
        // O acesso continua funcionando mesmo se o navegador bloquear o armazenamento local.
      }
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand"><span className="logo">✚</span><div><b>MedQuestões</b><small>Seus estudos sincronizados</small></div></div>
        <h1>{mode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h1>
        <p>Use a mesma conta no celular e no computador para manter questões e desempenho sincronizados.</p>
        {!cloudConfigured && <div className="auth-warning">A sincronização ainda precisa das variáveis do Supabase. Você pode continuar no modo offline.</div>}
        <form onSubmit={submit} autoComplete="on">
          <label>E-mail<input type="email" name="username" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" /></label>
          <label>
            Senha
            <span className="auth-password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength="6"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(current => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </span>
          </label>
          {mode === "login" && (
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={rememberAccess}
                onChange={event => {
                  const checked = event.target.checked;
                  setRememberAccess(checked);
                  if (!checked) {
                    try {
                      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
                    } catch {
                      // Sem ação necessária.
                    }
                  }
                }}
              />
              <span>
                <strong>Lembrar meu acesso</strong>
                <small>Seu navegador poderá salvar a senha com segurança.</small>
              </span>
            </label>
          )}
          {message && <div className="auth-message">{message}</div>}
          <button className="primary auth-submit" disabled={loading || !cloudConfigured}>{loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>
          {mode === "login" ? "Não tenho conta — cadastrar" : "Já tenho conta — entrar"}
        </button>
        <button className="offline-link" onClick={onOffline}>Continuar sem sincronização</button>
      </section>
    </main>
  );
}
