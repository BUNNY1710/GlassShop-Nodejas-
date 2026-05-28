/**
 * Product copy system — business-facing language across the app.
 * Avoid developer terms (ROLE_, API paths, etc.) in UI; use formatters below.
 */

export const brand = {
  name: 'GlassShop',
  tagline: 'Intelligence',
  productDescription: 'Enterprise glass inventory & operations platform',
};

export const nav = {
  sections: {
    overview: 'Overview',
    inventory: 'Inventory',
    revenue: 'Revenue',
    intelligence: 'Intelligence',
    sales: 'Sales',
  },
  dashboard: 'Overview',
  manageStock: 'Stock Management',
  viewStock: 'Inventory',
  transferStock: 'Transfers',
  customers: 'Customers',
  quotations: 'Quotations',
  invoices: 'Invoices',
  billing: 'Billing',
  aiAssistant: 'AI Assistant',
  auditLogs: 'Activity Log',
  createStaff: 'Team Access',
  priceMaster: 'Price Catalog',
  staffQuotations: 'New Quotation',
};

export const auth = {
  signIn: {
    title: 'Welcome back',
    subtitle: 'Sign in to your workspace',
    username: 'Username',
    usernamePlaceholder: 'Enter your username',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    submit: 'Sign in',
    loading: 'Signing in…',
    footerPrefix: 'New to GlassShop?',
    footerLink: 'Create your workspace',
    registeredSuccess: 'Your workspace is ready. Sign in to continue.',
  },
  register: {
    title: 'Create your workspace',
    subtitle: 'Set up your shop in minutes',
    shopName: 'Business name',
    shopNamePlaceholder: 'e.g. Acme Glass Works',
    username: 'Administrator username',
    usernamePlaceholder: 'Choose a login name',
    email: 'Work email',
    emailPlaceholder: 'you@company.com',
    password: 'Password',
    passwordPlaceholder: 'Minimum 4 characters',
    whatsapp: 'WhatsApp number',
    whatsappPlaceholder: '+91 98765 43210 (optional)',
    submit: 'Create workspace',
    loading: 'Creating workspace…',
    footerPrefix: 'Already have an account?',
    footerLink: 'Sign in',
  },
};

export const dashboard = {
  eyebrow: 'Overview',
  greeting: (name) => `Good day, ${name}`,
  description: 'A live view of inventory health, team activity, and revenue operations.',
  liveBadge: 'Live',
  metrics: {
    totalStock: 'Active SKUs',
    lowStock: 'Low stock alerts',
    totalQuantity: 'Units on hand',
    transfers: 'Transfers',
    staff: 'Team members',
    activity: 'Recent events',
  },
  stockOverview: {
    title: 'Inventory breakdown',
    description: 'Distribution by glass type and low-stock alerts',
    chartTitle: 'Stock by glass type',
    lowStockTitle: 'Items below threshold',
    viewAll: 'View inventory',
    emptyTitle: 'No inventory yet',
    emptyDescription: 'Add your first stock items to see analytics here.',
  },
  billing: {
    title: 'Revenue operations',
    description: 'Customers, quotations, and invoices in one place',
    customers: { title: 'Customers', description: 'Contact & billing profiles' },
    quotations: { title: 'Quotations', description: 'Quotes & proposals' },
    invoices: { title: 'Invoices', description: 'Billing & payments' },
  },
  activity: {
    title: 'Team activity',
    description: 'Latest stock updates from your team',
    viewAll: 'View activity log',
    emptyTitle: 'No activity yet',
    emptyDescription: 'Updates will appear here as your team works.',
  },
  actions: {
    addStock: 'Add stock',
    viewStock: 'View inventory',
  },
};

export const roles = {
  ROLE_ADMIN: 'Administrator',
  ROLE_STAFF: 'Team member',
};

export const profile = {
  signedIn: 'Signed in as',
  manageStaff: 'Manage team',
  changePassword: 'Change password',
  changePasswordDescription: 'Update your password securely.',
  oldPassword: 'Current password',
  newPassword: 'New password',
  savePassword: 'Save password',
  logout: 'Sign out',
  success: 'Success',
  error: 'Something went wrong',
  continue: 'Continue',
};

export const actions = {
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create',
  update: 'Update',
  confirm: 'Confirm',
  viewAll: 'View all',
  loading: 'Loading…',
  search: 'Search',
  close: 'Close',
};

export const auditActions = {
  ADD: 'Added',
  UPDATE: 'Updated',
  DELETE: 'Removed',
  TRANSFER: 'Transferred',
};

export const theme = {
  light: 'Light',
  dark: 'Dark',
};

export const confirmStock = {
  title: 'Confirm stock change',
  description: 'Review the details before saving.',
  confirm: 'Save changes',
};

export const table = {
  empty: 'No records found',
  loading: 'Loading data…',
};

export const inventory = {
  eyebrow: 'Inventory',
  title: 'Inventory',
  description: 'Browse, filter, and manage stock across your warehouse.',
  metrics: {
    totalItems: 'Line items',
    lowStock: 'Below threshold',
    totalQuantity: 'Units on hand',
    lowStockOk: 'All within range',
    lowStockAlert: 'Needs attention',
  },
  filters: {
    title: 'Search & filter',
    description: 'Find stock by thickness, dimensions, or unit',
    thickness: 'Thickness',
    thicknessPlaceholder: 'e.g. 5, 8, 10',
    height: 'Height',
    heightPlaceholder: 'e.g. 5, 5.5, or 5 1/4',
    width: 'Width',
    widthPlaceholder: 'e.g. 7, 7.5, or 7 3/8',
    unit: 'Unit of measure',
    clear: 'Clear filters',
  },
};

export const ai = {
  eyebrow: 'Intelligence',
  title: 'AI Assistant',
  description: 'Natural-language insights across inventory, installs, and demand.',
  history: 'History',
  quickActions: {
    lowStock: { title: 'Low stock', description: 'Surface items below reorder threshold' },
    predict: { title: 'Demand forecast', description: 'Project future usage from history' },
    available: { title: 'Availability', description: 'Check on-hand stock by glass type' },
    installed: { title: 'Installations', description: 'Glass deployed by client or site' },
    run: 'Run analysis',
  },
  form: {
    title: 'Custom question',
    action: 'Analysis type',
    actionPlaceholder: 'Choose an analysis',
    glassType: 'Glass type',
    glassTypePlaceholder: 'Select glass type',
    site: 'Client or site',
    sitePlaceholder: 'Enter client or site name',
    submit: 'Ask assistant',
    loading: 'Analyzing…',
  },
  actions: {
    LOW_STOCK: 'Low stock alerts',
    AVAILABLE: 'Stock availability',
    INSTALLED: 'Installations by client',
    PREDICT: 'Demand forecast',
  },
  response: {
    title: 'Insight',
    copy: 'Copy',
    copied: 'Copied',
    generated: (time) => `Generated at ${time}`,
  },
  historyPanel: {
    title: 'Recent questions',
    empty: 'No questions yet',
    clear: 'Clear history',
  },
  errors: {
    selectAction: 'Choose an analysis type or use a quick action.',
    selectGlass: 'Select a glass type to continue.',
    selectSite: 'Enter a client or site name.',
    fetchFailed: 'We could not complete that request. Please try again.',
  },
};

export const audit = {
  eyebrow: 'Operations',
  title: 'Activity log',
  description: 'A complete record of stock changes by your team.',
  empty: 'No activity recorded yet',
  unauthorized: 'You do not have permission to view this log.',
  loadFailed: 'Unable to load activity. Please try again.',
  columns: {
    user: 'Team member',
    role: 'Role',
    action: 'Action',
    glass: 'Glass type',
    size: 'Dimensions',
    qty: 'Quantity',
    stand: 'Location',
    time: 'Time',
  },
};

export const confirmStockLabels = {
  glassType: 'Glass type',
  thickness: 'Thickness',
  height: 'Height',
  width: 'Width',
  stand: 'Rack',
  quantity: 'Quantity',
  action: 'Change type',
};
