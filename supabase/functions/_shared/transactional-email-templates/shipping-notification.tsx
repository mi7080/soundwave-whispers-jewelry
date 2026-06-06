import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "ANIMUS"

interface ShippingNotificationProps {
  name?: string
  orderId?: string
  petName?: string
  trackingUrl?: string
}

const ShippingNotificationEmail = ({ name, orderId, petName, trackingUrl }: ShippingNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your ANIMUS pendant has shipped! 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Hr style={divider} />

        <Heading style={h1}>
          {name ? `${name}, your pendant has shipped!` : 'Your pendant has shipped!'}
        </Heading>

        <Text style={text}>
          Great news - your ANIMUS Memorial Pendant has been crafted and is now on its way to you.
        </Text>

        <Section style={orderCard}>
          <Text style={orderLabel}>SHIPMENT DETAILS</Text>
          {orderId && (
            <Text style={orderRow}>
              <span style={orderKey}>Order</span>
              <span style={orderValue}>#{orderId.slice(0, 8).toUpperCase()}</span>
            </Text>
          )}
          {petName && (
            <Text style={orderRow}>
              <span style={orderKey}>Engraving</span>
              <span style={orderValue}>{petName}</span>
            </Text>
          )}
          <Text style={orderRow}>
            <span style={orderKey}>Status</span>
            <span style={{ ...orderValue, color: '#3b82f6' }}>📦 Shipped</span>
          </Text>
        </Section>

        {trackingUrl && (
          <Section style={{ textAlign: 'center' as const, marginTop: '24px' }}>
            <Button style={button} href={trackingUrl}>
              Track Your Package
            </Button>
          </Section>
        )}

        <Text style={text}>
          Delivery typically takes 5-10 business days. We hope this pendant brings you comfort and a lasting connection to your loved one.
        </Text>

        <Hr style={divider} />
        <Text style={footer}>
          © {new Date().getFullYear()} {SITE_NAME} - Crafted with love
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ShippingNotificationEmail,
  subject: (data: Record<string, any>) =>
    data?.name ? `${data.name}, your ANIMUS pendant has shipped!` : 'Your ANIMUS pendant has shipped!',
  displayName: 'Shipping notification',
  previewData: { name: 'Sarah', orderId: 'abc12345-def6', petName: 'Luna', trackingUrl: 'https://track.example.com/123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '520px', margin: '0 auto' }
const brand = { fontSize: '18px', fontWeight: 'bold' as const, letterSpacing: '6px', textAlign: 'center' as const, color: '#B78E48', margin: '0 0 20px' }
const divider = { borderColor: '#e5e5e5', margin: '20px 0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '0 0 16px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const orderCard = { backgroundColor: '#fafafa', borderRadius: '8px', padding: '20px 24px', margin: '24px 0' }
const orderLabel = { fontSize: '10px', letterSpacing: '3px', color: '#B78E48', fontWeight: 'bold' as const, margin: '0 0 16px', textAlign: 'center' as const }
const orderRow = { fontSize: '14px', color: '#333', margin: '0 0 10px', display: 'flex' as const, justifyContent: 'space-between' as const }
const orderKey = { color: '#888888' }
const orderValue = { color: '#0d0d0d', fontWeight: '500' as const }
const button = { backgroundColor: '#B78E48', color: '#ffffff', padding: '14px 32px', borderRadius: '4px', fontSize: '12px', letterSpacing: '2px', fontWeight: 'bold' as const, textDecoration: 'none' }
const footer = { fontSize: '11px', color: '#aaaaaa', textAlign: 'center' as const, margin: '0' }
