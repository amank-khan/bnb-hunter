import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const data = await req.json();

  const log = {
    time: new Date().toISOString(),
    lat: data.lat,
    lng: data.lng,
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-forwarded-for"),
  };

  const filePath = path.join(process.cwd(), "data.log");

  const line = JSON.stringify(log) + "\n";

  try {
    fs.appendFileSync(filePath, line);
  } catch (err) {
    console.error("Gagal write file:", err);
  }

  console.log("LOG:", log);

  return NextResponse.json({ ok: true });
}
