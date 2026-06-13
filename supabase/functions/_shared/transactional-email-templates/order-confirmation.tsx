import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "ANIMUS"

interface OrderConfirmationProps {
  name?: string
  orderId?: string
  amount?: string
  petName?: string
  soulPageUrl?: string
  couponCode?: string
  couponPercent?: number
}

const OrderConfirmationEmail = ({ name, orderId, amount, petName, soulPageUrl, couponCode, couponPercent = 15 }: OrderConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your ANIMUS order is confirmed. Your memorial pendant is being crafted.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Hr style={divider} />

        <Heading style={h1}>
          {name ? `Thank you, ${name}!` : 'Thank you for your order!'}
        </Heading>

        <Text style={text}>
          Your payment has been confirmed and your memorial pendant is now being crafted with care.
        </Text>

        <Section style={orderCard}>
          <Text style={orderLabel}>ORDER SUMMARY</Text>
          {orderId && (
            <Row style={orderRow}>
              <Column style={orderKey}>Order Number</Column>
              <Column style={orderValue}>#{orderId.slice(0, 8).toUpperCase()}</Column>
            </Row>
          )}
          {petName && (
            <Row style={orderRow}>
              <Column style={orderKey}>Engraving</Column>
              <Column style={orderValue}>{petName}</Column>
            </Row>
          )}
          {amount && (
            <Row style={orderRow}>
              <Column style={orderKey}>Total</Column>
              <Column style={{ ...orderValue, color: '#B78E48', fontWeight: 'bold' as const }}>${parseFloat(amount).toFixed(2)}</Column>
            </Row>
          )}
          <Row style={orderRow}>
            <Column style={orderKey}>Status</Column>
            <Column style={{ ...orderValue, color: '#22c55e' }}>✓ Payment Confirmed</Column>
          </Row>
        </Section>

        {orderId && (
          <Text style={orderRef}>Order reference: {orderId}</Text>
        )}

        <Text style={text}>
          We'll send you another email with tracking information once your pendant ships. In the meantime, your unique soundwave design is being prepared for production.
        </Text>

        {soulPageUrl && (
          <Section style={soulCard}>
            <Text style={soulLabel}>YOUR SOUL PAGE IS LIVE</Text>
            <Text style={soulText}>
              The same memorial your pendant's QR code links to is ready now. View it, and share it with anyone you'd like.
            </Text>
            <Section style={{ textAlign: 'center' as const, marginTop: '16px' }}>
              <Button style={soulButton} href={soulPageUrl}>
                View the Soul Page
              </Button>
            </Section>
          </Section>
        )}

        {couponCode && (
          <Section style={couponCard}>
            <Text style={couponLabel}>A GIFT FOR YOU</Text>
            <Text style={couponHeadline}>{couponPercent}% off your next order</Text>
            <Text style={couponCodeStyle}>{couponCode}</Text>
            <Text style={couponHint}>Use this code at checkout on your next purchase.</Text>
          </Section>
        )}

        <Section style={{ textAlign: 'center' as const, marginTop: '30px' }}>
          <Button style={button} href="https://animuswaves.com">
            Visit ANIMUS
          </Button>
        </Section>

        <Hr style={divider} />
        <Text style={footer}>
          © {new Date().getFullYear()} {SITE_NAME}. Crafted with love.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.name ? `${data.name}, your ANIMUS order is confirmed!` : 'Your ANIMUS order is confirmed!',
  displayName: 'Order confirmation',
  previewData: { name: 'Sarah', orderId: 'abc12345-def6-7890-abcd-ef1234567890', amount: '89.99', petName: 'Luna', soulPageUrl: 'https://animuswaves.com/soul/abc12345-def6-7890-abcd-ef1234567890', couponCode: 'd12ce1', couponPercent: 15 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '520px', margin: '0 auto' }
const brand = { fontSize: '18px', fontWeight: 'bold' as const, letterSpacing: '6px', textAlign: 'center' as const, color: '#B78E48', margin: '0 0 20px' }
const divider = { borderColor: '#e5e5e5', margin: '20px 0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '0 0 16px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const orderCard = { backgroundColor: '#fafafa', borderRadius: '8px', padding: '20px 24px', margin: '24px 0' }
const orderLabel = { fontSize: '10px', letterSpacing: '3px', color: '#B78E48', fontWeight: 'bold' as const, margin: '0 0 16px', textAlign: 'center' as const }
const orderRow = { width: '100%' }
const orderKey = { fontSize: '14px', color: '#888888', textAlign: 'left' as const, padding: '0 0 10px', verticalAlign: 'top' as const }
const orderValue = { fontSize: '14px', color: '#0d0d0d', fontWeight: '500' as const, textAlign: 'right' as const, padding: '0 0 10px', verticalAlign: 'top' as const }
const button = { backgroundColor: '#B78E48', color: '#ffffff', padding: '14px 32px', borderRadius: '4px', fontSize: '12px', letterSpacing: '2px', fontWeight: 'bold' as const, textDecoration: 'none' }
const orderRef = { fontSize: '11px', color: '#aaaaaa', margin: '0 0 20px', textAlign: 'center' as const }
const soulCard = { backgroundColor: '#0d0d0d', borderRadius: '8px', padding: '24px', margin: '24px 0', textAlign: 'center' as const }
const soulLabel = { fontSize: '10px', letterSpacing: '3px', color: '#B78E48', fontWeight: 'bold' as const, margin: '0 0 10px' }
const soulText = { fontSize: '13px', color: '#cccccc', lineHeight: '1.6', margin: '0' }
const soulButton = { backgroundColor: '#ffffff', color: '#0d0d0d', padding: '14px 32px', borderRadius: '4px', fontSize: '12px', letterSpacing: '2px', fontWeight: 'bold' as const, textDecoration: 'none' }
const couponCard = { border: '1px dashed #B78E48', borderRadius: '8px', padding: '20px 24px', margin: '24px 0', textAlign: 'center' as const, backgroundColor: '#fdfaf4' }
const couponLabel = { fontSize: '10px', letterSpacing: '3px', color: '#B78E48', fontWeight: 'bold' as const, margin: '0 0 8px' }
const couponHeadline = { fontSize: '18px', color: '#0d0d0d', fontWeight: 'bold' as const, margin: '0 0 12px', fontFamily: "'Playfair Display', Georgia, serif" }
const couponCodeStyle = { fontSize: '22px', letterSpacing: '4px', color: '#0d0d0d', fontWeight: 'bold' as const, margin: '0 0 8px', fontFamily: "monospace" }
const couponHint = { fontSize: '12px', color: '#888888', margin: '0' }
const footer = { fontSize: '11px', color: '#aaaaaa', textAlign: 'center' as const, margin: '0' }
