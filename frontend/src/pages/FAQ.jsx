import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import PageMeta from "../components/PageMeta";
import {
  ChevronDown,
  Search,
  HelpCircle,
  ShieldCheck,
  Smartphone,
  Navigation,
  AlertTriangle,
  Lock,
  ArrowRight,
} from "lucide-react";

const faqData = [
  {
    id: "reg-1",
    category: "registration",
    question: "How do I register a new device in TRACE-X?",
    answer:
      "To register a device, sign in to your TRACE-X Command Center, navigate to the Devices tab or click 'Register Device' on the dashboard. You will need to provide a recognizable Device Name (e.g., 'Work MacBook Pro') and a unique Device Identifier (such as the device hardware UUID, serial number, or telemetry agent token). Once registered, the device is tied to your account tenant.",
  },
  {
    id: "loc-1",
    category: "tracking",
    question: "Does registering a device alone automatically enable GPS tracking?",
    answer:
      "No. Registering hardware in TRACE-X assigns an identity record in the system, but does NOT passively track coordinates on its own. Active tracking requires a functioning telemetry source — such as the TRACE-X background telemetry agent or an authorized client application — along with active network connectivity and granted operating system location permissions. Without an active telemetry stream, no live GPS pings will be recorded.",
    isImportant: true,
  },
  {
    id: "loc-2",
    category: "tracking",
    question: "How are location coordinates captured and updated?",
    answer:
      "When the TRACE-X telemetry agent or authorized device agent executes, it samples the device's current geographic coordinates (latitude, longitude, and accuracy radius in meters) and transmits a secure JSON payload to the backend API over HTTPS. Coordinates are verified and stored with UTC timestamps.",
  },
  {
    id: "loc-3",
    category: "tracking",
    question: "What does 'Last-Known Location' mean?",
    answer:
      "If a device loses cellular/Wi-Fi connection or is powered off, TRACE-X displays its Last-Known Location. This represents the most recent verified geographic coordinate received by the server before signal loss, complete with the exact timestamp of transmission and estimated horizontal accuracy.",
  },
  {
    id: "stat-1",
    category: "security",
    question: "What happens when I mark a device as 'Lost'?",
    answer:
      "Changing a device's status to 'Lost' flags the hardware immediately across your TRACE-X Command Center. It triggers visual alerts on your dashboard, creates a high-priority entry in your Security Audit Log, and changes the telemetry tracking profile to high-attention monitoring.",
  },
  {
    id: "stat-2",
    category: "security",
    question: "Can other TRACE-X users or unauthorized third parties see my devices?",
    answer:
      "No. TRACE-X enforces strict tenant isolation at the database query level. Every API route for devices, status history, and location points filters strictly by the authenticated user's ID (`user_id = current_user.id`). Other users cannot view, query, or modify your hardware records.",
  },
  {
    id: "perm-1",
    category: "privacy",
    question: "What system permissions does TRACE-X require?",
    answer:
      "To provide tracking telemetry, the client device agent requires permission to access the operating system's location service (GPS/Wi-Fi positioning) and outbound internet connectivity to communicate with the TRACE-X API. TRACE-X does not access your personal files, camera, microphone, or browsing history.",
  },
  {
    id: "trouble-1",
    category: "troubleshooting",
    question: "Why does my device show 'No location data found'?",
    answer:
      "This indicates the device has been registered in the database, but the telemetry agent has not yet transmitted an initial valid GPS coordinate fix. Ensure the telemetry agent is running, has network access, and that OS location services are enabled.",
  },
  {
    id: "trouble-2",
    category: "troubleshooting",
    question: "What should I do if the dashboard shows 'Backend Telemetry Offline'?",
    answer:
      "This error banner appears if the frontend web console is temporarily unable to reach the API server. Check your local network connection, verify that the backend service is running, and click the 'Retry' button in the error banner.",
  },
  {
    id: "acc-1",
    category: "privacy",
    question: "How are my account credentials protected?",
    answer:
      "TRACE-X stores user passwords using cryptographic password hashing (bcrypt/argon2). Passwords are never stored in plaintext. Session authentication uses cryptographically signed JWT tokens with 60-minute expiration. Password reset tokens are single-use, hashed with SHA-256 in the database, and expire after 1 hour.",
  },
];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openItems, setOpenItems] = useState({ "loc-1": true, "reg-1": true });

  const toggleItem = (id) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const categories = [
    { id: "all", label: "All Questions", icon: HelpCircle },
    { id: "registration", label: "Registration", icon: Smartphone },
    { id: "tracking", label: "Tracking & GPS", icon: Navigation },
    { id: "security", label: "Lost Mode & Alerts", icon: AlertTriangle },
    { id: "privacy", label: "Security & Privacy", icon: Lock },
    { id: "troubleshooting", label: "Troubleshooting", icon: ShieldCheck },
  ];

  const filteredFaqs = useMemo(() => {
    return faqData.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch =
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Schema.org FAQPage structured data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="public-layout">
      <PageMeta
        title="FAQ & Tracking Guide"
        description="Frequently asked questions about TRACE-X stolen-device tracking, device registration, GPS location accuracy, lost-device mode, and security."
        path="/faq"
        schema={faqSchema}
      />

      <PublicNav />

      <main className="public-main" id="main-content">
        <div className="public-hero">
          <div className="public-badge">
            <span className="public-badge-dot" />
            <span>KNOWLEDGE BASE & GUIDELINES</span>
          </div>

          <h1>Frequently Asked Questions</h1>
          <p>
            Learn how TRACE-X stolen-device tracking, hardware telemetry, location updates,
            and security protocols operate. All guidelines reflect currently implemented functionality.
          </p>
        </div>

        {/* Search */}
        <div className="faq-search-box">
          <Search className="faq-search-icon" size={18} />
          <input
            type="search"
            className="faq-search-input"
            placeholder="Search questions or keywords (e.g. GPS, lost mode, permissions)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search FAQ questions"
          />
        </div>

        {/* Categories */}
        <div className="faq-categories" role="tablist" aria-label="FAQ Categories">
          {categories.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={selectedCategory === id}
              className={`faq-cat-btn ${selectedCategory === id ? "active" : ""}`}
              onClick={() => setSelectedCategory(id)}
            >
              <Icon size={12} style={{ marginRight: "6px", verticalAlign: "middle" }} />
              {label}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="faq-list">
          {filteredFaqs.length === 0 ? (
            <div className="empty-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
              <HelpCircle size={32} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
              <h3>No matching questions found</h3>
              <p style={{ color: "var(--text-soft)", fontSize: "13px" }}>
                Try adjusting your search terms or view all categories.
              </p>
              <button
                type="button"
                className="faq-cat-btn active"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                style={{ marginTop: "12px" }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = Boolean(openItems[faq.id]);
              return (
                <div
                  key={faq.id}
                  className={`faq-item ${isOpen ? "open" : ""}`}
                >
                  <button
                    type="button"
                    className="faq-trigger"
                    onClick={() => toggleItem(faq.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${faq.id}`}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className="faq-icon" size={18} />
                  </button>

                  {isOpen && (
                    <div
                      id={`faq-answer-${faq.id}`}
                      className="faq-answer"
                      role="region"
                      aria-labelledby={`faq-trigger-${faq.id}`}
                    >
                      {faq.isImportant && (
                        <div className="faq-callout">
                          <strong>Essential Note on Device Tracking:</strong> Registering your device
                          assigns database ownership, but does not autonomously track coordinates
                          without an active location source and telemetry permissions.
                        </div>
                      )}
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Contact CTA */}
        <div
          className="contact-card"
          style={{
            marginTop: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>Have a technical or security inquiry?</h3>
            <p style={{ margin: 0, color: "var(--text-soft)", fontSize: "12px" }}>
              Our engineering team is available to assist with telemetry integration and device recovery questions.
            </p>
          </div>

          <Link to="/contact" className="public-btn-primary">
            <span>Contact Support</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
