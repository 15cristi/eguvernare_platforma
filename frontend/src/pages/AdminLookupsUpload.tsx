import { useState } from "react";

const AdminLookupsUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");

  const upload = async () => {
    if (!file) {
      setStatus("Selectează un fișier CSV.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("http://localhost:8080/api/lookups/import/csv", {
  method: "POST",
  body: form,
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`
  }
});

const text = await res.text().catch(() => "");
console.log("CSV upload status:", res.status, res.statusText);
console.log("CSV upload body:", text);

if (!res.ok) {
  throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
}


      setStatus("CSV importat cu succes.");
      setFile(null);
    } catch (err: any) {
      setStatus(`Eroare: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#021c15",
        color: "white",
        padding: 40,
        fontFamily: "Inter, sans-serif"
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
        Import Lookups (CSV)
      </h1>

      <p style={{ opacity: 0.7, maxWidth: 600, marginBottom: 32 }}>
        Încarcă un fișier CSV cu header <code>category,value</code>.
        Valorile vor fi adăugate automat în lookup-uri (Cities, Expert Areas,
        Company Domains etc.).
      </p>

      <div
        style={{
          background: "#062e25",
          border: "1px solid #164e41",
          borderRadius: 16,
          padding: 24,
          maxWidth: 480
        }}
      >
        <input
          type="file"
          accept=".csv"
          onChange={e => setFile(e.target.files?.[0] || null)}
          style={{ marginBottom: 16 }}
        />

        <br />

        <button
          onClick={upload}
          style={{
            background: "#10b981",
            border: "none",
            borderRadius: 12,
            padding: "12px 20px",
            color: "white",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Upload CSV
        </button>

        {status && (
          <div style={{ marginTop: 16, opacity: 0.85 }}>{status}</div>
        )}
      </div>
    </div>
  );
};

export default AdminLookupsUpload;
