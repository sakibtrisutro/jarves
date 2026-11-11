# JARVIS — Private LAN & Mobile Device Access Guide

JARVIS runs as a local executive operating system on your primary Windows laptop and provides secure access to other devices connected to the same private Local Area Network (LAN).

## 1. Finding Your Laptop's Local IP Address
1. Open Command Prompt on your Windows laptop:
   Press `Win + R`, type `cmd`, and press Enter.
2. Run:
   ```cmd
   ipconfig
   ```
3. Locate your active connection (Wi-Fi or Ethernet) and note your **IPv4 Address** (e.g., `192.168.1.150`).

## 2. Windows Firewall Configuration
To allow your phone or tablet on the same Wi-Fi to reach JARVIS:
1. Open Windows Defender Firewall -> Advanced Settings.
2. Select **Inbound Rules** -> **New Rule...**
3. Choose **Port** -> TCP -> Specific local ports: `3000`.
4. Allow the connection for **Private Networks**.
5. Name the rule `JARVIS Port 3000`.

## 3. Connecting from Mobile (Phone / Tablet)
1. Ensure your mobile device is connected to the same Wi-Fi network as your laptop.
2. Open Chrome or Safari on your phone.
3. Navigate to:
   `http://<YOUR_LOCAL_IP>:3000` (e.g., `http://192.168.1.150:3000`)
4. Log in with your JARVIS credentials (**Sakib** or **Sanjida**).

## Security & Network Policy
- JARVIS does **NOT** expose public tunnels (No Ngrok or Cloudflare Tunnel) by default.
- All endpoints are protected by multi-user authentication.
