#!/bin/bash
echo "🚀 Starting Shopee → Amazon Automation System"
echo "=============================================="
echo ""
echo "Starting services in tmux session..."
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux not found. Installing..."
    sudo apt-get update && sudo apt-get install -y tmux
fi

# Kill existing session if exists
tmux kill-session -t automation 2>/dev/null

# Create new tmux session
tmux new-session -d -s automation -n api
tmux send-keys -t automation:api "cd /workspaces/AUTOMATION && npm run dev:api" C-m

# Create worker pane
tmux new-window -t automation -n worker
tmux send-keys -t automation:worker "cd /workspaces/AUTOMATION && npm run dev:worker" C-m

# Create web pane
tmux new-window -t automation -n web
tmux send-keys -t automation:web "cd /workspaces/AUTOMATION && npm run dev:web" C-m

# Select first window
tmux select-window -t automation:api

echo "✅ Services started in tmux session 'automation'"
echo ""
echo "📋 Commands:"
echo "   tmux attach -t automation    # Attach to session"
echo "   Ctrl+B then D                # Detach from session"
echo "   Ctrl+B then N                # Next window"
echo "   Ctrl+B then P                # Previous window"
echo "   tmux kill-session -t automation  # Stop all services"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:4000"
echo ""
echo "To view services, run: tmux attach -t automation"
