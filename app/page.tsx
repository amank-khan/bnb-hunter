"use client";

export default function Home() {
  const sendLocation = () => {
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
        alert("Lokasi terkirim");
      },
      () => alert("Izin lokasi ditolak")
    );
  };

  return (
    <main style={{ textAlign: "center", marginTop: 50 }}>
      <h2>Bagikan Lokasi Anda</h2>
      <button onClick={sendLocation}>Share Lokasi</button>
    </main>
  );
}
