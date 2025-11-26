// Tour configurations for all pages

export const dashboardTour = [
  {
    title: "Welcome to Dashboard! 🎉",
    description: "Your command center for monitoring business performance and recent activities. Get real-time insights into orders, revenue, and system health.",
    icon: "📊",
    features: [
      "Real-time revenue and order tracking",
      "Visual charts showing trends and patterns",
      "Quick access to recent orders and queue status",
      "Order details with one click",
      "System health monitoring"
    ],
    tips: [
      "Check the dashboard daily to stay on top of your business",
      "Use the period selector to view different timeframes",
      "Click on any order in the table to see full details"
    ]
  },
  {
    title: "Understanding Your Metrics 📈",
    description: "The stat cards at the top show your key performance indicators (KPIs) that update in real-time.",
    icon: "💰",
    features: [
      "Today's Revenue - Total earnings for the current day",
      "Active Orders - Orders currently being processed",
      "Today's Profit - Net profit after costs",
      "Conversion Rate - Percentage of successful orders"
    ],
    tips: [
      "Green trends mean growth compared to yesterday",
      "Red trends indicate a decrease - review your strategy",
      "Aim for a conversion rate above 80%"
    ]
  },
  {
    title: "Charts & Visualizations 📊",
    description: "Visual representation of your business data makes it easy to spot trends and make data-driven decisions.",
    icon: "📉",
    features: [
      "Revenue Overview - Bar chart showing daily revenue",
      "Order Trends - Line chart tracking order volume",
      "Interactive tooltips on hover",
      "Color-coded data for easy understanding"
    ],
    tips: [
      "Hover over chart bars to see exact values",
      "Look for patterns - spikes might indicate successful campaigns",
      "Dips in charts may need investigation"
    ]
  },
  {
    title: "Order Management Tabs 📦",
    description: "Switch between different views to manage orders, monitor queue, and take quick actions.",
    icon: "🔄",
    features: [
      "Recent Orders - Latest order activity with status",
      "Queue Status - Background jobs and processing",
      "Quick Actions - Fast access to common tasks",
      "Click any row to view full order details"
    ],
    tips: [
      "Failed orders appear in red - click to retry",
      "Queue tab shows if system is processing orders",
      "Use Quick Actions for one-click operations"
    ]
  }
];

export const analyticsTour = [
  {
    title: "Welcome to Analytics! 📊",
    description: "Deep dive into your business performance with comprehensive analytics, trends, and AI-powered insights.",
    icon: "📈",
    features: [
      "Weekly revenue and profit tracking",
      "Order volume analysis",
      "Top performing products",
      "Daily breakdown reports",
      "AI-generated insights and recommendations",
      "Export data to CSV"
    ],
    tips: [
      "Enter Shop ID to load your analytics data",
      "Use Export CSV button to download reports",
      "Check insights tab for AI recommendations"
    ]
  },
  {
    title: "Revenue & Profit Analysis 💰",
    description: "Track your financial performance with detailed charts showing revenue trends and profit margins.",
    icon: "💵",
    features: [
      "Revenue trend line showing growth over time",
      "Profit trend comparing revenue vs costs",
      "Weekly summary with key metrics",
      "Color-coded charts for easy reading"
    ],
    tips: [
      "Green lines indicate healthy growth",
      "Compare revenue vs profit to optimize pricing",
      "Look for seasonal patterns in your data"
    ]
  },
  {
    title: "Product Performance 🏆",
    description: "Identify your best-selling products and optimize your inventory based on data.",
    icon: "⭐",
    features: [
      "Top 10 products ranked by revenue",
      "Units sold and total earnings per product",
      "Product SKU and name for easy identification",
      "Sort by different metrics"
    ],
    tips: [
      "Focus marketing on top performers",
      "Stock more inventory for high-selling items",
      "Review low performers to adjust strategy"
    ]
  },
  {
    title: "AI-Powered Insights 🤖",
    description: "Get intelligent recommendations to optimize your business based on data analysis.",
    icon: "🧠",
    features: [
      "Revenue trend analysis with recommendations",
      "Inventory optimization suggestions",
      "Pricing strategy insights",
      "Order success rate improvements"
    ],
    tips: [
      "Review insights weekly for best results",
      "Implement suggestions one at a time",
      "Track impact of changes you make"
    ]
  }
];

export const inventoryTour = [
  {
    title: "Welcome to Inventory Management! 📦",
    description: "Complete control over your stock levels, low stock alerts, and product management across platforms.",
    icon: "📦",
    features: [
      "Real-time stock tracking",
      "Low stock alerts and notifications",
      "Stock adjustment tools (IN/OUT/ADJUSTMENT)",
      "Add new products with full details",
      "Statistics and health monitoring"
    ],
    tips: [
      "Enter Shop ID to view inventory",
      "Set low stock thresholds to avoid stockouts",
      "Use filters to find products quickly"
    ]
  },
  {
    title: "Stock Overview & Metrics 📊",
    description: "Monitor your inventory health with key metrics displayed at the top of the page.",
    icon: "📈",
    features: [
      "Total Products - Complete product count",
      "Total Stock - Sum of all units",
      "Low Stock - Items below threshold",
      "Out of Stock - Items requiring immediate attention"
    ],
    tips: [
      "Zero out-of-stock items is ideal",
      "Keep low stock count minimal",
      "Regularly review statistics tab"
    ]
  },
  {
    title: "Product Management 🛍️",
    description: "View, search, and manage all products with advanced filtering and quick actions.",
    icon: "🔍",
    features: [
      "Search by product name or SKU",
      "Filter by stock status (In Stock, Low, Out)",
      "Color-coded stock levels (green=good, red=critical)",
      "One-click stock adjustments",
      "Add new products with complete details"
    ],
    tips: [
      "Click 'Adjust' button for quick stock updates",
      "Use search to find products instantly",
      "Status badges show current inventory state"
    ]
  },
  {
    title: "Stock Adjustments & Alerts ⚠️",
    description: "Efficiently manage stock levels and respond to low stock alerts.",
    icon: "🔔",
    features: [
      "IN - Add stock when receiving inventory",
      "OUT - Remove stock for sales or damage",
      "ADJUSTMENT - Correct inventory discrepancies",
      "Acknowledge alerts to mark as reviewed",
      "Resolve alerts when issue is fixed"
    ],
    tips: [
      "Always add reason for adjustments",
      "Acknowledge alerts to track follow-ups",
      "Resolve alerts after restocking"
    ]
  }
];

export const crmTour = [
  {
    title: "Welcome to CRM! 👥",
    description: "Build lasting customer relationships with comprehensive customer management, interaction tracking, and loyalty programs.",
    icon: "🤝",
    features: [
      "Complete customer profiles",
      "Interaction history tracking",
      "Loyalty tier management",
      "Customer lifetime value (LTV)",
      "Blacklist management",
      "Engagement analytics"
    ],
    tips: [
      "Enter Shop ID to load customer data",
      "Use filters to segment customers",
      "Click customers to view full details"
    ]
  },
  {
    title: "Customer Insights 📊",
    description: "Understand your customer base with key metrics and loyalty distribution.",
    icon: "💎",
    features: [
      "Total Customers - Your complete customer base",
      "Average LTV - Revenue per customer",
      "Platinum Members - Your VIP customers",
      "Blacklisted - Problematic accounts",
      "Loyalty tier distribution chart"
    ],
    tips: [
      "Higher LTV = more valuable customers",
      "Grow Platinum tier with loyalty programs",
      "Review blacklisted customers regularly"
    ]
  },
  {
    title: "Customer Management 👤",
    description: "Manage individual customers with detailed profiles and action tools.",
    icon: "📝",
    features: [
      "Customer name, email, phone",
      "Total orders and lifetime value",
      "Loyalty tier with visual indicators",
      "Last purchase date",
      "Active/Blacklisted status",
      "View details button for full profile"
    ],
    tips: [
      "Search by name or email to find customers",
      "Filter by tier to target specific segments",
      "Click rows to open detailed view"
    ]
  },
  {
    title: "Interactions & Loyalty 🏆",
    description: "Track customer interactions and manage loyalty tier progression.",
    icon: "💬",
    features: [
      "Add interactions (Purchase, Support, Complaint, etc.)",
      "Mark interactions as resolved",
      "Update loyalty tiers with reason",
      "View complete loyalty history",
      "Tier progression tracking"
    ],
    tips: [
      "Log all customer interactions for context",
      "Resolve issues promptly to maintain satisfaction",
      "Reward loyal customers with tier upgrades"
    ]
  }
];

export const ordersTour = [
  {
    title: "Welcome to Order Management! 📦",
    description: "Track, process, and manage all orders across Shopee and Amazon with powerful tools and bulk actions.",
    icon: "🚚",
    features: [
      "Real-time order tracking",
      "Bulk retry for failed orders",
      "Manual order marking",
      "Export orders to CSV",
      "Order status filtering",
      "Detailed error information"
    ],
    tips: [
      "Use Poll Now to fetch latest orders",
      "Filter by status to focus on issues",
      "Bulk actions save time on multiple orders"
    ]
  },
  {
    title: "Order Status Overview 📊",
    description: "Monitor order pipeline health with key metrics at a glance.",
    icon: "📈",
    features: [
      "Total Orders - Complete order count",
      "Fulfilled - Successfully processed orders",
      "Failed - Orders needing attention",
      "Pending - Orders in processing queue"
    ],
    tips: [
      "Aim for high fulfilled percentage",
      "Investigate failed orders immediately",
      "Pending orders process automatically"
    ]
  },
  {
    title: "Order Filters & Search 🔍",
    description: "Quickly find specific orders with powerful search and filtering tools.",
    icon: "🔎",
    features: [
      "Search by Shopee or Amazon order ID",
      "Filter by status (All, Fulfilled, Failed, Pending)",
      "Select multiple orders with checkboxes",
      "Bulk retry selected orders",
      "Clear selection button"
    ],
    tips: [
      "Search is instant - just start typing",
      "Use status filters to isolate issues",
      "Select all failed orders for bulk retry"
    ]
  },
  {
    title: "Order Actions & Details 🛠️",
    description: "Take action on orders and view complete order information.",
    icon: "⚙️",
    features: [
      "View - See complete order details",
      "Retry - Reprocess failed orders",
      "Manual - Mark as manually processed",
      "Error details with reason codes",
      "Amazon tracking information"
    ],
    tips: [
      "Click any row to open order details",
      "Retry failed orders after fixing issues",
      "Use Manual for special case orders"
    ]
  }
];

export const settingsTour = [
  {
    title: "Welcome to Settings! ⚙️",
    description: "Configure automation rules, platform credentials, and system preferences to optimize your dropshipping operation.",
    icon: "🔧",
    features: [
      "Automation rules configuration",
      "Shopee API credentials",
      "Amazon seller credentials",
      "Webhook notifications",
      "Execution mode (Live/Dry Run)",
      "Profit and shipping settings"
    ],
    tips: [
      "Complete all tabs before enabling automation",
      "Use Dry Run mode to test configuration",
      "Save each tab separately"
    ]
  },
  {
    title: "General Settings 🎯",
    description: "Configure core automation rules that control how orders are processed.",
    icon: "📐",
    features: [
      "Max Shipping Days - Delivery time limit",
      "Min Expected Profit - Profit threshold per order",
      "Domestic Shipping Cost - Additional costs",
      "Review Band Percent - Manual review threshold",
      "Include Amazon Points toggle",
      "Enable/Disable automation"
    ],
    tips: [
      "Start with conservative settings",
      "Adjust profit margins based on competition",
      "Enable automation only when ready"
    ]
  },
  {
    title: "Platform Credentials 🔑",
    description: "Connect your Shopee and Amazon accounts with API credentials.",
    icon: "🔐",
    features: [
      "Shopee Partner ID and Key",
      "Shopee Shop ID",
      "Amazon seller email",
      "Amazon seller password",
      "Shipping label configuration"
    ],
    tips: [
      "Get Shopee credentials from Open Platform",
      "Never share credentials with others",
      "Test credentials after saving"
    ]
  },
  {
    title: "Notifications & Alerts 🔔",
    description: "Set up real-time notifications for important events and errors.",
    icon: "📢",
    features: [
      "Slack webhook integration",
      "Discord webhook support",
      "Test webhook before saving",
      "Alert customization",
      "Real-time error notifications"
    ],
    tips: [
      "Set up Slack/Discord for instant alerts",
      "Test webhook to verify connectivity",
      "Monitor notifications regularly"
    ]
  }
];

// Tour configurations export
export const pageTours = {
  dashboard: dashboardTour,
  analytics: analyticsTour,
  inventory: inventoryTour,
  crm: crmTour,
  orders: ordersTour,
  settings: settingsTour
};
