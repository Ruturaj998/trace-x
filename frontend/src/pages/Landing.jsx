import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, ChevronDown, CirclePlay, History, Laptop, Menu, Radio,
  Radar, Satellite, ShieldCheck, UserRound, X,
} from "lucide-react";
import PageMeta from "../components/PageMeta";
import "./stitch-public.css";

const steps = [
  { title: "Register a device", icon: Laptop, description: "Add the hardware you want to monitor and give it a unique device identifier.", note: "Device-specific credentials" },
  { title: "Receive GPS reports", icon: Satellite, description: "Connect a compatible GPS source or a telemetry agent to submit location fixes.", note: "Offline reports can be queued" },
  { title: "Review latest location & history", icon: History, description: "See the latest reported position, the available accuracy radius, and the route of previous fixes.", note: "Timestamped location history" },
];

const questions = [
  ["How frequently do devices transmit location updates?", "The cadence depends on the connected telemetry source and its configuration. TRACE-X displays the latest fix it has received."],
  ["What appears when a device has yet to report a location?", "The device appears in your inventory with no location history. When it reports a valid fix, the dashboard shows that position."],
  ["Is live continuous GPS tracking guaranteed?", "GPS reception, power and network access affect how often a device can report. A compatible agent can queue fixes offline and send them after reconnecting."],
  ["Can I test TRACE-X without hardware trackers?", "You can create an account and explore device management. The map on this page is an example, and real tracking requires a source that provides GPS fixes."],
];

const waypoints = [
  { x: 160, y: 380, label: "08:30 FIX", dx: -24, dy: 23 },
  { x: 245, y: 295, label: "09:45 FIX", dx: 12, dy: -5 },
  { x: 310, y: 320, label: "10:15 FIX", dx: -22, dy: 24 },
];

function TelemetryMap() {
  return (
    <figure className="stitch-map" aria-label="Example location history for Field Laptop">
      <figcaption className="stitch-map-bar">
        <span><i /> Live recon matrix</span>
        <span>Example data</span>
      </figcaption>
      <div className="stitch-map-scene">
        <svg viewBox="0 0 700 500" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
          <defs>
            <pattern id="stitch-map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" stroke="#202b3c" strokeWidth=".8" />
              <circle r="1" fill="#35415a" />
            </pattern>
            <linearGradient id="stitch-trail" x2="1" y2="0">
              <stop stopColor="#526b9f" />
              <stop offset=".65" stopColor="#5d8bff" />
              <stop offset="1" stopColor="#b2c5ff" />
            </linearGradient>
            <radialGradient id="stitch-pin-glow">
              <stop stopColor="#5d8bff" stopOpacity=".53" />
              <stop offset="1" stopColor="#5d8bff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="700" height="500" fill="url(#stitch-map-grid)" />
          <path d="M500 0C470 90 520 180 560 260C590 320 620 380 700 420V0Z" fill="#0f1928" stroke="#202c3e" />
          <path d="M0 360L650 40M0 410L620 100M0 460L600 160M120 0L280 500M220 0L380 500M320 0L480 500M420 0L580 500" stroke="#223045" strokeWidth="2" />
          <path d="M150 240h45v60h-45zM210 210h55v55h-55zM280 170h70v50h-70zM220 280h60v65h-60zM295 235h55v75h-55zM365 200h60v60h-60z" fill="#141f30" />
          <path className="stitch-map-trail" d="M160 380L245 295L310 320L415 195" pathLength="1" stroke="url(#stitch-trail)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {waypoints.map(({ x, y, label, dx, dy }) => (
            <g className="stitch-waypoint" key={label} transform={`translate(${x} ${y})`}>
              <circle r="8" stroke="#5a709c" />
              <circle r="4" fill="#88aaff" />
              <text x={dx} y={dy} fill="#a3aec2" fontSize="11">{label}</text>
            </g>
          ))}
          <g className="stitch-map-pin" transform="translate(415 195)">
            <circle r="49" fill="url(#stitch-pin-glow)" />
            <circle r="47" stroke="#5d8bff" strokeOpacity=".6" strokeDasharray="3 3" />
            <circle r="26" stroke="#b2c5ff" strokeWidth="1.4" />
            <circle r="7" fill="#b2c5ff" />
            <circle r="3" fill="#002b74" />
          </g>
        </svg>
        <div className="stitch-map-device">
          <div className="stitch-map-device-top"><span>Example data</span><span><i /> Latest fix</span></div>
          <strong><Laptop size={16} aria-hidden="true" /> Field Laptop</strong>
          <div className="stitch-map-readout"><span>Last reported 12 min ago</span><span>±18 m</span></div>
          <div className="stitch-map-coordinates">37.7749° N <span>·</span> 122.4194° W</div>
        </div>
        <div className="stitch-map-key">○ Waypoints (3) <span>● Latest position</span></div>
      </div>
      <div className="stitch-map-bar stitch-map-caption"><span>Breadcrumbs / Sample trace</span><span>Accuracy radius ±18 m</span></div>
    </figure>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);

  return (
    <div className="stitch-page stitch-landing" id="overview">
      <PageMeta title="Device Tracking & Telemetry" description="Find the last reported location of your registered devices and review their GPS telemetry history." path="/" />
      <header className="stitch-header">
        <div className="stitch-wrap stitch-header-inner">
          <Link className="stitch-brand" to="/"><Radar size={20} aria-hidden="true" />TRACE-X</Link>
          <nav className={`stitch-header-nav${menuOpen ? " is-open" : ""}`} id="landing-nav" aria-label="Main navigation">
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
            <a href="#security" onClick={() => setMenuOpen(false)}>Security</a>
          </nav>
          <div className="stitch-header-actions">
            <Link to="/login">Sign in</Link>
            <Link className="stitch-button stitch-button-blue stitch-header-create" to="/register">Create account</Link>
            <Link className="stitch-user-link" to="/login" aria-label="Operator sign-in"><UserRound size={16} aria-hidden="true" /></Link>
            <button className="stitch-menu" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-controls="landing-nav" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>
      <div className="stitch-status"><div className="stitch-wrap"><span><i /> GPS TELEMETRY</span><span>DEVICE STATUS / LOCATION HISTORY</span></div></div>
      <main>
        <section className="stitch-hero stitch-wrap" aria-labelledby="landing-title">
          <div className="stitch-hero-copy">
            <span className="stitch-eyebrow"><i /> Precision recovery telemetry</span>
            <h1 id="landing-title">Know where your device was last seen.</h1>
            <p>Find the latest reported location of your registered devices and review their location history.</p>
            <div className="stitch-hero-actions">
              <Link className="stitch-button stitch-button-primary" to="/register">Create account <ArrowRight size={18} aria-hidden="true" /></Link>
              <a className="stitch-button stitch-button-muted" href="#how-it-works"><CirclePlay size={18} aria-hidden="true" /> See how it works</a>
            </div>
            <div className="stitch-hero-caption"><ShieldCheck size={16} aria-hidden="true" /> Account-protected device records</div>
            <dl className="stitch-hero-metrics">
              <div><dt>Position</dt><dd>Last GPS fix</dd></div>
              <div><dt>History</dt><dd>Reported fixes</dd></div>
              <div><dt>Accuracy</dt><dd>Source estimate</dd></div>
            </dl>
          </div>
          <TelemetryMap key={mapVersion} />
          <div className="stitch-map-replay">
            <span className="stitch-mono"><Radio size={16} aria-hidden="true" /> Device ping testbench</span>
            <p>Replay the example route to see how a reported location appears.</p>
            <button className="stitch-button stitch-button-muted" type="button" onClick={() => setMapVersion((version) => version + 1)}><Satellite size={16} aria-hidden="true" /> Replay example ping</button>
          </div>
        </section>

        <section className="stitch-band" id="how-it-works">
          <div className="stitch-wrap">
            <div className="stitch-section-heading">
              <div><span className="stitch-mono">System architecture & workflow</span><h2>How TRACE-X works</h2></div>
              <p>From device registration to the latest reported fix, in three steps.</p>
            </div>
            <ol className="stitch-step-grid">
              {steps.map(({ title, icon: Icon, description, note }, index) => (
                <li key={title} className="stitch-step">
                  <div className="stitch-step-top"><span className="stitch-mono">0{index + 1}</span><Icon size={21} aria-hidden="true" /></div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span className="stitch-step-note">{note}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="stitch-wrap stitch-security-wrap" id="security">
          <div className="stitch-security">
            <div>
              <span className="stitch-mono">Hardware integration</span>
              <h2>Keep the last reported fix in view.</h2>
              <p>When a device goes offline, TRACE-X keeps its last reported position with the time it was recorded. Compatible agents can replay queued fixes once connectivity returns.</p>
              <Link to="/privacy">How TRACE-X handles location data <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
            <div className="stitch-terminal">
              <strong>Example device event log</strong>
              <span>[10:14:02 UTC] GPS fix recorded</span>
              <span>[10:14:03 UTC] Location report received</span>
              <span>[10:14:05 UTC] Device history updated</span>
            </div>
          </div>
        </section>

        <section className="stitch-band stitch-faq" id="faq">
          <div className="stitch-wrap">
            <span className="stitch-mono">Knowledge base</span>
            <h2>Frequently asked questions</h2>
            <p>Learn about telemetry, offline reporting, and location history.</p>
            <div className="stitch-faq-list">
              {questions.map(([question, answer]) => (
                <details key={question}><summary>{question}<ChevronDown size={17} aria-hidden="true" /></summary><p>{answer}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="stitch-wrap stitch-cta-wrap">
          <div className="stitch-cta">
            <div><h2>Ready to secure your devices?</h2><p>Create an account to register your first device and connect a GPS source.</p></div>
            <div className="stitch-hero-actions">
              <Link className="stitch-button stitch-button-primary" to="/register">Create account <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link className="stitch-button stitch-button-muted" to="/login">Sign in</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="stitch-footer">
        <div className="stitch-wrap"><Link className="stitch-brand" to="/">TRACE-X</Link><nav aria-label="Footer"><a href="#security">Security</a><Link to="/privacy">Privacy</Link><Link to="/contact">Contact</Link></nav></div>
      </footer>
    </div>
  );
}
