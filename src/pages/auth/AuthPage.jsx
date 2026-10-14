import React from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, User, X } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AuthPage() {
  const { mode } = useParams();
  const registerMode = mode === "register";
  const { login, register, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = React.useState({ name: "", email: "", password: "" });
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetStage, setResetStage] = React.useState("request");
  const [resetToken, setResetToken] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [resetError, setResetError] = React.useState("");
  const [resetBusy, setResetBusy] = React.useState(false);

  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      await (registerMode ? register(form) : login({ email: form.email, password: form.password }));
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (caught) { setError(caught.message); } finally { setBusy(false); }
  };
  const openReset = () => { setResetEmail(form.email); setResetStage("request"); setResetToken(""); setNewPassword(""); setResetError(""); setForgotOpen(true); };
  const requestReset = async (event) => {
    event.preventDefault(); setResetError(""); setResetBusy(true);
    try {
      const result = await forgotPassword(resetEmail);
      if (result.resetToken) { setResetToken(result.resetToken); setResetStage("password"); }
      else setResetStage("email");
    } catch (caught) { setResetError(caught.message); } finally { setResetBusy(false); }
  };
  const completeReset = async (event) => {
    event.preventDefault(); setResetError(""); setResetBusy(true);
    try { await resetPassword({ token: resetToken, password: newPassword }); setResetStage("complete"); }
    catch (caught) { setResetError(caught.message); } finally { setResetBusy(false); }
  };

  return <main className={`auth-page ${registerMode ? "auth-register" : "auth-login"}`}>
    <Link to="/" className="auth-back"><ArrowLeft/> Back to home</Link>
    <section className="auth-shell">
      <aside className="auth-visual">
        <Link to="/" className="auth-logo"><span>✦</span><div><b>Eventoria</b><small>Events Beyond Ordinary</small></div></Link>
        <div className="auth-visual-copy"><p>{registerMode ? "JOIN EVENTORIA" : "WELCOME BACK"}</p><h2>{registerMode ? <>Create Moments.<br/><em>Make Memories.</em></> : <>Your Next Great<br/><em>Experience Awaits.</em></>}</h2><span>{registerMode ? "Discover remarkable events, book beautiful venues and bring your own ideas to life." : "Sign in to manage your bookings, saved events and unforgettable experiences."}</span><div className="auth-perks"><span><Check/> Secure bookings</span><span><Check/> Curated experiences</span><span><Check/> Dedicated support</span></div></div>
        <div className="auth-visual-badge"><Sparkles/><span><b>Thousands of experiences</b><small>All in one beautiful place</small></span></div>
      </aside>
      <section className="auth-card">
        <div className="auth-card-mark"><ShieldCheck/></div><p className="eyebrow">{registerMode ? "START YOUR JOURNEY" : "WELCOME TO EVENTORIA"}</p><h1>{registerMode ? "Create your account" : "Welcome back"}</h1><p>{registerMode ? "Join Eventoria and start creating unforgettable moments." : "Enter your details to continue to your account."}</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          {registerMode && <label>Full name<div className="auth-field"><User/><input required minLength="2" autoComplete="name" placeholder="Enter your full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></div></label>}
          <label>Email address<div className="auth-field"><Mail/><input required type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></div></label>
          <label>Password<div className="auth-field"><LockKeyhole/><input required type={showPassword ? "text" : "password"} minLength="10" autoComplete={registerMode ? "new-password" : "current-password"} placeholder="Minimum 10 characters" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })}/><button type="button" className={showPassword ? "visible" : ""} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff/> : <Eye/>}</button></div></label>
          {!registerMode && <div className="auth-options"><label><input type="checkbox"/> Remember me</label><button type="button" onClick={openReset}>Forgot password?</button></div>}
          {registerMode && <label className="auth-consent"><input type="checkbox" required/><span>I agree to the <a href="#terms">Terms & Conditions</a> and <a href="#privacy">Privacy Policy</a>.</span></label>}
          <button className="auth-submit" disabled={busy}>{busy ? "Please wait…" : registerMode ? "Create Account" : "Login"} <ArrowRight/></button>
        </form>
        <div className="auth-divider"><span>or</span></div><small>{registerMode ? "Already have an account?" : "New to Eventoria?"} <Link to={`/auth/${registerMode ? "login" : "register"}`}>{registerMode ? "Login" : "Create an account"}</Link></small>
      </section>
    </section>
    {forgotOpen && <div className="reset-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-title" onClick={(event) => event.target === event.currentTarget && setForgotOpen(false)}><section className="reset-card"><button className="reset-close" type="button" onClick={() => setForgotOpen(false)} aria-label="Close password reset"><X/></button>
      {resetStage === "complete" ? <div className="reset-success"><i><Check/></i><h2>Password updated</h2><p>Your password was reset successfully. Sign in using your new password.</p><button type="button" onClick={() => { setForm((current) => ({ ...current, email: resetEmail, password: "" })); setForgotOpen(false); }}>Back to Login</button></div>
      : resetStage === "email" ? <div className="reset-success"><i><Check/></i><h2>Check your email</h2><p>If an Eventoria account exists for <b>{resetEmail}</b>, password-reset instructions have been sent.</p><button type="button" onClick={() => setForgotOpen(false)}>Back to Login</button></div>
      : resetStage === "password" ? <><i><LockKeyhole/></i><p className="eyebrow">CREATE NEW PASSWORD</p><h2 id="reset-title">Set a new password</h2><p>Choose a secure password containing at least 10 characters.</p>{resetError && <div className="form-error">{resetError}</div>}<form onSubmit={completeReset}><label>New password<div className="auth-field"><LockKeyhole/><input type={showPassword ? "text" : "password"} required minLength="10" autoFocus value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Minimum 10 characters"/><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff/> : <Eye/>}</button></div></label><button className="auth-submit" disabled={resetBusy}>{resetBusy ? "Updating…" : "Reset Password"}<ArrowRight/></button></form></>
      : <><i><LockKeyhole/></i><p className="eyebrow">ACCOUNT RECOVERY</p><h2 id="reset-title">Forgot your password?</h2><p>Enter your email address to securely reset your password.</p>{resetError && <div className="form-error">{resetError}</div>}<form onSubmit={requestReset}><label>Email address<div className="auth-field"><Mail/><input type="email" required autoFocus value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="you@example.com"/></div></label><button className="auth-submit" disabled={resetBusy}>{resetBusy ? "Please wait…" : "Continue"}<ArrowRight/></button></form></>}
    </section></div>}
  </main>;
}
