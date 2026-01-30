# Aplikasi LKS Cloud Computing 2026

Aplikasi Node.js sederhana untuk kompetensi LKS Cloud Computing yang mengintegrasikan:
1. ✅ EC2 - Web Server
2. ✅ RDS MySQL - Database
3. ✅ Redis - Cache System

## Cara Deploy di AWS:

### 1. Setup EC2 Instance:
```bash
# Login ke EC2 via SSH
ssh -i key.pem ec2-user@<ec2-ip>

# Update sistem
sudo yum update -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs -y

# Clone/Upload aplikasi
git clone <repo-url>
cd lks-cloud-app

# Install dependencies
npm install