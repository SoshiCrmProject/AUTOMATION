#!/bin/bash

# 🧪 Tour System Testing Script
# This script helps test the onboarding and tour system

echo "🎓 Onboarding & Tour System - Test Helper"
echo "=========================================="
echo ""

# Function to clear all tour localStorage keys
clear_all_tours() {
    echo "📝 To clear ALL tour data in browser console:"
    echo ""
    echo "localStorage.clear();"
    echo ""
    echo "OR individually:"
    echo "localStorage.removeItem('welcome_tour_completed');"
    echo "localStorage.removeItem('tour_completed_dashboard');"
    echo "localStorage.removeItem('tour_completed_analytics');"
    echo "localStorage.removeItem('tour_completed_inventory');"
    echo "localStorage.removeItem('tour_completed_crm');"
    echo "localStorage.removeItem('tour_completed_orders');"
    echo "localStorage.removeItem('tour_completed_settings');"
    echo ""
}

# Function to show test URLs
show_test_urls() {
    echo "🌐 Test URLs (assuming http://localhost:3000):"
    echo ""
    echo "1. Welcome Tour:     http://localhost:3000/"
    echo "2. Dashboard Tour:   http://localhost:3000/dashboard"
    echo "3. Analytics Tour:   http://localhost:3000/analytics"
    echo "4. Inventory Tour:   http://localhost:3000/inventory"
    echo "5. CRM Tour:         http://localhost:3000/crm"
    echo "6. Orders Tour:      http://localhost:3000/orders"
    echo "7. Settings Tour:    http://localhost:3000/settings"
    echo ""
}

# Function to show testing checklist
show_checklist() {
    echo "✅ Testing Checklist:"
    echo ""
    echo "For Welcome Tour:"
    echo "  [ ] Auto-appears after 1 second on landing page"
    echo "  [ ] 8 steps with page descriptions"
    echo "  [ ] 'Visit' buttons navigate to pages"
    echo "  [ ] Quick Start Checklist on final step"
    echo "  [ ] Skip button works"
    echo "  [ ] Doesn't repeat after completion"
    echo ""
    echo "For Each Page Tour (Dashboard, Analytics, Inventory, CRM, Orders, Settings):"
    echo "  [ ] Auto-appears on first visit"
    echo "  [ ] 4 steps with features and tips"
    echo "  [ ] Previous/Next navigation works"
    echo "  [ ] Progress indicator updates"
    echo "  [ ] Skip button works"
    echo "  [ ] Completes and doesn't repeat"
    echo "  [ ] (?) HelpButton visible in bottom-right"
    echo "  [ ] HelpButton replays tour when clicked"
    echo ""
    echo "Cross-Page Testing:"
    echo "  [ ] Tours are page-specific (localStorage keys)"
    echo "  [ ] Navigation between pages works"
    echo "  [ ] No console errors"
    echo "  [ ] Responsive on mobile/tablet"
    echo ""
}

# Function to check if services are running
check_services() {
    echo "🔍 Checking if services are running..."
    echo ""
    
    # Check if port 3000 is in use
    if command -v lsof &> /dev/null; then
        if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "✅ Web service is running on port 3000"
        else
            echo "❌ Web service is NOT running on port 3000"
            echo "   Run: cd /workspaces/AUTOMATION && docker-compose up -d"
        fi
    else
        echo "⚠️  Cannot check services (lsof not available)"
        echo "   Manually verify: docker-compose ps"
    fi
    echo ""
}

# Main menu
case "$1" in
    "clear")
        clear_all_tours
        ;;
    "urls")
        show_test_urls
        ;;
    "checklist")
        show_checklist
        ;;
    "services")
        check_services
        ;;
    *)
        echo "Usage: ./test-tours.sh [command]"
        echo ""
        echo "Commands:"
        echo "  clear      - Show localStorage clear commands"
        echo "  urls       - Show test URLs for all tours"
        echo "  checklist  - Show complete testing checklist"
        echo "  services   - Check if services are running"
        echo ""
        echo "Quick Start:"
        echo "  1. ./test-tours.sh services  # Check services"
        echo "  2. ./test-tours.sh urls      # Get URLs"
        echo "  3. Open browser and run: localStorage.clear()"
        echo "  4. Visit http://localhost:3000/"
        echo "  5. ./test-tours.sh checklist # Follow testing steps"
        echo ""
        ;;
esac
