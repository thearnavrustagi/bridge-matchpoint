# Contract Bridge Server

This directory contains the FastAPI server for the Contract Bridge game.

## Installation

Make sure you have `uv` installed. If not, you can install it via pip:

```bash
pip install uv
```

Then, install the dependencies:

```bash
cd server
uv sync
```

## Running the Server

To start the FastAPI server, navigate to the `server` directory and run:

```bash
uvicorn main:app --reload
```

The server will be accessible at `http://127.0.0.1:8000`.

