/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://gcqmkltyifgtuizencka.supabase.co/storage/v1/object/public/soul_assets/email-assets%2Flogo.png'
const SITE_URL = 'https://animuswave.com'

const WaitlistWelcomeEmail = () => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're on the list! Welcome to the ANIMUS Founders' Circle 🕊️</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="ANIMUS" width="120" height="auto" style={logo} />
        <Heading style={h1}>You're on the list! 🕊️</Heading>
        <Text style={text}>Hello,</Text>
        <Text style={text}>Welcome to the inner circle.</Text>
        <Text style={text}>
          We've received your registration for the{' '}
          <Link href={SITE_URL} style={link}><strong>ANIMUS Founders' Edition</strong></Link>{' '}
          waitlist. You are now officially one of the first people to secure priority access to the world's first scannable soundwave jewelry.
        </Text>
        <Heading style={h2}>What happens next?</Heading>
        <Text style={text}>
          As a member of the Founders' list, you've locked in your <strong style={{ color: '#b8975a' }}>40% launch discount</strong>. Once we go live, you will receive an exclusive link to design your Soulwave Pendant before the general public.
        </Text>
        <Heading style={h2}>Why it matters</Heading>
        <Text style={text}>
          At ANIMUS, we believe memories shouldn't just be stored - they should be <em>heard</em>.
        </Text>
        <Text style={text}>
          Keep an eye on your inbox. Your legacy is about to become wearable.
        </Text>
        <Text style={signoff}>Stay tuned,</Text>
        <Text style={signature}>
          <strong>Michael</strong><br />
          Founder, ANIMUS
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WaitlistWelcomeEmail,
  subject: "You're on the list! Welcome to the ANIMUS Founders' Circle 🕊️",
  displayName: 'Welcome to waitlist',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = { margin: '0 0 30px' }
const h1 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0d0f12',
  margin: '0 0 20px',
}
const h2 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#0d0f12',
  margin: '30px 0 10px',
}
const text = {
  fontSize: '14px',
  color: '#7a7d85',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const link = { color: '#b8975a', textDecoration: 'underline' }
const signoff = { fontSize: '14px', color: '#7a7d85', margin: '30px 0 4px' }
const signature = { fontSize: '14px', color: '#0d0f12', lineHeight: '1.6', margin: '0' }
