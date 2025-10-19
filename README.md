# Contract Bridge Game

A full-stack Contract Bridge game built with React + Vite frontend and FastAPI backend with WebSocket support for real-time multiplayer gameplay.

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI (Python) with WebSocket support
- **Real-time Communication**: WebSockets

## Prerequisites

Before you begin, ensure you have the following installed:

- **[Bun](https://bun.sh/)** - Fast JavaScript runtime & package manager
- **[uv](https://docs.astral.sh/uv/)** - Fast Python package installer and resolver
- **Python 3.13+** (required by the backend)
- **Git**

### Installing Prerequisites

**Install Bun:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Install uv:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/contract_bridge.git
cd contract_bridge
```

### 2. Backend Setup (FastAPI Server)

```bash
cd server

# Install Python dependencies using uv
uv sync

# Run the FastAPI server
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend server will start on `http://localhost:8000`.

- WebSocket endpoint: `ws://localhost:8000/ws/`
- API docs: `http://localhost:8000/docs`

### 3. Frontend Setup (React + Vite)

Open a new terminal window:

```bash
# Navigate to project root (if not already there)
cd contract_bridge

# Install frontend dependencies
bun install

# Run the development server
bun dev
```

The frontend will start on `http://localhost:5173`.

### 4. Environment Variables (Optional for Local Development)

For local development, the app defaults to `ws://localhost:8000`. To override this, create a `.env` file in the project root:

```bash
VITE_FASTAPI_URL=ws://localhost:8000
```

## Production Deployment

### Deploying to AWS + Vercel

This guide covers deploying the FastAPI backend on an AWS EC2 instance and the React frontend on Vercel.

#### Part 1: Deploy Backend to AWS EC2

**1. Launch an EC2 Instance**

- Log into AWS Console and launch an Ubuntu 22.04 LTS EC2 instance
- Choose instance type (t2.micro or larger)
- Configure security group to allow:
  - SSH (port 22) from your IP
  - HTTP (port 80) from anywhere
  - Custom TCP (port 8000) from anywhere
  - WebSocket connections (ensure port 8000 allows WebSocket upgrade)

**2. Connect to Your EC2 Instance**

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

**3. Install Dependencies on EC2**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.13+ (if not available, use deadsnakes PPA)
sudo apt install -y python3.13 python3.13-venv

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env

# Install git
sudo apt install -y git
```

**4. Clone and Setup the Backend**

```bash
# Clone your repository
git clone https://github.com/your-username/contract_bridge.git
cd contract_bridge/server

# Install dependencies
uv sync
```

**5. Run Backend as a Service (using systemd)**

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/bridge-backend.service
```

Add the following content (adjust paths as needed):

```ini
[Unit]
Description=Contract Bridge FastAPI Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/contract_bridge/server
Environment="PATH=/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/ubuntu/.local/bin/uv run uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable bridge-backend
sudo systemctl start bridge-backend
sudo systemctl status bridge-backend
```

**6. (Optional) Setup Nginx as Reverse Proxy**

For production, it's recommended to use Nginx:

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/bridge-backend
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or EC2 public IP

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/bridge-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**7. Note Your Backend URL**

Your backend will be accessible at:
- Without Nginx: `ws://your-ec2-public-ip:8000`
- With Nginx: `ws://your-ec2-public-ip` or `ws://your-domain.com`

For production with SSL, use `wss://` instead of `ws://`.

#### Part 2: Deploy Frontend to Vercel

**1. Install Vercel CLI (Optional)**

```bash
bun add -g vercel
```

**2. Configure Environment Variables**

You'll need to set the `VITE_FASTAPI_URL` environment variable in Vercel to point to your AWS backend.

**3. Deploy via Vercel Dashboard**

- Go to [vercel.com](https://vercel.com)
- Click "Add New Project"
- Import your GitHub repository
- Configure build settings:
  - **Framework Preset**: Vite
  - **Build Command**: `bun run build`
  - **Output Directory**: `dist`
  - **Install Command**: `bun install`

**4. Add Environment Variable**

In Vercel project settings → Environment Variables, add:

```
VITE_FASTAPI_URL=wss://your-ec2-public-ip:8000
```

Or if using a domain with SSL:

```
VITE_FASTAPI_URL=wss://api.yourdomain.com
```

**Note**: Use `wss://` (WebSocket Secure) for production with HTTPS/SSL.

**5. Deploy**

Click "Deploy" and Vercel will build and deploy your frontend.

**6. Deploy via CLI (Alternative)**

```bash
# From project root
vercel --prod

# Follow the prompts to configure deployment
```

### Environment Variable Configuration

The application uses the `VITE_FASTAPI_URL` environment variable to determine the WebSocket server endpoint:

- **If `VITE_FASTAPI_URL` is set**: Uses the specified URL (can be `ws://`, `wss://`, or just the hostname)
- **If not set**: Defaults to `ws://localhost:8000` (for local development)

**Example configurations:**

```bash
# Development
VITE_FASTAPI_URL=ws://localhost:8000

# Production (without SSL)
VITE_FASTAPI_URL=ws://your-ec2-ip:8000

# Production (with SSL)
VITE_FASTAPI_URL=wss://api.yourdomain.com

# Can also omit protocol (assumes ws://)
VITE_FASTAPI_URL=your-ec2-ip:8000
```

## Building for Production

### Frontend

```bash
bun run build
```

This creates an optimized production build in the `dist/` directory.

### Backend

The Python backend doesn't require a build step, but for production:

```bash
# Run with production settings
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Project Structure

```
contract_bridge/
├── src/                      # Frontend source code
│   ├── components/          # React components
│   ├── screens/             # Screen components
│   ├── contexts/            # React contexts
│   └── utils/               # Utility functions
├── server/                   # Backend source code
│   ├── main.py              # FastAPI application
│   └── pyproject.toml       # Python dependencies
├── public/                   # Static assets
└── package.json             # Frontend dependencies
```

## Troubleshooting

### WebSocket Connection Issues

1. **Check CORS settings** in FastAPI (`main.py`)
2. **Verify firewall rules** on AWS EC2 (Security Groups)
3. **Check browser console** for connection errors
4. **Verify environment variable** is set correctly in Vercel
5. **Use `wss://`** for HTTPS sites (browsers require secure WebSocket for HTTPS)

### Backend Not Starting

```bash
# Check logs on EC2
sudo journalctl -u bridge-backend -f

# Check if port is in use
sudo lsof -i :8000
```

### Frontend Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install
```

## Development Tips

- Use the quick start script: `./run.bash` (if available)
- Backend API documentation available at: `http://localhost:8000/docs`
- WebSocket messages are logged to browser console during development
- Use browser DevTools → Network tab to inspect WebSocket frames

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
