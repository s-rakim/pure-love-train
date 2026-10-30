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

## 4. Install Docker and start the server

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
git clone https://github.com/s-rakim/pure-love-train && cd pure-love-train
cat > .env <<'ENV'
DOMAIN=youandi.duckdns.org
GOOGLE_CLIENT_ID=<the web client ID>
MAX_SPACES=1000
STORAGE_LIMIT_GB=1
ENV
docker compose -f docker-compose.yml -f deploy/docker-compose.public.yml up -d --build
curl https://youandi.duckdns.org/health   # {"ok":true}
```

`MAX_SPACES` × `STORAGE_LIMIT_GB` should stay under the disk you gave the VM, with room to spare. Raise either later and run the same `up -d --build` command again.

## 5. Updating and backups

Update after pulling new server code:

```bash
git pull && docker compose -f docker-compose.yml -f deploy/docker-compose.public.yml up -d --build
```

Back up every night with a cron job (`crontab -e`):

```
0 3 * * * docker run --rm -v pure-love-train_pure-love-data:/data -v $HOME/backups:/backup alpine tar czf /backup/pure-love-$(date +\%a).tgz /data
```

That keeps a rolling week of backups in `~/backups`. Copy them off the VM now and then (for example to Oracle Object Storage, which has 20 GB free), since a backup on the same disk won't survive losing the VM.
