
import { useState } from "react";
import Documents from "./Documents";
import ReviewCenter from "./ReviewCenter";

export default function App() {
  const [page, setPage] = useState<"documents" | "review">("review");

  return (
    <div>
      <nav style={{ display: "flex", gap: 12, padding: 16, background: "#f1f5f9" }}>
        <button onClick={() => setPage("review")}>Review Center</button>
        <button onClick={() => setPage("documents")}>Documents</button>
      </nav>

      {page === "review" ? <ReviewCenter /> : <Documents />}
    </div>
  );
}
