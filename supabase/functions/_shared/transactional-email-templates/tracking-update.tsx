import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ANIMUS'

interface TrackingUpdateProps {
  name?: string
  petName?: string
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
}

const TrackingUpdateEmail = ({ name, petName, trackingNumber, trackingUrl, carrier }: TrackingUpdateProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your ANIMUS pendant has shipped</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Hr style={divider} />

        <Heading style={h1}>
          {name ? `${name}, it's on the way.` : `It's on the way.`}
        </Heading>

        <Text style={text}>
          {petName
            ? `Your ANIMUS pendant for ${petName} has been carefully crafted and is now in transit.`
            : `Your ANIMUS pendant has been carefully crafted and is now in transit.`}
        </Text>

        <Section style={trackingCard}>
          <Text style={trackingLabel}>TRACKING NUMBER</Text>
          <Text style={trackingNumberStyle}>{trackingNumber || '—'}</Text>
          {carrier && <Text style={carrierStyle}>{carrier}</Text>}
        </Section>

        {trackingUrl && (
          <Section style={{ textAlign: 'center' as const, marginTop: '24px', marginBottom: '24px' }}>
            <Button style={button} href={trackingUrl}>
              Track Your Shipment
            </Button>
          </Section>
        )}

        <Text style={text}>
          When it arrives, scan the QR code on the back of the pendant to revisit
          the soundwave and memory you preserved.
        </Text>

        <Hr style={divider} />
        <Text style={footer}>
          © {new Date().getFullYear()} {SITE_NAME} — Crafted with love
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrackingUpdateEmail,
  subject: (data: Record<string, any>) =>
    data?.petName
      ? `Your ANIMUS pendant for ${data.petName} has shipped`
      : `Your ANIMUS pendant has shipped`,
  displayName: 'Customer — Shipping tracking update',
  previewData: {
    name: 'Sarah',
    petName: 'Luna',
    trackingNumber: '1Z999AA10123456784',
    trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
    carrier: 'UPS',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '520px', margin: '0 auto' }
const brand = { fontSize: '18px', fontWeight: 'bold' as const, letterSpacing: '6px', textAlign: 'center' as const, color: '#B78E48', margin: '0 0 20px' }
const divider = { borderColor: '#e5e5e5', margin: '20px 0' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '0 0 18px', fontFamily: "'Playfair Display', Georgia, serif", textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 18px' }
const trackingCard = { backgroundColor: '#fafafa', borderRadius: '8px', padding: '24px', margin: '24px 0', textAlign: 'center' as const, border: '1px solid #f0e6d2' }
const trackingLabel = { fontSize: '10px', letterSpacing: '3px', color: '#B78E48', fontWeight: 'bold' as const, margin: '0 0 8px' }
const trackingNumberStyle = { fontSize: '18px', color: '#0d0d0d', fontWeight: 'bold' as const, margin: '0', fontFamily: 'monospace', letterSpacing: '1px' }
const carrierStyle = { fontSize: '12px', color: '#888888', margin: '6px 0 0', textTransform: 'uppercase' as const, letterSpacing: '2px' }
const button = { backgroundColor: '#B78E48', color: '#ffffff', padding: '14px 32px', borderRadius: '4px', fontSize: '12px', letterSpacing: '2px', fontWeight: 'bold' as const, textDecoration: 'none' }
const footer = { fontSize: '11px', color: '#aaaaaa', textAlign: 'center' as const, margin: '0' }
