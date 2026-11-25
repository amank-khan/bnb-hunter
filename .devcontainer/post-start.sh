#!/usr/bin/env bash
set -Eeuo pipefail

LOG_FILE="$HOME/vnc-startup.log"
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

trap 'echo "ERROR pada baris $LINENO. Periksa $LOG_FILE"' ERR

echo
echo "======================================"
echo "       VNC DESKTOP STARTUP"
echo "======================================"

# --------------------------------------------------
# 1. Periksa secret
# --------------------------------------------------

if [[ -z "${RDP_PASSWORD:-}" ]]; then
    echo "ERROR: RDP_PASSWORD tidak tersedia."
    exit 1
fi

# VNC klasik hanya menggunakan 8 karakter pertama.
VNC_PASSWORD="${RDP_PASSWORD:0:8}"

if (( ${#VNC_PASSWORD} < 6 )); then
    echo "ERROR: Password VNC minimal 6 karakter."
    exit 1
fi

# --------------------------------------------------
# 2. Pastikan user tersedia
# --------------------------------------------------

if ! id rdpuser >/dev/null 2>&1; then
    sudo useradd -m -s /bin/bash rdpuser
fi

# Atur password Linux dari Codespaces Secret.
printf 'rdpuser:%s\n' "$RDP_PASSWORD" | sudo chpasswd

sudo install -d -o rdpuser -g rdpuser -m 700 \
    /home/rdpuser/.vnc

# --------------------------------------------------
# 3. Periksa dependency
# --------------------------------------------------

for cmd in tigervncserver Xtigervnc startlxde dbus-launch websockify; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "ERROR: Perintah $cmd tidak ditemukan."
        echo "Periksa postCreateCommand."
        exit 1
    fi
done

# --------------------------------------------------
# 4. Konfigurasi desktop LXDE
# --------------------------------------------------

sudo tee /home/rdpuser/.vnc/xstartup >/dev/null <<'EOF'
#!/bin/sh

unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
unset XDG_RUNTIME_DIR

exec dbus-launch --exit-with-session startlxde
EOF

sudo chown rdpuser:rdpuser /home/rdpuser/.vnc/xstartup
sudo chmod 700 /home/rdpuser/.vnc/xstartup

# --------------------------------------------------
# 5. Buat password VNC
# --------------------------------------------------

echo "Configuring VNC authentication..."

printf '%s\n' "$VNC_PASSWORD" |
    sudo bash -c '
        runuser -u rdpuser -- tigervncpasswd -f \
        > /home/rdpuser/.vnc/passwd
    '

sudo chown rdpuser:rdpuser /home/rdpuser/.vnc/passwd
sudo chmod 600 /home/rdpuser/.vnc/passwd

# --------------------------------------------------
# 6. Cari display yang belum digunakan
# --------------------------------------------------

DISPLAY_NUM=""

for n in $(seq 2 20); do
    PORT=$((5900 + n))

    if [[ ! -e "/tmp/.X${n}-lock" ]] &&
       [[ ! -S "/tmp/.X11-unix/X${n}" ]] &&
       ! ss -lnt | grep -q ":${PORT}[[:space:]]"; then
        DISPLAY_NUM="$n"
        break
    fi
done

if [[ -z "$DISPLAY_NUM" ]]; then
    echo "ERROR: Tidak menemukan display VNC kosong."
    exit 1
fi

VNC_PORT=$((5900 + DISPLAY_NUM))

echo "Selected display: :$DISPLAY_NUM"
echo "Selected port: $VNC_PORT"

# --------------------------------------------------
# 7. Jalankan TigerVNC
# --------------------------------------------------

echo "Starting TigerVNC..."

sudo env \
    HOME=/home/rdpuser USER=rdpuser LOGNAME=rdpuser \
    runuser -u rdpuser -- \
    tigervncserver ":$DISPLAY_NUM" \
    -localhost yes \
    -SecurityTypes VncAuth \
    -geometry 1280x960 \
    -depth 24

# Tunggu server VNC siap
READY=0

for i in $(seq 1 20); do
    if ss -lnt | grep -q ":${VNC_PORT}[[:space:]]"; then
        READY=1
        break
    fi
    sleep 1
done

if [[ "$READY" -ne 1 ]]; then
    echo "ERROR: TigerVNC gagal membuka port $VNC_PORT."
    sudo find /home/rdpuser/.vnc -name '*.log' \
        -exec tail -n 80 {} \;
    exit 1
fi

echo "TigerVNC is listening on port $VNC_PORT."

# --------------------------------------------------
# 8. Hentikan noVNC lama
# --------------------------------------------------

pkill -f '[w]ebsockify.*0.0.0.0:6080' || true
sleep 1

# --------------------------------------------------
# 9. Jalankan noVNC
# --------------------------------------------------

echo "Starting noVNC..."

nohup websockify \
    --web=/usr/share/novnc \
    0.0.0.0:6080 \
    "localhost:$VNC_PORT" \
    >/tmp/novnc.log 2>&1 &

echo $! >/tmp/novnc.pid

sleep 2

if ! kill -0 "$(cat /tmp/novnc.pid)" 2>/dev/null; then
    echo "ERROR: noVNC gagal dijalankan."
    cat /tmp/novnc.log
    exit 1
fi

# --------------------------------------------------
# 10. Selesai
# --------------------------------------------------

echo
echo "======================================"
echo "       VNC STARTUP SUCCESS"
echo "======================================"
echo "Linux user : rdpuser"
echo "Display    : :$DISPLAY_NUM"
echo "VNC port   : $VNC_PORT"
echo "noVNC port : 6080"
echo "Auth       : VNC password"
echo "======================================"
