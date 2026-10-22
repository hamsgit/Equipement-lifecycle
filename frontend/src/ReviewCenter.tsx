
import { useEffect, useState } from "react";

const API = "http://localhost:3000";

type Review = {
  id: string;
  reviewerName: string;
  previousStatus: string;
  newStatus: string;
  comment: string | null;
  reviewedAt: string;
};

type Finding = {
  id: string;
  ruleCode: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  recommendedAction?: string | null;
  affectedRecords?: Record<string, unknown> | null;
  evidenceDetails?: Record<string, unknown> | null;
  reviews?: Review[];
};

const STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "ACCEPTED_EXCEPTION",
];

const styles = {
  page: {
    padding: "28px",
    fontFamily: "Arial, sans-serif",
    background: "#f8fafc",
    color: "#0f172a",
    minHeight: "100vh",
  },
  panel: {
    background: "#ffffff",
    padding: "22px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    minWidth: 0,
  },
  input: {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    marginTop: "6px",
    marginBottom: "16px",
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    boxSizing: "border-box" as const,
    fontSize: "14px",
  },
  primaryButton: {
    padding: "11px 18px",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: 600 as const,
  },
  secondaryButton: {
    padding: "10px 16px",
    background: "#e2e8f0",
    color: "#1e293b",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    cursor: "pointer",
  },
};

export default function ReviewCenter() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [status, setStatus] = useState("UNDER_REVIEW");
  const [reviewer, setReviewer] = useState("Demo Reviewer");
  const [comment, setComment] = useState("");
  const [rule, setRule] = useState("");
  const [severity, setSeverity] = useState("");
  const [findingStatus, setFindingStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadFindings() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/findings`);

      if (!response.ok) {
        throw new Error("Unable to load validation findings.");
      }

      const data: Finding[] = await response.json();
      setFindings(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFindings();
  }, []);

  async function selectFinding(id: string) {
    setError("");

    try {
      const response = await fetch(`${API}/findings/${id}`);

      if (!response.ok) {
        throw new Error("Unable to load finding details.");
      }

      const data: Finding = await response.json();

      setSelected(data);
      setStatus(data.status);
      setComment("");
      setMessage("");
    } catch (err) {
      setError(String(err));
    }
  }

  async function saveReview() {
    if (!selected) return;

    if (!reviewer.trim() || !comment.trim()) {
      setError("Reviewer name and explanation are required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API}/findings/${selected.id}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reviewerName: reviewer.trim(),
            status,
            comment: comment.trim(),
          }),
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Unable to save review: ${body}`);
      }

      await loadFindings();
      await selectFinding(selected.id);

      setMessage(
        "Review saved successfully. The decision and audit entry have been recorded."
      );
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  const filtered = findings.filter((finding) => {
    return (
      (!rule || finding.ruleCode === rule) &&
      (!severity || finding.severity === severity) &&
      (!findingStatus || finding.status === findingStatus)
    );
  });

  const severityColor = (value: string) => {
    if (value === "HIGH" || value === "CRITICAL") {
      return { background: "#fee2e2", color: "#991b1b" };
    }
    if (value === "MEDIUM") {
      return { background: "#fef3c7", color: "#92400e" };
    }
    return { background: "#dcfce7", color: "#166534" };
  };

  return (
    <main style={styles.page}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#0f172a", marginBottom: 8 }}>
          Review Center
        </h1>
        <p style={{ color: "#475569", margin: 0 }}>
          Review validation findings, inspect evidence and record
          reviewer decisions.
        </p>
      </header>

      <div
        style={{
          ...styles.panel,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <div>
            <label htmlFor="ruleFilter">Validation Rule</label>
            <select
              id="ruleFilter"
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              style={{ ...styles.input, marginBottom: 0 }}
            >
              <option value="">All Rules</option>
              {Array.from(
                new Set(findings.map((f) => f.ruleCode))
              )
                .sort()
                .map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="severityFilter">Severity</label>
            <select
              id="severityFilter"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={{ ...styles.input, marginBottom: 0 }}
            >
              <option value="">All Severities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label htmlFor="statusFilter">Finding Status</label>
            <select
              id="statusFilter"
              value={findingStatus}
              onChange={(e) => setFindingStatus(e.target.value)}
              style={{ ...styles.input, marginBottom: 0 }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => void loadFindings()}
            style={styles.secondaryButton}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <p style={{ color: "#475569" }}>Loading findings...</p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 8,
          }}
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 12,
            borderRadius: 8,
          }}
        >
          {message}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 390px), 1fr))",
          gap: 22,
          alignItems: "start",
        }}
      >
        <section style={styles.panel}>
          <h2 style={{ color: "#0f172a", marginTop: 0 }}>
            Validation Findings ({filtered.length})
          </h2>

          {filtered.length === 0 && (
            <p style={{ color: "#64748b" }}>
              No findings match the selected filters.
            </p>
          )}

          {filtered.map((finding) => {
            const active = selected?.id === finding.id;

            return (
              <button
                key={finding.id}
                type="button"
                onClick={() => void selectFinding(finding.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "16px 18px",
                  marginBottom: 12,
                  border: active
                    ? "2px solid #2563eb"
                    : "1px solid #cbd5e1",
                  borderRadius: 10,
                  background: active
                    ? "#dbeafe"
                    : "#f1f5f9",
                  color: "#0f172a",
                  cursor: "pointer",
                  boxShadow: active
                    ? "0 3px 10px rgba(37, 99, 235, 0.15)"
                    : "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    fontSize: 15,
                    color: "#1e3a8a",
                    marginBottom: 10,
                  }}
                >
                  {finding.ruleCode} — {finding.title}
                </strong>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      ...severityColor(finding.severity),
                      padding: "5px 9px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {finding.severity}
                  </span>

                  <span
                    style={{
                      background: "#e2e8f0",
                      color: "#334155",
                      padding: "5px 9px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {finding.status.replaceAll("_", " ")}
                  </span>
                </div>
              </button>
            );
          })}
        </section>

        <section style={styles.panel}>
          <h2 style={{ color: "#0f172a", marginTop: 0 }}>
            Finding Details
          </h2>

          {!selected ? (
            <p style={{ color: "#64748b" }}>
              Select a finding to inspect its details and
              record a reviewer decision.
            </p>
          ) : (
            <>
              <h3 style={{ color: "#1e3a8a" }}>
                {selected.ruleCode} — {selected.title}
              </h3>

              <p style={{ color: "#334155", lineHeight: 1.6 }}>
                {selected.description}
              </p>

              <div
                style={{
                  background: "#eff6ff",
                  borderLeft: "4px solid #2563eb",
                  padding: 14,
                  borderRadius: 6,
                  marginBottom: 18,
                  color: "#1e3a8a",
                }}
              >
                <strong>Recommended Action</strong>
                <p style={{ marginBottom: 0 }}>
                  {selected.recommendedAction ||
                    "Review the affected records and evidence."}
                </p>
              </div>

              <h4 style={{ color: "#0f172a" }}>
                Affected Records
              </h4>
              <pre
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                  padding: 14,
                  borderRadius: 8,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontSize: 12,
                }}
              >
                {JSON.stringify(
                  selected.affectedRecords ?? {},
                  null,
                  2
                )}
              </pre>

              <h4 style={{ color: "#0f172a" }}>
                Evidence Details
              </h4>
              <pre
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                  padding: 14,
                  borderRadius: 8,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontSize: 12,
                }}
              >
                {JSON.stringify(
                  selected.evidenceDetails ?? {},
                  null,
                  2
                )}
              </pre>

              <hr
                style={{
                  border: 0,
                  borderTop: "1px solid #e2e8f0",
                  margin: "24px 0",
                }}
              />

              <h3 style={{ color: "#0f172a" }}>
                Reviewer Decision
              </h3>

              <label htmlFor="reviewer">Reviewer Name</label>
              <input
                id="reviewer"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                style={styles.input}
              />

              <label htmlFor="reviewStatus">
                Resolution Status
              </label>
              <select
                id="reviewStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={styles.input}
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>

              <label htmlFor="reviewComment">
                Explanation / Reviewer Notes
              </label>
              <textarea
                id="reviewComment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Explain your review decision..."
                style={{
                  ...styles.input,
                  resize: "vertical",
                }}
              />

              <button
                type="button"
                disabled={saving}
                onClick={() => void saveReview()}
                style={{
                  ...styles.primaryButton,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Review"}
              </button>

              <h3
                style={{
                  color: "#0f172a",
                  marginTop: 28,
                }}
              >
                Review History
              </h3>

              {selected.reviews?.length ? (
                selected.reviews.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      borderLeft: "3px solid #2563eb",
                      background: "#f8fafc",
                      padding: 14,
                      marginBottom: 12,
                      borderRadius: 6,
                      color: "#334155",
                    }}
                  >
                    <strong style={{ color: "#1e3a8a" }}>
                      {review.newStatus.replaceAll("_", " ")}
                    </strong>
                    <span> — {review.reviewerName}</span>

                    <p style={{ margin: "8px 0" }}>
                      {review.comment}
                    </p>

                    <small style={{ color: "#64748b" }}>
                      {new Date(
                        review.reviewedAt
                      ).toLocaleString()}
                    </small>
                  </div>
                ))
              ) : (
                <p style={{ color: "#64748b" }}>
                  No reviewer decisions recorded yet.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
