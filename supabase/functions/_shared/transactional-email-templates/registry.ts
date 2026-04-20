/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as waitlistWelcome } from './waitlist-welcome.tsx'
import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as shippingNotification } from './shipping-notification.tsx'
import { template as leadEarlyAccess } from './lead-early-access.tsx'
import { template as trackingUpdate } from './tracking-update.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'waitlist-welcome': waitlistWelcome,
  'order-confirmation': orderConfirmation,
  'shipping-notification': shippingNotification,
  'lead-early-access': leadEarlyAccess,
  'tracking-update': trackingUpdate,
}
