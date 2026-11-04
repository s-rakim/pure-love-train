# Hosting the sync server on Oracle Cloud's free tier

This puts the server on an Always Free Oracle VM with a public `https://` address, so anyone who installs the app from Google Play can sync without Tailscale.

## 1. Create the VM

1. In the Oracle Cloud console, open **Compute → Instances → Create instance**.
2. Image: **Canonical Ubuntu 24.04**. Shape: **Ampere → VM.Standard.A1.Flex** with 2 OCPUs and 12 GB of memory (Always Free covers up to 4 OCPUs and 24 GB in total).
   If it says "Out of capacity", try another availability domain, or try again later; it frees up over time.
3. Boot volume: 100 GB is plenty to start (Always Free covers 200 GB in total).
4. Add your SSH public key, create it, and note its **public IP address**.

Oracle can reclaim Always Free VMs that sit idle for a week. Upgrading the account to **Pay As You Go** stops that, and Always Free resources stay free. Set a budget alert of $1 under **Billing → Budgets** so you'd hear about any charge.

## 2. Open ports 80 and 443

Two places block traffic, and both need opening:

- **Oracle's firewall:** on the instance page, open its subnet's **security list** and add two ingress rules: source `0.0.0.0/0`, TCP, destination port `80`, and the same for `443`.
- **Ubuntu's firewall** on the VM:

  ```bash
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  sudo netfilter-persistent save
  ```

## 3. Point a domain at it

Use a domain you own (an `A` record to the VM's IP), or a free one from [DuckDNS](https://www.duckdns.org): pick a name like `youandi.duckdns.org` and set it to the VM's IP.

## 4. Lock down the VM

```bash
# Security updates install themselves every day.
sudo apt-get update && sudo apt-get install -y unattended-upgrades && sudo dpkg-reconfigure -f noninteractive unattended-upgrades
# SSH only with your key, never a password, and never as root.
printf 'PasswordAuthentication no\nPermitRootLogin no\nKbdInteractiveAuthentication no\n' | sudo tee /etc/ssh/sshd_config.d/99-hardening.conf
sudo systemctl restart ssh
```

In the security list, change the SSH rule (port 22) from `0.0.0.0/0` to your own IP address, or install Tailscale on the VM and SSH over it, then remove the port 22 rule entirely.

Turn on two-step verification for your Oracle, Google (Firebase), GitHub and expo.dev accounts: they control the server, the sign-ins, the code and the app updates.

## 5. Install Docker and start the server

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
git clone https://github.com/s-rakim/pure-love-train && cd pure-love-train
cat > .env <<'ENV'
DOMAIN=youandi.duckdns.org
GOOGLE_CLIENT_ID=<the web client ID>
MAX_SPACES=150
STORAGE_LIMIT_GB=1
DATA_KEY=<paste the output of: openssl rand -hex 32>
ENV
chmod 600 .env
docker compose -f docker-compose.yml -f deploy/docker-compose.public.yml up -d --build
curl https://youandi.duckdns.org/health   # {"ok":true}
```

`MAX_SPACES` × `STORAGE_LIMIT_GB` should stay under the disk you gave the VM, with room to spare. Raise either later and run the same `up -d --build` command again.

`DATA_KEY` encrypts everything the server keeps (records, backups, emails, photos and videos). **Save a copy in your password manager now.** Without it the data, and every backup of it, can't be read; the server refuses to start with a missing or different key rather than lose anything.

## 6. Put Cloudflare in front (recommended)

Cloudflare's free plan absorbs flood (DDoS) attacks before they reach the VM. It needs a domain you own (DuckDNS won't work).

1. Add the domain to Cloudflare (free plan) and change its nameservers where you bought it, as Cloudflare shows.
2. In Cloudflare **DNS**, add an `A` record for the server's name (like `sync`) pointing to the VM's IP, with the orange cloud **on** (Proxied).
3. **SSL/TLS → Overview:** set the mode to **Full (strict)**.
4. **Security → WAF → Rate limiting rules:** add one rule: if the URI path starts with `/api/`, more than 300 requests in 1 minute from the same IP → Block for 1 minute.
5. On the VM, start the server in Cloudflare mode, so Caddy only lets Cloudflare in:

   ```bash
   docker compose -f docker-compose.yml -f deploy/docker-compose.public.yml -f deploy/docker-compose.cloudflare.yml up -d --build
   ```

   Use that same command (with all three files) wherever this guide says `up -d --build`.
6. Optional, even tighter: in the Oracle security list, replace the `0.0.0.0/0` rules for 80 and 443 with one rule per range on https://www.cloudflare.com/ips/.

## 7. Updating and backups

Update after pulling new server code:

```bash
git pull && docker compose -f docker-compose.yml -f deploy/docker-compose.public.yml up -d --build
```

Back up every night with a cron job (`crontab -e`):

```
0 3 * * * docker run --rm -v pure-love-train_pure-love-data:/data -v $HOME/backups:/backup alpine tar czf /backup/pure-love-$(date +\%a).tgz /data
```

That keeps a rolling week of backups in `~/backups`. With `DATA_KEY` set, everything in them is encrypted, so they're safe to copy elsewhere; keep the key itself separate from them. Copy them off the VM now and then (for example to Oracle Object Storage, which has 20 GB free), since a backup on the same disk won't survive losing the VM.
