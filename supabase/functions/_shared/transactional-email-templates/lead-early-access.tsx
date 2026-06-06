import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ANIMUS'

interface LeadEarlyAccessProps {
  name?: string
  inviteUrl?: string
}

const LeadEarlyAccessEmail = ({ name, inviteUrl }: LeadEarlyAccessProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're invited to the ANIMUS Founders' Circle - early access opens now</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Hr style={divider} />

        <Heading style={h1}>
          {name ? `${name}, you're in.` : `You're in.`}
        </Heading>

        <Text style={text}>
          As a member of our Founders' Circle, you have first access to the ANIMUS
          memorial pendant - handcrafted to preserve the soundwave of someone you love.
        </Text>

        <Text style={text}>
          We're opening early-access ordering now, before the public launch.
          Founders enjoy priority production and our launch pricing.
        </Text>

        <Section style={{ textAlign: 'center' as const, marginTop: '32px', marginBottom: '32px' }}>
          <Button style={button} href={inviteUrl || 'https://animuswave.com/'}>
            Claim Early Access
          </Button>
        </Section>

        <Text style={subtle}>
          This invitation is reserved for you. Limited founder allocations available.
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
  component: LeadEarlyAccessEmail,
  subject: (data: Record<string, any>) =>
    data?.name
      ? `${data.name}, your ANIMUS Founders' Circle invitation is ready`
      : `Your ANIMUS Founders' Circle invitation is ready`,
  displayName: 'Lead - Early access invitation',
  previewData: { name: 'Sarah', inviteUrl: 'https://animuswave.com/' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '520px', margin: '0 auto' }
const brand = { fontSize: '18px', fontWeight: 'bold' as const, letterSpacing: '6px', textAlign: 'center' as const, color: '#B78E48', margin: '0 0 20px' }
const divider = { borderColor: '#e5e5e5', margin: '20px 0' }
const h1 = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif", textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#555555', lineHeight: '1.7', margin: '0 0 18px' }
const subtle = { fontSize: '12px', color: '#999999', lineHeight: '1.6', margin: '0', textAlign: 'center' as const, fontStyle: 'italic' as const }
const button = { backgroundColor: '#B78E48', color: '#ffffff', padding: '16px 36px', borderRadius: '4px', fontSize: '12px', letterSpacing: '3px', fontWeight: 'bold' as const, textDecoration: 'none' }
const footer = { fontSize: '11px', color: '#aaaaaa', textAlign: 'center' as const, margin: '0' }
