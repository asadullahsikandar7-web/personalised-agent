export const REQUEST_ID_HEADER = 'x-request-id';
export const REFRESH_COOKIE_NAME = 'pa_refresh_token';

/** Tool names that are considered sensitive and must always require approval,
 * regardless of what a tool author sets, as a defense-in-depth guard. */
export const HARD_APPROVAL_REQUIRED_TOOLS = new Set<string>([
  'send_message',
  'delete_all_data',
]);
